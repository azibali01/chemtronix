import { useState, useCallback } from "react";

export type PrintDocumentType =
  | "purchase-return"
  | "sales-invoice"
  | "purchase-invoice"
  | "sale-return"
  | "credit-sale"
  | "cash-book"
  | "accounts-receivable"
  | "accounts-payable"
  | "trial-balance"
  | "stock-report";

export interface PrintDocumentData {
  type: PrintDocumentType;
  title: string;
  content: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  onPrintComplete?: () => void;
}

export interface UsePrintServiceReturn {
  isPreviewOpen: boolean;
  printData: PrintDocumentData | null;
  openPrintPreview: (data: PrintDocumentData) => void;
  closePrintPreview: () => void;
  print: () => void;
}

/**
 * usePrintService Hook
 *
 * Centralized print service for all document types.
 * Manages print state and provides standardized print operations.
 *
 * Usage:
 * const { openPrintPreview, print } = usePrintService();
 * openPrintPreview({
 *   type: "purchase-return",
 *   title: "Purchase Return",
 *   content: <YourContent />,
 *   showHeader: true,
 *   showFooter: true,
 * });
 */
export const usePrintService = (): UsePrintServiceReturn => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printData, setPrintData] = useState<PrintDocumentData | null>(null);

  const openPrintPreview = useCallback((data: PrintDocumentData) => {
    setPrintData(data);
    setIsPreviewOpen(true);
  }, []);

  const closePrintPreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPrintData(null);
  }, []);

  const print = useCallback(() => {
    // Wait for DOM to be ready, then trigger print
    setTimeout(() => {
      window.print();
      // Optional: Close preview after printing
      // closePrintPreview();
    }, 100);
  }, []);

  return {
    isPreviewOpen,
    printData,
    openPrintPreview,
    closePrintPreview,
    print,
  };
};

export default usePrintService;
