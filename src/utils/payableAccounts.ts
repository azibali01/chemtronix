import type { AccountNode } from "../Dashboard/Context/ChartOfAccountsContext";

// Utility to get all payable accounts (2210 - Purchase Party and children)
export function getPayableAccounts(accounts: AccountNode[]): AccountNode[] {
  const result: AccountNode[] = [];
  function walk(nodes: AccountNode[]) {
    for (const acc of nodes) {
      // Match any accountCode or selectedCode that starts with '2210'
      if (
        (typeof acc.accountCode === "string" &&
          acc.accountCode.startsWith("2210")) ||
        (typeof acc.selectedCode === "string" &&
          acc.selectedCode.startsWith("2210"))
      ) {
        result.push(acc);
        if (acc.children) walk(acc.children);
      } else if (
        acc.parentAccount &&
        acc.parentAccount.toString().includes("2210")
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
