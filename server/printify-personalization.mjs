import { createHash, randomUUID } from "node:crypto";

export const TOTE_ARTWORK_WIDTH = 2625;
export const TOTE_ARTWORK_HEIGHT = 5250;
export const TOTE_BLUEPRINT_ID = 1389;
export const TOTE_PRINT_PROVIDER_ID = 10;
export const TOTE_VARIANT_ID = 103600;
export const TOTE_RETAIL_PRICE = 3800;

const PREVIEW_PRODUCT_KEY_VERSION = 1;
const pendingCustomProducts = new Map();

export class PrintifyPersonalizationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PrintifyPersonalizationError";
    this.status = status;
  }
}

export function readPngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    throw new PrintifyPersonalizationError("The product artwork must be a valid PNG image");
  }
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new PrintifyPersonalizationError("The product artwork must be a valid PNG image");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function requiredId(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new PrintifyPersonalizationError(`${label} is missing`, 400);
  return normalized;
}

export function createPreviewProductKey({
  designHash,
  productId,
  blueprintId,
  printProviderId,
  variantId,
}) {
  const recipe = requiredId(designHash, "Haptique design hash");
  const type = requiredId(productId, "Haptique product type");
  return createHash("sha256")
    .update(JSON.stringify({
      version: PREVIEW_PRODUCT_KEY_VERSION,
      designHash: recipe,
      productId: type,
      blueprintId: Number(blueprintId),
      printProviderId: Number(printProviderId),
      variantId: Number(variantId),
    }))
    .digest("hex");
}

export function createPreviewProductTitle(options) {
  const productId = requiredId(options?.productId, "Haptique product type")
    .replace(/[^a-z0-9_-]/gi, "-")
    .slice(0, 24);
  return `Haptique preview — ${productId}`;
}

function createLegacyPreviewProductTitle(options) {
  const productId = requiredId(options?.productId, "Haptique product type")
    .replace(/[^a-z0-9_-]/gi, "-")
    .slice(0, 24);
  return `Haptique preview v${PREVIEW_PRODUCT_KEY_VERSION} — ${productId} — ${createPreviewProductKey(options)}`;
}

export function createImagePersonalizationItem(fieldId, imageId) {
  return {
    field_id: requiredId(fieldId, "Printify personalization field"),
    type: "image",
    input: { image_id: requiredId(imageId, "Printify artwork upload") },
  };
}

export function productMockups(product, variantId) {
  return (product?.images ?? [])
    .filter((image) => image?.src && (image.variant_ids ?? []).includes(Number(variantId)))
    .map((image, index) => ({
      variant_id: Number(variantId),
      mockup_id: image.position && image.position !== "other"
        ? image.position
        : `View ${index + 1}`,
      src: image.src,
    }));
}

function supportsVariant(product, variantId) {
  return (product?.variants ?? []).some((variant) => (
    Number(variant.id) === Number(variantId) && variant.is_enabled !== false
  ));
}

async function listAllProducts(printify) {
  const products = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await printify.listProducts({ page, limit: 50 });
    products.push(...(response.data ?? []));
    if (!response.next_page_url && page >= Number(response.last_page ?? 1)) break;
  }
  return products;
}

function productUploadId(product, variantId) {
  for (const area of product?.print_areas ?? []) {
    const areaVariants = area?.variant_ids ?? [];
    if (areaVariants.length && !areaVariants.includes(Number(variantId))) continue;
    for (const placeholder of area?.placeholders ?? []) {
      const upload = (placeholder?.images ?? []).find((image) => image?.id);
      if (upload) return String(upload.id);
    }
  }
  return "";
}

async function findReusableCustomProduct({
  printify,
  title,
  legacyTitle,
  designHash,
  blueprintId,
  printProviderId,
  variantId,
}) {
  const products = await listAllProducts(printify);
  const candidates = products.filter((product) => (
    (
      (product?.title === title && String(product?.description ?? "").trim() === designHash)
      || product?.title === legacyTitle
    )
    && Number(product.blueprint_id) === Number(blueprintId)
    && Number(product.print_provider_id) === Number(printProviderId)
    && supportsVariant(product, variantId)
  ));

  for (const candidate of candidates) {
    const product = await printify.retrieveProduct(candidate.id);
    if (
      !(
        (product?.title === title && String(product?.description ?? "").trim() === designHash)
        || product?.title === legacyTitle
      )
      || Number(product.blueprint_id) !== Number(blueprintId)
      || Number(product.print_provider_id) !== Number(printProviderId)
      || !supportsVariant(product, variantId)
    ) continue;
    const uploadId = productUploadId(product, variantId);
    if (uploadId) return { product, uploadId };
  }
  return null;
}

async function reuseOrCreateCustomProduct({
  printify,
  title,
  legacyTitle,
  identityKey,
  description,
  artwork,
  fileName,
  blueprintId,
  printProviderId,
  variantId,
  retailPrice,
}) {
  const operationKey = `${printify.shopId ?? "shop"}:${identityKey}`;
  const pending = pendingCustomProducts.get(operationKey);
  if (pending) return pending;

  const operation = (async () => {
    const reusable = await findReusableCustomProduct({
      printify,
      title,
      legacyTitle,
      designHash: description,
      blueprintId,
      printProviderId,
      variantId,
    });
    if (reusable) return { ...reusable, reused: true };

    const upload = await printify.uploadImage({
      fileName,
      contents: artwork.toString("base64"),
    });
    const product = await printify.createProduct({
      title,
      description,
      blueprint_id: Number(blueprintId),
      print_provider_id: Number(printProviderId),
      variants: [{ id: Number(variantId), price: Number(retailPrice), is_enabled: true, is_default: true }],
      print_areas: [{
        variant_ids: [Number(variantId)],
        placeholders: [{
          position: "front",
          images: [{ id: upload.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
        }],
      }],
    });
    return { product, uploadId: upload.id, reused: false };
  })();

  pendingCustomProducts.set(operationKey, operation);
  try {
    return await operation;
  } finally {
    if (pendingCustomProducts.get(operationKey) === operation) {
      pendingCustomProducts.delete(operationKey);
    }
  }
}

export async function findPersonalizableProduct({
  printify,
  configuredProductId,
  blueprintId,
  printProviderId,
  variantId,
}) {
  const override = String(configuredProductId ?? "").trim();
  const products = override
    ? [await printify.retrieveProduct(override)]
    : (await listAllProducts(printify)).filter((product) => (
        Number(product.blueprint_id) === Number(blueprintId)
        && Number(product.print_provider_id) === Number(printProviderId)
      ));

  for (const product of products) {
    if (!product?.id || !supportsVariant(product, variantId)) continue;
    const options = await printify.retrievePersonalizationOptions(product.id);
    const imageField = options.find((option) => option?.type === "image" && option.field_id);
    if (imageField) return { product, imageField };
  }

  throw new PrintifyPersonalizationError(
    "No compatible Printify personalization template is available for this product",
    503,
  );
}

export async function startProductPreview({
  printify,
  configuredProductId,
  artwork,
  fileName = "haptique-product.png",
  blueprintId,
  printProviderId,
  variantId,
  retailPrice,
  expectedWidth,
  expectedHeight,
  productName = "product",
  productId,
  designHash,
  allowPersonalization = false,
  externalId = `haptique-${randomUUID()}`,
}) {
  const dimensions = readPngDimensions(artwork);
  if (dimensions.width !== Number(expectedWidth) || dimensions.height !== Number(expectedHeight)) {
    throw new PrintifyPersonalizationError(
      `${productName} artwork must be exactly ${expectedWidth} × ${expectedHeight} px`,
    );
  }

  let template = null;
  if (allowPersonalization) {
    try {
      template = await findPersonalizableProduct({
        printify,
        configuredProductId,
        blueprintId,
        printProviderId,
        variantId,
      });
    } catch (error) {
      if (!(error instanceof PrintifyPersonalizationError) || error.status !== 503) throw error;
    }
  }
  if (!template) {
    const identity = {
      designHash,
      productId,
      blueprintId,
      printProviderId,
      variantId,
    };
    const identityKey = createPreviewProductKey(identity);
    const title = createPreviewProductTitle(identity);
    const { product, uploadId, reused } = await reuseOrCreateCustomProduct({
      printify,
      title,
      legacyTitle: createLegacyPreviewProductTitle(identity),
      identityKey,
      description: requiredId(designHash, "Haptique design hash"),
      artwork,
      fileName,
      blueprintId,
      printProviderId,
      variantId,
      retailPrice,
    });
    const mockups = productMockups(product, variantId);
    return {
      taskId: randomUUID(),
      status: mockups.length ? "completed" : "pending",
      externalId,
      previewMode: "custom_product",
      productId: product.id,
      variantId,
      uploadId,
      reused,
      mockups,
      preview_count: mockups.length,
    };
  }

  const upload = await printify.uploadImage({
    fileName,
    contents: artwork.toString("base64"),
  });
  const item = createImagePersonalizationItem(template.imageField.field_id, upload.id);
  const preview = await printify.requestPersonalizationPreview(template.product.id, {
    external_id: externalId,
    variant_ids: [variantId],
    personalization: [item],
  });

  return {
    taskId: preview.task_id,
    status: preview.status,
    externalId: preview.external_id ?? externalId,
    previewMode: "personalization",
    productId: template.product.id,
    variantId,
    uploadId: upload.id,
    fieldId: template.imageField.field_id,
  };
}

export function startTotePersonalizationPreview({
  printify,
  configuredProductId,
  artwork,
  fileName = "haptique-tote.png",
  variantId = TOTE_VARIANT_ID,
  designHash,
  externalId,
}) {
  return startProductPreview({
    printify,
    configuredProductId,
    artwork,
    fileName,
    blueprintId: TOTE_BLUEPRINT_ID,
    printProviderId: TOTE_PRINT_PROVIDER_ID,
    variantId,
    retailPrice: TOTE_RETAIL_PRICE,
    expectedWidth: TOTE_ARTWORK_WIDTH,
    expectedHeight: TOTE_ARTWORK_HEIGHT,
    productName: "Everyday tote",
    productId: "tote",
    designHash,
    allowPersonalization: true,
    externalId,
  });
}

export async function finalizePersonalization({ printify, productId, variantId, fieldId, uploadId }) {
  const item = createImagePersonalizationItem(fieldId, uploadId);
  const personalization = await printify.createPersonalization(requiredId(productId, "Printify product"), {
    variant_id: Number(variantId),
    items: [item],
  });
  return {
    personalisationStrategy: personalization.personalisation_strategy,
    personalisationInstructions: personalization.personalisation_instructions,
  };
}
