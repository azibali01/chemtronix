import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button, Group, SegmentedControl, Text } from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import {
  buildSampleCommercialInvoicePrintHtml,
  buildSampleGstInvoicePrintHtml,
  openInvoicePrintPreview,
} from "../../../utils/chemtronicsInvoicePrintHtml";
import { buildSampleSalesInvoicePrintHtml } from "../../../utils/salesInvoicePrintHtml";

type PreviewKind = "commercial" | "gst" | "sales";

/** Standalone invoice print previews (no API). */
export default function GstInvoicePrintDemo() {
  const brand = localStorage.getItem("brand") ?? "chemtronics";
  const [previewKind, setPreviewKind] = useState<PreviewKind>("sales");

  const html = useMemo(() => {
    const origin = window.location.origin;
    if (previewKind === "sales") {
      return buildSampleSalesInvoicePrintHtml(brand, origin);
    }
    if (previewKind === "commercial") {
      return buildSampleCommercialInvoicePrintHtml(brand, origin);
    }
    return buildSampleGstInvoicePrintHtml(brand, origin);
  }, [brand, previewKind]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <div style={{ padding: 16, minHeight: "100vh", background: "#f5f5f5" }}>
      <Group justify="space-between" mb="md">
        <div>
          <Text size="xl" fw={700}>
            Invoice print design preview
          </Text>
          <Text size="sm" c="dimmed">
            Sale Invoice (PDF 8), Commercial (PDF 7), or Sales Tax (GST).
          </Text>
        </div>
        <Group>
          <SegmentedControl
            value={previewKind}
            onChange={(v) => setPreviewKind(v as PreviewKind)}
            data={[
              { label: "Sale Invoice (PDF 8)", value: "sales" },
              { label: "Commercial (PDF 7)", value: "commercial" },
              { label: "Sales Tax (GST)", value: "gst" },
            ]}
          />
          <Button
            component={Link}
            to="/dashboard/sales-invoice"
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Sales Invoice
          </Button>
          <Button
            color="#0A6802"
            leftSection={<IconPrinter size={16} />}
            onClick={() => openInvoicePrintPreview(html)}
          >
            Print
          </Button>
        </Group>
      </Group>
      <iframe
        ref={iframeRef}
        title="Invoice print design"
        style={{
          width: "100%",
          height: "calc(100vh - 120px)",
          border: "1px solid #ccc",
          background: "#fff",
          display: "block",
        }}
      />
    </div>
  );
}
