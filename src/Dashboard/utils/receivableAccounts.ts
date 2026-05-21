import type { AccountNode } from "../Context/ChartOfAccountsContext";

// Utility to get all receivable accounts (1410 and children)
export function getReceivableAccounts(accounts: AccountNode[]): AccountNode[] {
  const result: AccountNode[] = [];
  function walk(nodes: AccountNode[]) {
    for (const acc of nodes) {
      if (acc.selectedAccountType2 === "1410") {
        result.push(acc);
      }
      if (acc.children) {
        walk(acc.children);
      }
    }
  }
  walk(accounts);
  return result;
}
