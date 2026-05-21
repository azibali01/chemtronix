import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ThemeProvider from "./theme/ThemeProvider.tsx";
import RouterProvider from "./router/Router.tsx";
import { AuthProvider } from "./Auth/Context/AuthContext.tsx";
import { BrandProvider } from "./Dashboard/Context/BrandContext.tsx";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrandProvider>
          <RouterProvider />
        </BrandProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
