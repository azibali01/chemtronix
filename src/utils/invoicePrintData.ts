import api from "../api_configuration/api";
import { mapRawToInvoice, type Invoice } from "./invoice";

type AccountNode = {
  accountName?: string;
  accountCode?: string;
  selectedCode?: string;
  address?: string;
  ntn?: string;
  strn?: string;
  children?: AccountNode[];
};

function findReceivableAccount(
  invoice: Invoice,
  accounts: AccountNode[],
): AccountNode | undefined {
  const title = (invoice.accountTitle || "").trim();
  const code = (invoice.accountNumber || "").trim();
  let found: AccountNode | undefined;

  const walk = (nodes: AccountNode[]) => {
    for (const n of nodes) {
      const name = (n.accountName || "").trim();
      const ac = String(n.accountCode ?? n.selectedCode ?? "").trim();
      if ((code && ac === code) || (title && name === title)) {
        found = n;
        return;
      }
      if (n.children?.length) walk(n.children);
    }
  };
  walk(accounts);
  return found;
}

/** Fill missing customer fields from chart of accounts before print. */
export function enrichInvoiceForPrint(
  invoice: Invoice,
  accounts: AccountNode[] = [],
): Invoice {
  const found = findReceivableAccount(invoice, accounts);
  const items =
    invoice.items && invoice.items.length > 0 ? invoice.items : [];

  return {
    ...invoice,
    accountNumber:
      invoice.accountNumber ||
      String(found?.accountCode ?? found?.selectedCode ?? "").trim() ||
      undefined,
    ntnNumber: (invoice.ntnNumber || found?.ntn || "").trim() || undefined,
    strnNumber: (invoice.strnNumber || found?.strn || "").trim() || undefined,
    province: invoice.province || "Punjab",
    items,
    amount:
      invoice.amount ??
      items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0),
    netAmount:
      invoice.netAmount ??
      invoice.amount ??
      items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0),
  };
}

const MONGO_ID = /^[a-f\d]{24}$/i;

export function isPersistedInvoiceId(id: string | undefined): boolean {
  return Boolean(id && MONGO_ID.test(id));
}

/** Load one sale invoice from API (full products + fields). */
export async function fetchSaleInvoiceForPrint(id: string): Promise<Invoice> {
  const response = await api.get(`/sale-invoice/${id}`);
  return mapRawToInvoice(response.data as Record<string, unknown>);
}
