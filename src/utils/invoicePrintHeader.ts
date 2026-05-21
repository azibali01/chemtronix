/** Full-width letterhead banner (logo, company name, tagline). */
export function buildInvoicePrintHeaderHtml(headerImageUrl: string): string {
  return `
    <div class="header-banner header-banner--image">
      <img class="header-img" src="${headerImageUrl}" alt="Chemtronix header" />
    </div>`;
}

export const INVOICE_PRINT_HEADER_STYLES = `
    .header-banner {
      margin: 0 0 4px;
      width: 100%;
      line-height: 0;
    }
    .header-banner--image .header-img {
      display: block;
      width: 100%;
      height: auto;
      min-width: 100%;
    }
`;
