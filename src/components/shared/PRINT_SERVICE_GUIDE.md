# Centralized Multi-Brand Print Service - Implementation Guide

## Overview

This document outlines the new centralized printing system that replaces unsafe `window.open() + document.write()` patterns with a component-based approach using React and Mantine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Print System Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Component Page] (e.g., PurchaseReturns, SalesInvoice)         │
│       ↓                                                           │
│  [usePrintService Hook]  ← Centralized state management         │
│       ├─ openPrintPreview()  ← Initialize print                 │
│       ├─ closePrintPreview() ← Close print                      │
│       └─ print()             ← Trigger window.print()           │
│       ↓                                                           │
│  [PrintPreview Component] ← Wrapper                             │
│       ↓                                                           │
│  [PrintLayout Component]  ← Global layout with header/footer    │
│       ├─ getHeaderImage(brand)  ← Brand-aware assets           │
│       ├─ getFooterImage(brand)  ← Brand-aware assets           │
│       └─ @media print CSS       ← Print styling                │
│       ↓                                                           │
│  [Content Component] (e.g., PurchaseReturnContent)             │
│       └─ Renders actual document content using Mantine          │
│       ↓                                                           │
│  [Browser Print Dialog] ← window.print()                        │
│       ↓                                                           │
│  [PDF / Physical Print]                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. PrintLayout.tsx

**Purpose:** Global layout component that wraps all printable content.

**Features:**

- Uses `useBrand()` to get current brand (Chemtronics or Hydroworx)
- Auto-renders brand-specific header/footer images
- CSS `@media print` hides on screen, visible only during printing
- Consistent margins, spacing, and page breaks

**Usage:**

```tsx
<PrintLayout
  documentTitle="Purchase Return"
  showHeader={true}
  showFooter={true}
>
  {children}
</PrintLayout>
```

### 2. PrintLayout.css

**Purpose:** Global CSS for print-specific styling.

**Key Sections:**

- `@media print` - Hide sidebar, navbar, buttons on print
- Table styling for print (borders, fonts, page breaks)
- Page breaks and orphan/widow control
- Page size (A4) and margins

### 3. usePrintService Hook

**Purpose:** Centralized state management for print operations.

**Functions:**

```ts
const {
  isPreviewOpen, // Boolean: is print preview open?
  printData, // PrintDocumentData: current document data
  openPrintPreview, // Function: open preview with data
  closePrintPreview, // Function: close preview
  print, // Function: trigger window.print()
} = usePrintService();
```

### 4. Specific Content Components (e.g., PurchaseReturnContent)

**Purpose:** Format and render document-specific content.

**Pattern:**

```tsx
interface YourContentProps {
  data: YourDocumentData;
}

export const YourContent: React.FC<YourContentProps> = ({ data }) => {
  return (
    <>
      {/* Header section with document details */}
      {/* Table of items */}
      {/* Totals section */}
      {/* Footer notes */}
    </>
  );
};
```

### 5. PrintPreview Component

**Purpose:** Connects print service to PrintLayout + content.

**Always rendered** in the component tree but hidden on screen.
Becomes visible only during print via CSS.

## Multi-Brand Flow

### 1. Brand Selection

```tsx
const { brand } = useBrand(); // "chemtronics" or "hydroworx"
```

### 2. Asset Resolution

```tsx
// In PrintLayout.tsx
const headerImage = getHeaderImage(brand); // /Header.jpg or /Hydroworx-header.jpeg
const footerImage = getFooterImage(brand); // /Footer.jpeg or /hydroworx-footer.jpeg
```

### 3. Complete Flow

```
User selects Brand (Chemtronix ↔ Hydroworx)
        ↓
BrandContext stores to localStorage
        ↓
PrintLayout reads brand via useBrand()
        ↓
getHeaderImage(brand) & getFooterImage(brand) return correct paths
        ↓
Images embedded in PrintLayout
        ↓
window.print() renders with correct images
```

## Implementation Template

### Step 1: Create Content Component

```tsx
// src/components/shared/YourDocumentContent.tsx
import React from "react";
import { Table, Group, Stack } from "@mantine/core";

export interface YourDocumentData {
  id: string;
  title: string;
  details: Record<string, string>;
  items: YourItem[];
  total: number;
  notes: string;
}

interface YourDocumentContentProps {
  data: YourDocumentData;
}

export const YourDocumentContent: React.FC<YourDocumentContentProps> = ({
  data,
}) => {
  return (
    <>
      {/* Details section */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <Stack gap="xs">
          {Object.entries(data.details).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </Stack>
      </div>

      {/* Items table */}
      <Table striped highlightOnHover withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Column 1</Table.Th>
            <Table.Th>Column 2</Table.Th>
            {/* ... more columns ... */}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.items.map((item, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>{item.field1}</Table.Td>
              <Table.Td>{item.field2}</Table.Td>
              {/* ... more cells ... */}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* Totals */}
      <div style={{ marginTop: "12px", textAlign: "right" }}>
        <strong>Total: {data.total}</strong>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginTop: "12px" }}>Notes: {data.notes}</div>
      )}
    </>
  );
};
```

### Step 2: Update Component to Use Print Service

```tsx
// src/Dashboard/Pages/YourModule/YourPage.tsx
import { usePrintService } from "../../../hooks/usePrintService";
import PrintPreview from "../../../components/shared/PrintPreview";
import { YourDocumentContent } from "../../../components/shared/YourDocumentContent";

export default function YourPage() {
  const {
    isPreviewOpen,
    printData,
    openPrintPreview,
    closePrintPreview,
    print,
  } = usePrintService();

  // Handle print action
  const handlePrint = (entry: YourEntry) => {
    openPrintPreview({
      type: "your-document",
      title: "Your Document Title",
      content: (
        <YourDocumentContent
          data={{
            id: entry.id,
            title: entry.title,
            details: {
              /* ... */
            },
            items: entry.items,
            total: entry.total,
            notes: entry.notes,
          }}
        />
      ),
      showHeader: true,
      showFooter: true,
      onPrintComplete: () => {
        closePrintPreview();
      },
    });

    // Auto-trigger print
    setTimeout(() => {
      print();
    }, 300);
  };

  return (
    <div>
      {/* Your page content */}
      <Button onClick={() => handlePrint(someEntry)}>
        <IconPrinter size={16} /> Print
      </Button>

      {/* Add PrintPreview component */}
      <PrintPreview
        isOpen={isPreviewOpen}
        data={printData}
        onClose={closePrintPreview}
      />
    </div>
  );
}
```

## Benefits

| Aspect           | Old Pattern                                  | New Pattern                      |
| ---------------- | -------------------------------------------- | -------------------------------- |
| Code Duplication | ❌ 8+ files had custom print logic           | ✅ Single PrintLayout component  |
| Safety           | ❌ `window.open() + document.write()` unsafe | ✅ React components only         |
| Brand Support    | ⚠️ Manual in each file                       | ✅ Automatic via BrandContext    |
| Maintainability  | ❌ Hard to update                            | ✅ Change PrintLayout once       |
| Consistency      | ❌ Different layouts in each file            | ✅ Uniform across all documents  |
| Performance      | ⚠️ Complex string concatenation              | ✅ React optimized rendering     |
| Testing          | ❌ Hard to test window manipulation          | ✅ Component-based, easy to test |

## Pages to Refactor (In Priority Order)

1. ✅ **PurchaseReturns.tsx** - Template (COMPLETED)
2. **SalesInvoice.tsx** - Follow template
3. **PurchaseInvoice.tsx** - Follow template
4. **CreditSaleInvoice.tsx** - Follow template
5. **SaleReturns.tsx** - Follow template
6. **CashBook.tsx** - Follow template
7. **AccountsReceivable.tsx** - Follow template
8. **AccountsPayable.tsx** - Follow template
9. **TrialBalance.tsx** - Follow template
10. **StockReports.tsx** - Follow template

## CSS Classes for Print Control

```css
/* Hide element on print */
.print-hidden,
.no-print {
  display: none !important;
}

/* Show element only on print */
.print-only {
  display: none !important;
} /* in @media print: display: block; */

/* Prevent page break inside */
.no-page-break {
  page-break-inside: avoid;
}

/* Force page break before */
.page-break-before {
  page-break-before: always;
}

/* Force page break after */
.page-break-after {
  page-break-after: always;
}
```

## Troubleshooting

### Images not showing in print?

- Ensure images are in `public/` folder
- Check image paths in `assetPaths.ts`
- Images must be web-accessible (not base64 for performance)

### Table split across pages?

- Use `@media print { border-collapse: collapse; }`
- Set `page-break-inside: avoid;` on rows

### Header/Footer not showing?

- Verify `showHeader` and `showFooter` are `true` in `openPrintPreview()`
- Check CSS `@media print` rules
- Ensure images load before print

### Brand not switching?

- Check `BrandContext` is providing correct brand
- Verify localStorage is not blocking brand change
- Check browser console for errors

## Performance Notes

- PrintPreview component is lightweight
- CSS @media print prevents unnecessary DOM manipulation
- No string concatenation = better performance
- React reconciliation handles updates efficiently
- Browser's print engine handles pagination automatically

## Security Considerations

✅ No `innerHTML` injection
✅ No `document.write()` (security risk)
✅ All content via React components
✅ XSS protected by React's built-in escaping
✅ No eval or dynamic code execution

## Future Enhancements

- [ ] Add print preview mode (visual before actual print)
- [ ] Export to PDF directly (jsPDF integration)
- [ ] Print templates per brand (custom designs)
- [ ] Print history/saved documents
- [ ] Batch printing multiple documents
- [ ] Email print-ready PDFs
