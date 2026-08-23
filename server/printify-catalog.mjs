import { readFile } from "node:fs/promises";

export class PrintifyCatalogError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "PrintifyCatalogError";
    this.status = status;
  }
}

export async function loadPrintifyCatalog(path, expectedShopId) {
  let catalog;
  try {
    catalog = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new PrintifyCatalogError(
        "Printify products are not configured; run the Printify product setup first",
        503,
      );
    }
    throw new PrintifyCatalogError(`Printify product catalog could not be read: ${error.message}`);
  }

  if (String(catalog?.shopId) !== String(expectedShopId) || !catalog?.products) {
    throw new PrintifyCatalogError("Printify product catalog does not match this shop", 503);
  }
  return catalog;
}
