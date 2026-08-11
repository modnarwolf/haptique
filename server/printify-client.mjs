const DEFAULT_BASE_URL = "https://api.printify.com/v1";

export class PrintifyApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = "PrintifyApiError";
    this.status = status;
    this.details = details;
  }
}

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new TypeError(`${name} is required`);
  }
  return normalized;
}

export function createPrintifyClient({
  token,
  shopId,
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  const apiToken = required(token, "Printify API token");
  const configuredShopId = required(shopId, "Printify shop ID");

  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required");
  }

  async function request(path, { method = "GET", body, signal } = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "Haptique/0.1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        payload && typeof payload === "object"
          ? payload.message ?? payload.error ?? response.statusText
          : payload || response.statusText;
      throw new PrintifyApiError(`Printify request failed: ${message}`, {
        status: response.status,
        details: payload,
      });
    }

    return payload;
  }

  return Object.freeze({
    shopId: configuredShopId,

    listShops({ signal } = {}) {
      return request("/shops.json", { signal });
    },

    listProducts({ page = 1, limit = 10, signal } = {}) {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      return request(`/shops/${encodeURIComponent(configuredShopId)}/products.json?${query}`, {
        signal,
      });
    },

    listBlueprints({ signal } = {}) {
      return request("/catalog/blueprints.json", { signal });
    },

    listPrintProviders(blueprintId, { signal } = {}) {
      const id = encodeURIComponent(required(blueprintId, "Printify blueprint ID"));
      return request(`/catalog/blueprints/${id}/print_providers.json`, { signal });
    },

    listVariants(blueprintId, printProviderId, { signal } = {}) {
      const blueprint = encodeURIComponent(required(blueprintId, "Printify blueprint ID"));
      const provider = encodeURIComponent(required(printProviderId, "Printify provider ID"));
      return request(
        `/catalog/blueprints/${blueprint}/print_providers/${provider}/variants.json`,
        { signal },
      );
    },

    async verifyConnection({ signal } = {}) {
      const shops = await this.listShops({ signal });
      const shop = shops.find((candidate) => String(candidate.id) === configuredShopId);

      if (!shop) {
        throw new PrintifyApiError(
          `Configured Printify shop ${configuredShopId} is not available to this token`,
          { status: 403 },
        );
      }

      const products = await this.listProducts({ page: 1, limit: 1, signal });
      return {
        shop,
        productCount: Number(products.total ?? products.data?.length ?? 0),
      };
    },
  });
}
