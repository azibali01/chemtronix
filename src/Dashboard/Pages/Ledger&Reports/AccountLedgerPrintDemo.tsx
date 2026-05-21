import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { Button, Group, Text } from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import {
  buildSampleAccountLedgerPrintHtml,
  openAccountLedgerPrintPreview,
} from "../../../utils/accountLedgerPrintHtml";

/** Standalone page — shows account ledger print layout without API. */
export default function AccountLedgerPrintDemo() {
  const brand = localStorage.getItem("brand") ?? "chemtronics";
  const html = useMemo(() => buildSampleAccountLedgerPrintHtml(brand), [brand]);
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
            Account ledger — print design preview
          </Text>
          <Text size="sm" c="dimmed">
            Sample layout from your PDF (no server data required).
          </Text>
        </div>
        <Group>
          <Button
            component={Link}
            to="/dashboard/general-ledger"
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to General Ledger
          </Button>
          <Button
            color="#0A6802"
            leftSection={<IconPrinter size={16} />}
            onClick={() => openAccountLedgerPrintPreview(html)}
          >
            Print
          </Button>
        </Group>
      </Group>
      <iframe
        ref={iframeRef}
        title="Account ledger print design"
        style={{
          width: "100%",
          height: "calc(100vh - 100px)",
          border: "1px solid #ccc",
          background: "#fff",
          display: "block",
        }}
      />
    </div>
  );
}
