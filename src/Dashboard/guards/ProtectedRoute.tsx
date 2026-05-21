import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../Auth/Context/AuthContext";
import { CompanyProvider } from "../Context/Company & Users/CompanyContext";
import { UserProvider } from "../Context/Company & Users/UserContext";
import { PermissionProvider } from "../Context/Company & Users/PermissionContext";
import { PurchaseInvoiceProvider } from "../Context/Invoicing/PurchaseInvoiceContext";
import { SalesInvoiceProvider } from "../Context/Invoicing/SalesInvoiceContext";
import { PurchaseReturnsProvider } from "../Context/Invoicing/PurchaseReturnsContext";
import { DeliveryChallanProvider } from "../Context/Invoicing/DeliveryChallanContext";
import { CreditSalesProvider } from "../Context/Invoicing/CreditSalesContext";
import { SaleReturnsProvider } from "../Context/Invoicing/SaleReturnsContext";
import { JournalVouchersProvider } from "../Context/Accounts/JournalVouchersContext";
import { ChartOfAccountsProvider } from "../Context/ChartOfAccountsContext";
import { AccountsOpeningBalancesProvider } from "../Context/AccountsOpeningbalancesContext";
import { DashboardHomeProvider } from "../Context/DashboardHomeContext";
import { ProductsProvider } from "../Context/Inventory/ProductsContext";
import { StockReportsProvider } from "../Context/Inventory/StockReportsContext";

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <CompanyProvider>
      <UserProvider>
        <PermissionProvider>
          <PurchaseInvoiceProvider>
            <SalesInvoiceProvider>
              <PurchaseReturnsProvider>
                <DeliveryChallanProvider>
                  <CreditSalesProvider>
                    <SaleReturnsProvider>
                      <JournalVouchersProvider>
                        <ChartOfAccountsProvider>
                          <AccountsOpeningBalancesProvider>
                            <DashboardHomeProvider>
                              <ProductsProvider>
                                <StockReportsProvider>
                                  <Outlet />
                                </StockReportsProvider>
                              </ProductsProvider>
                            </DashboardHomeProvider>
                          </AccountsOpeningBalancesProvider>
                        </ChartOfAccountsProvider>
                      </JournalVouchersProvider>
                    </SaleReturnsProvider>
                  </CreditSalesProvider>
                </DeliveryChallanProvider>
              </PurchaseReturnsProvider>
            </SalesInvoiceProvider>
          </PurchaseInvoiceProvider>
        </PermissionProvider>
      </UserProvider>
    </CompanyProvider>
  );
};

export default ProtectedRoute;
