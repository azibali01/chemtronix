import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = "http://localhost:3001";

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sale Invoice S-818</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; width: 100%; }
    .sale-page { width: 100%; padding-bottom: 12px; }
    .sale-logo-wrap { padding: 4px 4% 8px; }
    .sale-logo { max-height: 72px; width: auto; max-width: 220px; }
    .sale-details-panel { border: 1px solid #000; border-radius: 14px; margin: 0 4% 12px; padding: 10px 16px; }
    .sale-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .lbl { color: #0B4AA6; font-weight: 700; display: inline-block; min-width: 92px; }
    .sale-items-wrap { padding: 0 4%; }
    .sale-items { width: 100%; border-collapse: collapse; border: 1px solid #000; }
    .sale-items th, .sale-items td { border: 1px solid #000; padding: 6px 8px; }
    .sale-items thead th { background: #1e4fa8; color: #fff; font-weight: 700; text-align: center; }
    .c { text-align: center; } .l { text-align: left; } .r { text-align: right; }
    .sale-bottom { display: flex; justify-content: space-between; padding: 10px 4% 0; }
    .sale-totals { width: 300px; }
    .sale-totals .line { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding: 3px 0 5px; margin-bottom: 4px; color: #0B4AA6; font-weight: 700; }
    .sale-totals .line span:last-child { color: #000; font-weight: 400; text-align: right; min-width: 100px; }
    .sale-totals .net-total { border-bottom: 3px double #000; }
    .sale-footer img { width: 100%; display: block; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="sale-page">
    <div class="sale-logo-wrap">
      <img class="sale-logo" src="${base}/Hydroworx-header.jpeg" alt="HydroWorx" />
    </div>
    <div class="sale-details-panel">
      <div class="sale-details-grid">
        <div>
          <p><span class="lbl">Messer's:</span> NEW Defense View (NDVHS)</p>
          <p><span class="lbl">Address:</span> DGK</p>
        </div>
        <div>
          <p><span class="lbl">InvoiceNo:</span> S-818</p>
          <p><span class="lbl">Invoice Date:</span> 07-October-2025</p>
          <p><span class="lbl">Delivery No:</span></p>
          <p><span class="lbl">Delivery Date:</span> 07-October-2025</p>
          <p><span class="lbl">Po No:</span> Choti Zareen</p>
          <p><span class="lbl">Po DateDate:</span> 07-October-2025</p>
        </div>
      </div>
    </div>
    <div class="sale-items-wrap">
      <table class="sale-items">
        <thead>
          <tr><th>S.No</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>GrossAmount</th><th>Net Amount</th></tr>
        </thead>
        <tbody>
          <tr><td class="c">1</td><td class="l">CER-1122</td><td class="c">32.00</td><td class="r">450.00</td><td class="r">14,400.00</td><td class="r">14,400.00</td></tr>
          <tr><td class="c">2</td><td class="l">Cartridge Filter 20" 5M Jumbo</td><td class="c">18.00</td><td class="r">800.00</td><td class="r">14,400.00</td><td class="r">14,400.00</td></tr>
        </tbody>
      </table>
    </div>
    <div class="sale-bottom">
      <div style="font-size:11px">*Computer generated invoice. No need for signature</div>
      <div class="sale-totals">
        <div class="line"><span>Gross Value :</span><span>28,800.00</span></div>
        <div class="line"><span>Discount:</span><span>0.00</span></div>
        <div class="line net-total"><span>Net Total :</span><span>28,800.00</span></div>
      </div>
    </div>
    <div class="sale-footer">
      <img src="${base}/Footer.jpeg" alt="Footer" />
    </div>
  </div>
</body>
</html>`;

writeFileSync(
  join(root, "public", "sale-invoice-print-preview-sample.html"),
  html,
  "utf8",
);
console.log("Wrote public/sale-invoice-print-preview-sample.html");
