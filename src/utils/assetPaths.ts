/**
 * Asset path utility for brand-specific header and footer images
 */
export function getHeaderImage(brand: string): string {
  return brand === "hydroworx" ? "/Hydroworx-header.jpeg" : "/Header.jpg";
}

export function getFooterImage(brand: string): string {
  return brand === "hydroworx" ? "/hydroworx-footer.jpeg" : "/Footer.jpeg";
}

export type CompanyTaxProfile = {
  legalName: string;
  ntn: string;
  strn: string;
};

/** Seller NTN/STRN for printed invoices (override via VITE_* in .env). */
export function getCompanyTaxProfile(brand: string): CompanyTaxProfile {
  if (brand === "hydroworx") {
    return {
      legalName: "Hydroworx",
      ntn: String(import.meta.env.VITE_HYDROWORX_NTN ?? "").trim(),
      strn: String(import.meta.env.VITE_HYDROWORX_STRN ?? "").trim(),
    };
  }
  return {
    legalName: "Chemtronix Engineering Solutions",
    ntn: String(import.meta.env.VITE_CHEMTRONICS_NTN ?? "").trim(),
    strn: String(import.meta.env.VITE_CHEMTRONICS_STRN ?? "").trim(),
  };
}

/** Full-bleed footer image (matches header breakout from page padding). */
export const INVOICE_PRINT_FOOTER_STYLE =
  "display:block;width:100%;height:auto;max-height:140px;object-fit:cover;";

export const INVOICE_PRINT_FOOTER_WRAP_STYLE =
  "margin-top:18px;margin-left:-24px;width:calc(100% + 48px);break-inside:avoid;page-break-inside:avoid;";
