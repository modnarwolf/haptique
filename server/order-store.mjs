import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class OrderStoreError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "OrderStoreError";
    this.status = status;
  }
}

export function createJsonOrderStore(path) {
  let queue = Promise.resolve();

  async function readOrders() {
    try {
      const payload = JSON.parse(await readFile(path, "utf8"));
      return payload && typeof payload === "object" ? payload : {};
    } catch (error) {
      if (error.code === "ENOENT") return {};
      throw new OrderStoreError(`Order store could not be read: ${error.message}`);
    }
  }

  async function writeOrders(orders) {
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(orders, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, path);
  }

  function mutate(operation) {
    const result = queue.then(async () => {
      const orders = await readOrders();
      const value = await operation(orders);
      await writeOrders(orders);
      return value;
    });
    queue = result.catch(() => {});
    return result;
  }

  return Object.freeze({
    async createPending({ checkoutId, items, amountTotal, currency = "usd" }) {
      return mutate((orders) => {
        const existing = orders[checkoutId];
        if (existing) {
          const matches =
            existing.amountTotal === amountTotal &&
            existing.currency === currency &&
            JSON.stringify(existing.items) === JSON.stringify(items);
          if (!matches) {
            throw new OrderStoreError("Checkout ID was already used for a different cart", 409);
          }
          return existing;
        }
        const now = new Date().toISOString();
        const order = {
          checkoutId,
          status: "pending",
          paymentStatus: "unpaid",
          amountTotal,
          currency,
          items,
          processedStripeEvents: [],
          createdAt: now,
          updatedAt: now,
        };
        orders[checkoutId] = order;
        return order;
      });
    },

    async attachStripeSession(checkoutId, stripeSessionId) {
      return mutate((orders) => {
        const order = orders[checkoutId];
        if (!order) throw new OrderStoreError("Checkout record was not found", 404);
        if (order.stripeSessionId && order.stripeSessionId !== stripeSessionId) {
          throw new OrderStoreError("Checkout is already linked to another Stripe session", 409);
        }
        order.stripeSessionId = stripeSessionId;
        order.updatedAt = new Date().toISOString();
        return order;
      });
    },

    async completeCheckout(details) {
      return mutate((orders) => {
        const order = orders[details.checkoutId];
        if (!order) throw new OrderStoreError("Checkout record was not found", 404);
        if (order.stripeSessionId && order.stripeSessionId !== details.stripeSessionId) {
          throw new OrderStoreError("Stripe session does not match the checkout record", 409);
        }
        if (order.processedStripeEvents.includes(details.eventId)) return order;

        order.stripeSessionId = details.stripeSessionId;
        order.paymentStatus = details.paymentStatus ?? "unknown";
        order.status = details.paymentStatus === "paid" ? "paid" : "checkout_completed";
        order.customerId = details.customerId ?? null;
        order.paymentIntentId = details.paymentIntentId ?? null;
        order.stripeAmountTotal = details.amountTotal ?? null;
        order.stripeCurrency = details.currency ?? null;
        order.customerDetails = details.customerDetails ?? order.customerDetails ?? null;
        order.shippingDetails = details.shippingDetails ?? order.shippingDetails ?? null;
        order.processedStripeEvents.push(details.eventId);
        order.updatedAt = new Date().toISOString();
        return order;
      });
    },

    async attachPrintifyOrder(checkoutId, printifyOrder) {
      return mutate((orders) => {
        const order = orders[checkoutId];
        if (!order) throw new OrderStoreError("Checkout record was not found", 404);
        if (order.printifyOrderId && order.printifyOrderId !== printifyOrder.id) {
          throw new OrderStoreError("Checkout is already linked to another Printify order", 409);
        }
        order.printifyOrderId = printifyOrder.id;
        order.printifyStatus = printifyOrder.status ?? "on-hold";
        order.updatedAt = new Date().toISOString();
        return order;
      });
    },

    async findByStripeSession(stripeSessionId) {
      const orders = await queue.then(readOrders);
      return Object.values(orders).find((order) => order.stripeSessionId === stripeSessionId) ?? null;
    },
  });
}
