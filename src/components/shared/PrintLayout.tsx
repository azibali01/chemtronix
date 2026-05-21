import React from "react";
import { useBrand } from "../../Dashboard/Context/BrandContext";
import { getHeaderImage, getFooterImage } from "../../utils/assetPaths";
import "./PrintLayout.css";

export interface PrintLayoutProps {
  children: React.ReactNode;
  documentTitle?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

/**
 * Global PrintLayout Component
 *
 * Provides a consistent, brand-aware print layout for all documents.
 * Automatically renders the correct header/footer images based on selected brand.
 *
 * Features:
 * - Brand-aware header/footer images (Chemtronics vs Hydroworx)
 * - @media print CSS to hide on screen, show on printer
 * - Proper page breaks and margins
 * - Consistent styling across all documents
 */
export const PrintLayout: React.FC<PrintLayoutProps> = ({
  children,
  documentTitle,
  showHeader = true,
  showFooter = true,
}) => {
  const { brand } = useBrand();
  const headerImage = getHeaderImage(brand);
  const footerImage = getFooterImage(brand);

  return (
    <div className="print-layout-wrapper">
      {/* Hidden on screen, visible during print */}
      <div className="print-layout-container">
        {showHeader && (
          <div className="print-header">
            <img
              src={headerImage}
              alt="Brand Header"
              className="print-header-image"
            />
          </div>
        )}

        {documentTitle && (
          <div className="print-document-title">
            <h2>{documentTitle}</h2>
          </div>
        )}

        <div className="print-content">{children}</div>

        {showFooter && (
          <div className="print-footer">
            <img
              src={footerImage}
              alt="Brand Footer"
              className="print-footer-image"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintLayout;
