const puppeteer = require("puppeteer");
const Booking = require("../../models/Bookings/booking.model");
const moment = require("moment");
const { calculateTotal } = require("../common");

function generateInvoice(orderItems, invoiceNumber, bookingData, userDetails) {
  let subtotal = 0;
  // orderItems.forEach(item => {
  //     subtotal += item.price;
  // });

  // function calculateTotal(items) {
  //   return items.reduce((total, item) => {
  //     let quantity = parseInt(item.quantity.replace('+', ''), 10);
  //     let price = parseFloat(item.price.toString());
  //     return total + quantity * price;
  //   }, 0);
  // }

  subtotal = calculateTotal(orderItems);

  let formattedDate = moment(bookingData?.date).format("DD-MMM-YYYY");

  const userAddress = bookingData.addressDetails[0];

  const invoiceHTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice</title>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        margin: 0;
        padding: 0;
        color: #333;
        background-color: #f4f4f4;
      }
      .container {
        width: 80%;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ccc;
        background-color: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #eee;
      }
      .header .company-info {
        text-align: left;
        flex: 1;
      }
      .header .company-info h1 {
        margin: 0;
        font-size: 2em;
        color: #000;
      }
      .header .company-info p {
        margin: 5px 0;
        line-height: 1.6;
      }
      .header .logo {
        flex: 1;
        text-align: right;
      }
      .header .logo img {
        width: auto;
        height: 150px;
        max-width: 250px;
      }
      .details {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .details .info-block {
        flex: 1;
        margin-right: 20px;
      }
      .details .info-block:last-child {
        margin-right: 0;
        text-align: right;
      }
      .details .info-block h3 {
        margin-bottom: 10px;
        font-size: 1.2em;
        color: #c0392b;
      }
      .details .info-block p {
        margin: 5px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      table th,
      table td {
        border: 1px solid #ccc;
        padding: 12px;
        text-align: left;
      }
      table th {
        background-color: #c0392b !important;
        color: #fff;
      }
      .total {
        margin: 20px 0;
        padding: 15px;
        border: 1px solid #ddd;
        background-color: #f9f9f9;
      }

      .total-row {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 10px;
        font-size: 1em;
      }

      .total-row .label {
        width: 200px;
        text-align: right;
        padding-right: 20px;
        font-weight: 500;
      }

      .total-row .value {
        width: 150px;
        text-align: right;
      }

      .total-row.grand-total {
        border-top: 2px solid #333;
        padding-top: 10px;
        font-size: 1.2em;
        font-weight: bold;
        color: #c0392b;
      }

      .total-row.discount {
        color: #27ae60;
      }

      .footer {
        text-align: center;
        font-size: 0.9em;
        color: #777;
        border-top: 1px solid #ccc;
        padding-top: 10px;
      }
      .footer .customer-care {
        margin-top: 10px;
        font-size: 0.85em;
        color: #555;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="company-info">
          <h1>AC Doctor</h1>
          <p>
            Indore, Madhya Pradesh, 452001<br />
            Phone: +91-8959898989<br />
            Email: info@acdoctor.in
          </p>
        </div>
        <div class="logo">
          <img src="https://acdoctor-object-storage.s3.ap-south-1.amazonaws.com/dev/assets/acdoctor_logo.jpeg" alt="AC DOCTOR Logo" />
        </div>
      </div>

      <div class="details">
        <div class="info-block">
          <h3>Bill To:</h3>
          <p>
            ${userDetails?.name
              .trim()
              .split(/\s+/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}<br />
            Phone: ${userDetails?.countryCode}-${userDetails?.phoneNumber}
          </p>
        </div>
        <div class="info-block">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice ID:</strong> #${bookingData?.bookingId}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <!-- <th>GST (${bookingData.tax.gst}%)</th> -->
            <th>TAX (${bookingData.tax.gst}%)</th>
            <th>Total</th>
          </tr>
        </thead>
             <tbody>
  ${orderItems
    .map((item) => {
      const quantity = parseInt(item.quantity);
      const unitPrice = Number(item.price);
      const taxable = unitPrice * quantity;

      // const cgstAmount = (taxable * bookingData.tax.cgst) / 100;
      const gstAmount = (taxable * bookingData.tax.gst) / 100;

      const lineTotal = taxable + gstAmount;

      return `
        <tr>
          <td>${item.item}</td>
          <td>${quantity}</td>
          <td>₹${unitPrice.toFixed(2)}</td>
          <td>₹${gstAmount.toFixed(2)}</td>
          <td>₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("")}
</tbody>

      </table>

      <div class="total">
        <div class="total-row">
          <div class="label">Subtotal:</div>
          <div class="value">₹${subtotal.toFixed(2)}</div>
        </div>
        <div class="total-row">
          <!-- <div class="label">Tax (GST ${bookingData.tax.gst}%):</div> -->
          <div class="label">Tax (${bookingData.tax.gst}%):</div>
          <div class="value">₹${parseFloat(bookingData.tax.totalTax?.toString() || 0).toFixed(2)}</div>
        </div>
        ${
          bookingData.isCouponApplied
            ? `
        <div class="total-row discount">
          <div class="label">Discount (${bookingData.appliedCoupon?.couponCode}):</div>
          <div class="value">-₹${parseFloat(bookingData.discountAmount || 0).toFixed(2)}</div>
        </div>
        `
            : ""
        }
        <div class="total-row grand-total">
          <div class="label">Grand Total:</div>
          <div class="value">₹${parseFloat(bookingData.grandTotal?.toString() || 0).toFixed(2)}</div>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <div class="customer-care">
          <p>If you have any questions about this invoice, please contact:</p>
          <p>
            Customer Care, AC Doctor India Pvt Ltd<br />
            Phone: +91-8959898989<br />
            Email: info@acdoctor.in
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

  return invoiceHTML;
}

async function generateInvoicePDF(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // IMPORTANT for servers
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    // margin: {
    //   top: "10px",
    //   bottom: "10px",
    //   left: "10px",
    //   right: "10px",
    // },
  });

  await browser.close();
  return pdfBuffer;
}

async function generateBookingId(params) {
  const findBooking = await Booking.countDocuments();
}

async function generateInvoiceId(params) {
  let formattedDate = moment().format("DDMMYYYY");
  const findBooking = await Booking.countDocuments();

  const getFinalCount = findBooking + 1;
  const id = `ACD_INV${formattedDate}${getFinalCount}`;

  return id;
}

async function generatePdf() {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: blue; }
        </style>
      </head>
      <body>
        <h1>Hello, Puppeteer!</h1>
        <p>This PDF was generated from HTML content.</p>
      </body>
    </html>
  `;

  await page.setContent(htmlContent);

  await page.pdf({ path: "output.pdf", format: "A4" });

  await browser.close();
}

// generatePdf().catch(console.error);

module.exports = { generateInvoice, generateInvoiceId, generateInvoicePDF };
