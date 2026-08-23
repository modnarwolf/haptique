export class PrintifyFulfillmentError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = "PrintifyFulfillmentError";
    this.status = status;
  }
}

function required(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new PrintifyFulfillmentError(`${label} is missing from the paid order`);
  return normalized;
}

function splitName(value) {
  const parts = required(value, "Shipping name").split(/\s+/);
  return {
    firstName: parts.shift(),
    lastName: parts.join(" ") || "Customer",
  };
}

export async function createPrintifyMockOrderForPaidCheckout({
  order,
  printify,
  catalog,
  fulfillmentMode,
  approvalConfirmed,
}) {
  if (fulfillmentMode !== "mock_draft") {
    throw new PrintifyFulfillmentError("Printify mock fulfillment is disabled", 503);
  }
  if (approvalConfirmed !== true) {
    throw new PrintifyFulfillmentError(
      "Printify order creation is locked until shop order approval is confirmed Manual",
    );
  }
  if (order?.status !== "paid" || order?.paymentStatus !== "paid") {
    throw new PrintifyFulfillmentError("Only a verified paid Stripe order can reach Printify");
  }
  if (order.printifyOrderId) {
    return { id: order.printifyOrderId, status: order.printifyStatus, reused: true };
  }

  const recentOrders = await printify.listOrders({ page: 1, limit: 10 });
  const existingOrder = recentOrders.data?.find(
    (candidate) => candidate.external_id === order.checkoutId,
  );
  if (existingOrder?.id) return { ...existingOrder, reused: true };

  const shipping = order.shippingDetails;
  const address = shipping?.address;
  const customer = order.customerDetails;
  const { firstName, lastName } = splitName(shipping?.name ?? customer?.name);
  const lineItems = order.items.map((item, index) => {
    const product = catalog.products[item.productId];
    const variantId = product?.variants?.[item.size];
    if (!product?.productId || !variantId || variantId !== item.printifyVariantId) {
      throw new PrintifyFulfillmentError(
        `Printify catalog is out of date for ${item.productId} ${item.size}`,
        503,
      );
    }
    return {
      product_id: product.productId,
      variant_id: variantId,
      quantity: item.quantity,
      external_id: `${order.checkoutId}-${index + 1}`,
    };
  });

  return printify.createOrder(
    {
      external_id: order.checkoutId,
      label: `Haptique test ${order.checkoutId.slice(0, 8).toUpperCase()}`,
      line_items: lineItems,
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: false,
      address_to: {
        first_name: firstName,
        last_name: lastName,
        email: required(customer?.email, "Customer email"),
        phone: String(customer?.phone ?? ""),
        country: required(address?.country, "Shipping country"),
        region: required(address?.state, "Shipping region"),
        address1: required(address?.line1, "Shipping address"),
        address2: String(address?.line2 ?? ""),
        city: required(address?.city, "Shipping city"),
        zip: required(address?.postal_code, "Shipping postal code"),
      },
    },
    { approvalConfirmed: true },
  );
}
