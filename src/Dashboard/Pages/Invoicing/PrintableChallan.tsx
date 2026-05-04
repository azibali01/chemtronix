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
    padding: 5,
  };

  return (
    <div
      className="printable-challan"
      style={{
        fontFamily: "Arial, sans-serif",
        background: "#fff",
        padding: "12px 15px",
        width: "100%",
        maxWidth: "190mm",
        margin: "0 auto",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <img src={logoSrc} alt="Logo" style={{ height: 40 }} />
        <h2
          style={{
            color: primaryColor,
            margin: "4px 0",
            fontSize: 20,
            fontWeight: "bold",
            letterSpacing: 1,
          }}
        >
          Delivery Challan
        </h2>
      </div>

      {/* Original/Duplicate/Triplicate */}
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <table style={{ border: "1px solid #222", fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #222", padding: "2px 8px" }}>
                Original
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #222", padding: "2px 8px" }}>
                Duplicate
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #222", padding: "2px 8px" }}>
                Triplicate
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Party Info */}
      <table
        style={{
          width: "100%",
          fontSize: 10,
          marginBottom: 8,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                width: 120,
                paddingBottom: 6,
              }}
            >
              Party Name
            </td>
            <td
              style={{
                color: "#222",
                fontWeight: "bold",
                paddingBottom: 6,
                wordBreak: "break-word",
              }}
            >
              {challan.partyName}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                width: 120,
                paddingBottom: 6,
              }}
            >
              Delivery Date
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
              {challan.deliveryDate}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              Party Address
            </td>
            <td
              style={{
                color: "#222",
                paddingBottom: 6,
                wordBreak: "break-word",
              }}
            >
              {challan.partyAddress}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              DC No#
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
              {challan.challanId}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              PO No#
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>{challan.poNo}</td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              PO Date
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
              {challan.poDate}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              Contact Person
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
              {challan.contactPerson || "-"}
            </td>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              Party Phone #
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
              {challan.partyPhone || "-"}
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: secondaryColor,
                fontWeight: "bold",
                paddingBottom: 6,
              }}
            >
              Other
            </td>
            <td style={{ color: "#222", paddingBottom: 6 }}>
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
          fontSize: 10,
          marginBottom: 8,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "33%", paddingBottom: 6 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Vehicle No.
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 48,
                  display: "inline-block",
                  marginLeft: 8,
                }}
              >
                {challan.vehicleNo || ""}
              </span>
            </td>
            <td style={{ width: "33%", paddingBottom: 6 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Delivered By
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 48,
                  display: "inline-block",
                  marginLeft: 8,
                }}
              >
                {challan.deliveredBy || ""}
              </span>
            </td>
            <td style={{ width: "33%", paddingBottom: 6 }}>
              <span style={{ color: secondaryColor, fontWeight: "bold" }}>
                Driver Cell No.
              </span>{" "}
              <span
                style={{
                  borderBottom: "1px solid #222",
                  minWidth: 48,
                  display: "inline-block",
                  marginLeft: 8,
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
          fontSize: 10,
          marginBottom: 12,
          marginTop: 8,
          tableLayout: "fixed",
          pageBreakInside: "avoid",
        }}
      >
        <thead>
          <tr style={{ background: "#F8FFF6" }}>
            <th
              style={{
                ...cellBorder,
                width: "7%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              SR.
            </th>
            <th
              style={{
                ...cellBorder,
                width: "18%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Item Code
            </th>
            <th
              style={{
                ...cellBorder,
                width: "33%",
                overflowWrap: "anywhere",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Particulars
            </th>
            <th
              style={{
                ...cellBorder,
                width: "10%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Unit
            </th>
            <th
              style={{
                ...cellBorder,
                width: "10%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Length
            </th>
            <th
              style={{
                ...cellBorder,
                width: "10%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Width
            </th>
            <th
              style={{
                ...cellBorder,
                width: "12%",
                fontWeight: "bold",
                color: secondaryColor,
              }}
            >
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr style={{ pageBreakInside: "avoid" }}>
              <td
                colSpan={7}
                style={{
                  ...cellBorder,
                  textAlign: "center",
                  color: "#666",
                  fontStyle: "italic",
                }}
              >
                No line items
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr
                key={`${item.sr}-${idx}-${item.itemCode}`}
                style={{ pageBreakInside: "avoid" }}
              >
                <td
                  style={{
                    ...cellBorder,
                    textAlign: "center",
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

      {/* Signatures — directly above invoice footer image */}
      <div style={{ marginTop: 8, marginBottom: 4, pageBreakInside: "avoid" }}>
        <table
          style={{
            width: "100%",
            fontSize: 10,
            marginBottom: 4,
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
                  paddingBottom: 8,
                }}
              >
                <span
                  style={{
                    color: secondaryColor,
                    fontWeight: "bold",
                    borderBottom: "1px solid #222",
                    paddingBottom: 1,
                    fontSize: 9,
                  }}
                >
                  Prepared By
                </span>
              </td>
              <td
                style={{
                  width: "33%",
                  textAlign: "center",
                  paddingBottom: 8,
                }}
              >
                <span
                  style={{
                    color: secondaryColor,
                    fontWeight: "bold",
                    borderBottom: "1px solid #222",
                    paddingBottom: 1,
                    fontSize: 9,
                  }}
                >
                  Checked By
                </span>
              </td>
              <td
                style={{
                  width: "33%",
                  textAlign: "center",
                  paddingBottom: 8,
                }}
              >
                <span
                  style={{
                    color: secondaryColor,
                    fontWeight: "bold",
                    borderBottom: "1px solid #222",
                    paddingBottom: 1,
                    fontSize: 9,
                  }}
                >
                  Manager
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ margin: "4px 0", fontSize: 8 }}>
          Please receive the above material and return duplicate of this challan
          duly received and signed for record
        </div>
        <div
          style={{
            textAlign: "right",
            fontWeight: "bold",
            color: secondaryColor,
            fontSize: 10,
            marginTop: 4,
            borderBottom: "1px solid #222",
            paddingBottom: 2,
          }}
        >
          Receiver Signature
        </div>
      </div>

      {/* Same footer image as sales invoice print */}
      <div
        style={{
          marginTop: 8,
          marginBottom: 0,
          pageBreakInside: "avoid",
          width: "100%",
        }}
      >
        <img
          src={
            brand === "chemtronics" ? "/footer finl.jpg" : getFooterImage(brand)
          }
          alt="Footer"
          style={{
            width: "100%",
            height: "auto",
            maxHeight: 120,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
