// lib/quotationHtml.js — the printed quotation, as an A4 HTML document.

/**
 * The Flutter version builds this with the `pdf` package and hands it to
 * `Printing.layoutPdf`, which opens the system print sheet. The browser
 * already has that sheet, and its "Save as PDF" writes a real PDF — so
 * the web version is the same document expressed in HTML and handed to
 * window.print(), with no PDF library in the bundle at all.
 *
 * It is rendered into a separate window rather than a hidden div in the
 * app. A print stylesheet inside a single-page app has to out-specify
 * every rule the app already ships; a blank window starts from nothing,
 * so what you see in the preview is exactly this file.
 *
 * The layout mirrors the Flutter page: header bar, customer and project
 * side by side, milestone dates, then two columns — amounts on the left,
 * summary and balance breakdown on the right — total banner, terms,
 * signatures. It is built to fit ONE A4 page, which is why the type runs
 * small and the padding is tight.
 */

const BLUE = '#1565C0';
const DEEP = '#0D47A1';
const LIGHT = '#E3F2FD';
const GREEN = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const PURPLE = '#6A1B9A';
const LIGHT_PURPLE = '#EDE7F6';
const DIVIDER = '#BBDEFB';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const nfmt = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dfmt = (d) => (d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

/* HTML-escape everything that came from a user. A customer called
   "Sharma & Sons <Nagpur>" would otherwise break the document. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const kv = (k, v) => `
  <div class="kv"><span class="kv-k">${esc(k)}</span><span class="kv-v">${esc(v || '—')}</span></div>`;

const amt = (label, value, { head = false, total = false, alt = false, sub = '' } = {}) => `
  <div class="amt${head ? ' amt-head' : ''}${total ? ' amt-total' : ''}${alt ? ' amt-alt' : ''}">
    <span class="amt-l">${esc(label)}${sub ? `<em>${esc(sub)}</em>` : ''}</span>
    <span class="amt-v">${head ? esc(value) : inr(value)}</span>
  </div>`;

const sum = (label, value, alt = false) => `
  <div class="sum${alt ? ' sum-alt' : ''}"><span>${esc(label)}</span><span>${inr(value)}</span></div>`;

const milestone = (label, date, colour, bg) => {
  const on = !!date;
  return `
  <div class="ms" style="background:${on ? bg : '#F5F5F5'};border-color:${on ? colour : '#E0E0E0'}">
    <div class="ms-l" style="color:${on ? colour : '#9E9E9E'}">${esc(label)}</div>
    <div class="ms-d" style="color:${on ? colour : '#BDBDBD'};font-weight:${on ? 700 : 400}">${dfmt(date)}</div>
  </div>`;
};

const TERMS = [
  'If your accounts do not tally with our records please contact our office immediately.',
  'Please mention customer name, project name, plot no. & payment details behind your cheque or DD.',
  'Taxes as applicable by Govt. Cheque bounce charges will be applicable.',
  'In case of booking cancellation Rs. 1000/- will be charged.',
  'Agreement amount should be paid within 20 days and sale deed should be done within 3 months from the date of booking. If not the company will cancel the plot.',
];

export function quotationHtml(q, { company = 'SARASWATI GROUP', unit = 'Saraswati Infra', logo = '' } = {}) {
  const ref = q.id ? q.id.slice(0, 8).toUpperCase() : '';
  const agreement = q.totalPlotAmount * 0.20;
  const stampReg = q.stampDutyAmount + q.registrationAmount;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Quotation ${esc(q.customerName)} ${esc(q.plotNumber)}</title>
<style>
  @page { size: A4; margin: 10mm 9mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Noto Sans', 'Inter', system-ui, sans-serif;
    color: #111; font-size: 8px; line-height: 1.35;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .bar {
    background: ${BLUE}; color: #fff; border-radius: 8px; padding: 8px 16px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 34px; height: 34px; padding: 3px; background: #fff; border-radius: 6px; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 15px; letter-spacing: 1.2px; }
  .brand p { margin: 0; font-size: 9px; opacity: 0.85; }
  .tag { background: #fff; color: ${BLUE}; font-weight: 700; font-size: 10.5px;
         padding: 3px 12px; border-radius: 14px; display: inline-block; }
  .meta { text-align: right; font-size: 8.5px; opacity: 0.9; margin-top: 3px; }
  .ref { font-size: 7.5px; opacity: 0.6; }

  .row { display: flex; gap: 8px; align-items: flex-start; }
  .col { flex: 1; min-width: 0; }
  .gap { height: 5px; }

  .card { border: 0.5px solid ${DIVIDER}; border-radius: 6px; overflow: hidden; }
  .card > h2 { margin: 0; padding: 3px 8px; font-size: 8px; color: #fff; background: ${BLUE}; }
  .card.alt > h2 { background: ${DEEP}; }
  .card-body { background: ${LIGHT}; }
  .card.alt .card-body { background: #F8F9FA; }

  .kv { display: flex; padding: 2.5px 8px; font-size: 7.5px; }
  .kv-k { width: 60px; color: #616161; flex: none; }
  .kv-v { flex: 1; text-align: right; color: #000; font-size: 8px; word-break: break-word; }

  .sec { margin: 0 0 2px; padding: 3px 8px; border-radius: 4px;
         background: ${BLUE}; color: #fff; font-size: 8.5px; font-weight: 700; }
  .table { border: 0.5px solid ${DIVIDER}; border-radius: 4px; overflow: hidden; }
  .amt { display: flex; justify-content: space-between; gap: 8px; padding: 2.8px 8px; font-size: 8px; }
  .amt-l em { display: block; font-style: normal; font-size: 6.5px; color: #757575; }
  .amt-alt { background: ${LIGHT}; }
  .amt-head { background: ${BLUE}; color: #fff; font-weight: 700; }
  .amt-total { background: ${DEEP}; color: #fff; font-weight: 700; }
  .amt-head .amt-l em, .amt-total .amt-l em { color: #E0E0E0; }

  .box { border: 0.5px solid; border-radius: 6px; overflow: hidden; }
  .box > h3 { margin: 0; padding: 3px 8px; font-size: 8px; color: #fff; }
  .sum { display: flex; justify-content: space-between; padding: 2.8px 8px; font-size: 7.5px; color: #616161; }
  .sum span:last-child { font-weight: 700; color: #000; font-size: 8px; }
  .grand { display: flex; justify-content: space-between; padding: 4px 8px; color: #fff; font-weight: 700; font-size: 8.5px; }

  .ms { flex: 1; border: 0.5px solid; border-radius: 4px; padding: 4px 7px; }
  .ms-l { font-size: 6.5px; font-weight: 700; }
  .ms-d { font-size: 7.5px; margin-top: 1.5px; }

  .terms { border: 0.5px solid ${DIVIDER}; border-radius: 6px; overflow: hidden; background: #F8F9FA; }
  .terms > h2 { margin: 0; padding: 3px 8px; font-size: 7.5px; color: #fff; background: ${BLUE}; }
  .terms ol { margin: 0; padding: 4px 8px 4px 20px; }
  .terms li { font-size: 6.8px; color: #424242; margin-bottom: 1.5px; }

  .sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; }
  .sign b { font-size: 7.5px; }
  .rule { width: 110px; height: 0.5px; background: #9E9E9E; margin-top: 14px; }
  .note { font-size: 6.5px; color: #9E9E9E; text-align: center; }

  .banner { background: ${DEEP}; color: #fff; border-radius: 6px; padding: 7px 16px;
            display: flex; justify-content: space-between; align-items: center; }
  .banner b { font-size: 11.5px; letter-spacing: 0.8px; }
  .banner span { font-size: 14px; font-weight: 700; }
</style></head>
<body>

  <div class="bar">
    <div class="brand">
      ${logo ? `<img src="${esc(logo)}" alt="">` : ''}
      <div><h1>${esc(company)}</h1><p>${esc(unit)}</p></div>
    </div>
    <div>
      <div class="tag">QUOTATION</div>
      <div class="meta">Date: ${dfmt(q.quotationDate)}</div>
      ${ref ? `<div class="meta ref">Ref: ${esc(ref)}</div>` : ''}
    </div>
  </div>

  <div class="gap"></div>

  <div class="row">
    <div class="col card"><h2>Customer Details</h2><div class="card-body">
      ${kv('Name', q.customerName)}${kv('Mobile', q.mobileNumber)}${kv('Address', q.address)}
    </div></div>
    <div class="col card alt"><h2>Project Details</h2><div class="card-body">
      ${kv('Project', q.projectName)}${kv('Plot No.', q.plotNumber)}
      ${kv('Plot Size', `${nfmt(q.plotSize)} sq ft`)}${kv('Rate', `${inr(q.ratePerSqFt)} / sq ft`)}
      ${kv('Prepared by', q.createdByName)}
    </div></div>
  </div>

  <div class="gap"></div>

  <div class="box" style="border-color:#CE93D8;background:${LIGHT_PURPLE}">
    <h3 style="background:${PURPLE}">Payment Milestone Dates</h3>
    <div class="row" style="padding:5px;gap:4px">
      ${milestone('Booking Date', q.bookingDate, BLUE, LIGHT)}
      ${milestone('Down Payment Date', q.downPaymentDate, GREEN, LIGHT_GREEN)}
      ${milestone('Sale Deed Date', q.saleDeederDate, PURPLE, '#F3E5F5')}
    </div>
  </div>

  <div class="gap"></div>

  <div class="row">
    <div class="col" style="flex:5">
      <div class="sec">1. Plot Amount</div>
      <div class="table">
        ${amt('Description', 'Amount', { head: true })}
        ${amt('Total Plot Amount', q.totalPlotAmount, { sub: `${nfmt(q.plotSize)} sq ft × ${inr(q.ratePerSqFt)}` })}
        ${amt('Agreement (20%)', agreement, { alt: true })}
        ${amt('Booking', q.bookingAmount)}
      
        ${amt('Remaining', q.loanAmount)}
      </div>
      <div class="gap"></div>

      <div class="sec">2. Stamp Duty &amp; Registration</div>
      <div class="table">
        ${amt('Description', 'Amount', { head: true })}
        ${amt(`Stamp Duty (${Math.round(q.stampDutyPercent)}%)`, q.stampDutyAmount)}
        ${amt('Registration', q.registrationAmount, { alt: true })}
        ${amt('Stamp + Reg Total', stampReg, { total: true })}
      </div>
      <div class="gap"></div>

      <div class="sec">3. Administrative Charges</div>
      <div class="table">
        ${amt('Description', 'Amount', { head: true })}
        ${amt('Legal & 7/12', q.mutation)}
        ${amt('Maintenance (3 Years)', q.societyCharges)}
        ${amt('Admin Total', q.adminTotal, { total: true })}
      </div>
    </div>

    <div class="col" style="flex:4">
      <div class="box" style="border-color:#A5D6A7;background:${LIGHT_GREEN}">
        <h3 style="background:${GREEN}">Payment Summary</h3>
        ${sum('Plot Amount', q.totalPlotAmount)}
        ${sum('Agreement Amt (20%)', agreement, true)}
        ${sum('Stamp + Reg', stampReg)}
        ${sum('Admin Charges', q.adminTotal)}
        <div class="grand" style="background:${GREEN}"><span>GRAND TOTAL</span><span>${inr(q.finalTotalAmount)}</span></div>
      </div>
      <div class="gap"></div>

    
    </div>
  </div>

  <div class="gap"></div>

  <div class="banner"><b>FINAL TOTAL AMOUNT</b><span>${inr(q.finalTotalAmount)}</span></div>

  <div class="gap"></div>

  <div class="terms">
    <h2>TERMS &amp; CONDITIONS</h2>
    <ol>${TERMS.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
  </div>

  <div class="sign">
    <div><b>Customer Signature</b><div class="rule"></div></div>
    <div class="note">This is a computer-generated quotation.<br>All amounts are in Indian Rupees (₹).</div>
    <div style="text-align:right"><b>Authorized Signature</b><div class="rule"></div></div>
  </div>

</body></html>`;
}

/**
 * Open the print sheet. The window is written, then printed on load —
 * waiting for load matters when a logo is passed, or the sheet can open
 * before the image has decoded and print a gap where it should be.
 */
export function printQuotation(q, opts) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return false;           // pop-up blocked
  w.document.write(quotationHtml(q, opts));
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
  return true;
}

/** Preview without the print sheet — same document, no dialog. */
export function previewQuotation(q, opts) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return false;
  w.document.write(quotationHtml(q, opts));
  w.document.close();
  return true;
}