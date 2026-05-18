/** Stable React key for invoice / challan line rows (avoids duplicate keys when adding rows quickly). */
export function createLineItemKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
