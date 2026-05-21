import type { RouteObject } from "react-router";
import DashboardLayout from "../dashboardlayout/DashboardLayout";
import DashboardHome from "../Pages/DashboardHome";
import ProtectedRoute from "../guards/ProtectedRoute";

// Invoicing
import SalesInvoice from "../Pages/Invoicing/SalesInvoice";
import GstInvoicePrintDemo from "../Pages/Invoicing/GstInvoicePrintDemo";
import PurchaseInvoice from "../Pages/Invoicing/PurchaseInvoice";
import PurchaseReturns from "../Pages/Invoicing/PurchaseReturns";
import CreditSaleInvoice from "../Pages/Invoicing/CreditSaleInvoice";
import SaleReturns from "../Pages/Invoicing/SaleReturns";
import DeliveryChallans from "../Pages/Invoicing/DeliveryChallans";

// Inventory
import Products from "../Pages/Inventory/Products";
import StockLedger from "../Pages/Inventory/StockLedger";
import StockReports from "../Pages/Inventory/StockReports";

// Chart of Accounts
import ChartOfAccounts from "../Pages/Chart of Accounts/ChartOfAccounts";
import AccountsOpeningBalances from "../Pages/Chart of Accounts/AccountsOpeningBalances";

// Company & Users
import ManageCompanies from "../Pages/Company & Users/ManageCompanies";
import ManageUsers from "../Pages/Company & Users/ManageUsers";
import Permissions from "../Pages/Company & Users/Permissions";

// Ledger & Reports
import GeneralLedger from "../Pages/Ledger&Reports/GeneralLedger";
import AccountLedgerPrintDemo from "../Pages/Ledger&Reports/AccountLedgerPrintDemo";
import SalesLedger from "../Pages/Ledger&Reports/SalesLedger";
import PurchaseLedger from "../Pages/Ledger&Reports/PurchaseLedger";
import AccountsReceivable from "../Pages/Ledger&Reports/AccountsReceivable";
import AccountsPayable from "../Pages/Ledger&Reports/AccountsPayable";
import TrialBalance from "../Pages/Ledger&Reports/TrialBalance";

// Accounts
import CashBook from "../Pages/Accounts/CashBook";
import JournalVouchers from "../Pages/Accounts/JournalVouchers";

// Audit Logs
import AuditLogs from "../Pages/Company & Users/AuditLogs";

// Tax & Invoices

// Analytics
import Analytics from "../Pages/Analytics/Analytics";

const routes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          { path: "dashboard-home", element: <DashboardHome /> },

          // Company & Users
          { path: "manage-companies", element: <ManageCompanies /> },
          { path: "manage-users", element: <ManageUsers /> },
          { path: "permissions", element: <Permissions /> },

          // Chart of Accounts
          { path: "chart-of-accounts", element: <ChartOfAccounts /> },
          {
            path: "accounts-opening-balances",
            element: <AccountsOpeningBalances />,
          },

          // Invoicing
          { path: "sales-invoice", element: <SalesInvoice /> },
          {
            path: "gst-invoice-print-design",
            element: <GstInvoicePrintDemo />,
          },
          { path: "purchase-invoice", element: <PurchaseInvoice /> },
          { path: "purchase-returns", element: <PurchaseReturns /> },
          { path: "credit-sale-invoice", element: <CreditSaleInvoice /> },
          { path: "sale-returns", element: <SaleReturns /> },
          { path: "delivery-challans", element: <DeliveryChallans /> },

          // Inventory
          { path: "products", element: <Products /> },
          { path: "stock-ledger", element: <StockLedger /> },
          { path: "stock-reports", element: <StockReports /> },

          // Ledger & Reports
          { path: "general-ledger", element: <GeneralLedger /> },
          {
            path: "account-ledger-print-design",
            element: <AccountLedgerPrintDemo />,
          },
          { path: "sales-ledger", element: <SalesLedger /> },
          { path: "purchase-ledger", element: <PurchaseLedger /> },
          { path: "accounts-receivable", element: <AccountsReceivable /> },
          { path: "accounts-payable", element: <AccountsPayable /> },
          { path: "trial-balance", element: <TrialBalance /> },

          // Accounts
          { path: "cash-book", element: <CashBook /> },
          { path: "journal-vouchers", element: <JournalVouchers /> },

          // Audit Logs
          { path: "audit-logs", element: <AuditLogs /> },

          // Tax & Invoices

          // Analytics
          { path: "analytics", element: <Analytics /> },
        ],
      },
    ],
  },
];

export default routes;
