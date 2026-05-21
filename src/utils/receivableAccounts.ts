// Update the import path below if the file is located elsewhere, e.g. "../context/ChartOfAccountsContext" or "../Context/ChartOfAccountsContext.ts"

import type { AccountNode } from "../Dashboard/Context/ChartOfAccountsContext";

// Utility to get all receivable accounts (1410 and children)
export function getReceivableAccounts(accounts: AccountNode[]): AccountNode[] {
  const result: AccountNode[] = [];
  function walk(nodes: AccountNode[]) {
    for (const acc of nodes) {
      // Match any accountCode or selectedCode that starts with '1410'
      if (
        (typeof acc.accountCode === "string" &&
          acc.accountCode.startsWith("1410")) ||
        (typeof acc.selectedCode === "string" &&
          acc.selectedCode.startsWith("1410"))
      ) {
        result.push(acc);
        if (acc.children) walk(acc.children);
      } else if (
        acc.parentAccount &&
        acc.parentAccount.toString().includes("1410")
      ) {
        result.push(acc);
        if (acc.children) walk(acc.children);
      } else if (acc.children) {
        walk(acc.children);
      }
    }
  }
  walk(accounts);
  return result;
}
