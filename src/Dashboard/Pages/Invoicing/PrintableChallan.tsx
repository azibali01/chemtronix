// Separate PrintableChallan component for secure printing
import type { CSSProperties } from "react";
import { type DeliveryItem } from "../../Context/Invoicing/DeliveryChallanContext";
import { getFooterImage } from "../../../utils/assetPaths";

interface PrintableChallanProps {
  challan: {
    challanId: string;
    deliveryDate: string;
    poNo: string;
    poDate: string;
    partyName: string;
    partyAddress: string;
    contactPerson?: string;
    partyPhone?: string;
    other?: string;
    vehicleNo?: string;
    deliveredBy?: string;
    driverCellNo?: string;
  };
  items: DeliveryItem[];
  brand: "chemtronics" | "hydroworx";
}

export function PrintableChallan({
  challan,
  items,
  brand,
}: PrintableChallanProps) {
  const logoSrc =
    brand === "chemtronics" ? "/CmLogo.png" : "/HydroworxLogo.png";
  const primaryColor = brand === "chemtronics" ? "#819E00" : "#0066CC";
  const secondaryColor = brand === "chemtronics" ? "#0A6802" : "#004499";
  const cellBorder: CSSProperties = {
    border: "1px solid #222",
    padding: "22px 18px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: 15,
  };

  const thCell: CSSProperties = {
    ...cellBorder,
    fontWeight: "bold",
    color: secondaryColor,
    fontSize: 15,
    minHeight: 58,
  };

  const logoHeightPx = brand === "chemtronics" ? 92 : 64;

  return (
    <div
      className="printable-challan"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#fff",
        fontSize: 14,
        lineHeight: 1.45,
        padding: "16px 0 0",
        width: "100%",
        maxWidth: "210mm",
        margin: "0 auto",
        boxSizing: "border-box",
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* 93% print scale applies to this wrapper only (see DeliveryChallans print CSS); footer stays full width */}
      <div
        className="printable-challan__scale"
        style={{ flex: "0 0 auto", width: "100%" }}
      >
      <div
        className="printable-challan__main"
        style={{
          flex: "0 0 auto",
          position: "relative",
          paddingLeft: 18,
          paddingRight: 18,
        }}
      >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <img
          src={logoSrc}
          alt=""
          style={{ height: logoHeightPx, width: "auto", maxWidth: "100%" }}
        />
        <h2
          style={{
            color: primaryColor,
            margin: "10px 0 6px",
            fontSize: 28,
            fontWeight: "bold",
            letterSpacing: 0.5,
          }}
        >
          Delivery Challan
        </h2>
      </div>

      {/* Party Info */}
      <table
        style={{
          width: "100%",
          fontSize: 14,
          marginBottom: 12,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                width: 150,
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Party Name
            </td>
            <td
              style={{
                color: "#222",
                fontWeight: 600,
                paddingBottom: 10,
                wordBreak: "break-word",
                verticalAlign: "top",
              }}
            >
              {challan.partyName}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                width: 150,
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Delivery Date
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.deliveryDate}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Party Address
            </td>
            <td
              style={{
                color: "#222",
                paddingBottom: 10,
                wordBreak: "break-word",
                verticalAlign: "top",
              }}
            >
              {challan.partyAddress}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              DC No
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.challanId}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              PO Ref
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.poNo}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              PO Date
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.poDate}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Contact Person
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.contactPerson || "-"}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Party Phone #
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.partyPhone || "-"}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 10,
                verticalAlign: "top",
              }}
            >
              Other
            </td>
            <td style={{ color: "#222", paddingBottom: 10, verticalAlign: "top" }}>
              {challan.other || "-"}
            </td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* Vehicle/Delivery Info */}
      <table
        style={{
          width: "100%",
          fontSize: 14,
          marginBottom: 14,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "33%", paddingBottom: 10 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Vehicle No.
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 100,
                  display: "inline-block",
                  marginLeft: 8,
                  fontSize: 14,
                }}
              >
                {challan.vehicleNo || ""}
              </span>
            </td>
            <td style={{ width: "33%", paddingBottom: 10 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Delivered By
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 100,
                  display: "inline-block",
                  marginLeft: 8,
                  fontSize: 14,
                }}
              >
                {challan.deliveredBy || ""}
              </span>
            </td>
            <td style={{ width: "33%", paddingBottom: 10 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Driver Cell No.
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 100,
                  display: "inline-block",
                  marginLeft: 8,
                  fontSize: 14,
                }}
              >
                {challan.driverCellNo || ""}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table — one row per line item; full grid + outer border for print */}
      <table
        className="challan-items-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #222",
          fontSize: 15,
          marginBottom: 16,
          marginTop: 10,
          tableLayout: "fixed",
          pageBreakInside: "avoid",
        }}
      >
        <thead>
          <tr style={{ background: "#F8FFF6" }}>
            <th style={{ ...thCell, width: "8%" }}>SR</th>
            <th style={{ ...thCell, width: "19%" }}>Item Code</th>
            <th style={{ ...thCell, width: "35%", overflowWrap: "anywhere" }}>
              Particulars
            </th>
            <th style={{ ...thCell, width: "10%" }}>Unit</th>
            <th style={{ ...thCell, width: "10%" }}>Length</th>
            <th style={{ ...thCell, width: "10%" }}>Width</th>
            <th style={{ ...thCell, width: "8%" }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr style={{ pageBreakInside: "avoid", minHeight: 96 }}>
              <td
                colSpan={7}
                style={{
                  ...cellBorder,
                  color: "#666",
                  fontStyle: "italic",
                  minHeight: 96,
                }}
              >
                No line items
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr
                key={`${item.sr}-${idx}-${item.itemCode}`}
                style={{ pageBreakInside: "avoid", minHeight: 96 }}
              >
                <td
                  style={{
                    ...cellBorder,
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.sr}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.itemCode}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.particulars}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.unit}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.length}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.width}
                </td>
                <td style={{ ...cellBorder, overflowWrap: "anywhere" }}>
                  {item.qty}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      </div>

      {/* Signatures + footer image stay together at page bottom (no flex gap between them) */}
      <div
        className="printable-challan-bottom"
        style={{
          marginTop: "auto",
          flexShrink: 0,
          width: "100%",
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          pageBreakInside: "avoid",
        }}
      >
        <div
          className="printable-challan-signatures"
          style={{
            padding: "14px 18px 6px",
            pageBreakInside: "avoid",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 14,
              marginBottom: 8,
              tableLayout: "fixed",
              pageBreakInside: "avoid",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "33%",
                    textAlign: "center",
                    paddingBottom: 12,
                  }}
                >
                  <span
                    style={{
                      color: secondaryColor,
                      fontWeight: "bold",
                      borderBottom: "1px solid #222",
                      paddingBottom: 2,
                      fontSize: 13,
                    }}
                  >
                    Prepared By
                  </span>
                </td>
                <td
                  style={{
                    width: "33%",
                    textAlign: "center",
                    paddingBottom: 12,
                  }}
                >
                  <span
                    style={{
                      color: secondaryColor,
                      fontWeight: "bold",
                      borderBottom: "1px solid #222",
                      paddingBottom: 2,
                      fontSize: 13,
                    }}
                  >
                    Checked By
                  </span>
                </td>
                <td
                  style={{
                    width: "33%",
                    textAlign: "center",
                    paddingBottom: 12,
                  }}
                >
                  <span
                    style={{
                      color: secondaryColor,
                      fontWeight: "bold",
                      borderBottom: "1px solid #222",
                      paddingBottom: 2,
                      fontSize: 13,
                    }}
                  >
                    Receipt
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ margin: "8px 0", fontSize: 11, lineHeight: 1.4 }}>
            Please receive the above material and return duplicate of this
            challan duly received and signed for record
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: "bold",
              color: secondaryColor,
              fontSize: 13,
              marginTop: 6,
              borderBottom: "1px solid #222",
              paddingBottom: 4,
            }}
          >
            Receiver Signature
          </div>
        </div>

        <div
          className="printable-challan-footer-wrap"
          style={{
            flexShrink: 0,
            width: "100%",
            alignSelf: "stretch",
            pageBreakInside: "avoid",
          }}
        >
          <img
            src={
              brand === "chemtronics"
                ? "/footer finl.jpg"
                : getFooterImage(brand)
            }
            alt=""
            className="printable-challan-footer-img"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "contain",
              objectPosition: "bottom center",
            }}
          />
        </div>
      </div>
    </div>
  );
}
