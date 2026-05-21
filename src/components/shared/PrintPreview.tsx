import React from "react";
import PrintLayout from "./PrintLayout";
import type { PrintDocumentData } from "../../hooks/usePrintService";

export interface PrintPreviewProps {
  isOpen: boolean;
  data: PrintDocumentData | null;
  onClose: () => void;
}

/**
 * PrintPreview Component
 *
 * Renders the print preview by wrapping content in PrintLayout.
 * This component is always in the DOM but hidden on screen.
 * It becomes visible during print operations via CSS @media print.
 */
export const PrintPreview: React.FC<PrintPreviewProps> = ({ isOpen, data }) => {
  if (!isOpen || !data) {
    return null;
  }

  return (
    <PrintLayout
      documentTitle={data.title}
      showHeader={data.showHeader !== false}
      showFooter={data.showFooter !== false}
    >
      {data.content}
    </PrintLayout>
  );
};

export default PrintPreview;
