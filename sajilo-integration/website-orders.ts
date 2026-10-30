import { calculateBill } from "./domain.ts";

export class WebsiteOrderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  available: boolean;
  rank: number;
};
type MenuState = {
  settings: { name: string; open: boolean; taxRate: number };
  menu: MenuItem[];
};
function required(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new WebsiteOrderError(
      400,
      `${name} is required (maximum ${max} characters).`,
    );
  return value.trim();
}
export function publicMenu(state: MenuState) {
  return {
    restaurant: state.settings.name,
    open: state.settings.open,
    taxRate: state.settings.taxRate,
    items: state.menu
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map(({ id, name, category, price, available }) => ({
        id,
        name,
        category,
        price,
        available,
      })),
  };
}
export function prepareWebsiteOrder(
  payload: Record<string, any>,
  state: MenuState,
) {
  if (!state.settings.open)
    throw new WebsiteOrderError(
      409,
      "The café is closed for online orders. Please call us.",
    );
  const requestId = required(payload.requestId, "Request ID", 32);
  if (!/^[a-f0-9]{32}$/.test(requestId))
    throw new WebsiteOrderError(400, "Invalid request ID.");
  const name = required(payload.name, "Name", 80),
    phone = required(payload.phone, "Phone", 20);
  if (!/^[+0-9 ()-]{7,20}$/.test(phone))
    throw new WebsiteOrderError(400, "Enter a valid phone number.");
  if (!["pickup", "delivery"].includes(payload.mode))
    throw new WebsiteOrderError(400, "Choose pickup or delivery.");
  const address =
    payload.mode === "delivery"
      ? required(payload.address, "Delivery address", 250)
      : "";
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  if (notes.length > 500)
    throw new WebsiteOrderError(400, "Notes must be 500 characters or fewer.");
  if (
    !Array.isArray(payload.items) ||
    !payload.items.length ||
    payload.items.length > 30
  )
    throw new WebsiteOrderError(
      400,
      "Choose between 1 and 30 different items.",
    );
  const seen = new Set<string>();
  const lines = payload.items.map((line: any) => {
    if (
      !line ||
      typeof line.id !== "string" ||
      seen.has(line.id) ||
      !Number.isInteger(line.qty) ||
      line.qty < 1 ||
      line.qty > 20
    )
      throw new WebsiteOrderError(
        400,
        "Invalid item or quantity (maximum 20 each).",
      );
    seen.add(line.id);
    const item = state.menu.find((i) => i.id === line.id && i.available);
    if (!item)
      throw new WebsiteOrderError(
        409,
        "An item is no longer available. Refresh the menu and review your bag.",
      );
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      cost: item.cost,
      qty: line.qty,
    };
  });
  const bill = calculateBill(lines, state.settings.taxRate);
  if (
    typeof payload.expectedTotal !== "number" ||
    Math.abs(payload.expectedTotal - bill.total) > 0.001
  )
    throw new WebsiteOrderError(
      409,
      "Prices changed. Refresh the menu and review your total before sending.",
    );
  return {
    requestId,
    name,
    phone,
    mode: payload.mode,
    address,
    notes,
    items: lines.map(({ cost, ...line }) => line),
    subtotal: bill.subtotal,
    tax: bill.tax,
    taxRate: state.settings.taxRate,
    total: bill.total,
  };
}
