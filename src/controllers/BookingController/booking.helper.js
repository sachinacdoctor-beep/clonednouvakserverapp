const { Types } = require('mongoose');
const Booking = require('../../models/Bookings/booking.model');
const Technician = require('../../models/Technician/technician.model');
const { STATUS, MESSAGES, CODES } = require('../../Config/responseConstants');
const { generateInvoiceId, generateInvoice } = require('../../Utils/htmlfile/invoice');
const puppeteer = require('puppeteer');
const { uploadToS3 } = require('../../Utils/s3');
const moment = require('moment');
const User = require('../../models/User/user.model');
const { calculateTotal } = require('../../Utils/common');

const bucketName = process.env.BUCKET_NAME;

exports.createOrderItemRequest = async (bookingId, orderItem, findBooking) => {

    const invoiceId = await generateInvoiceId()
    const findUser = await User.findOne({ _id: new Types.ObjectId(findBooking.user_id) })

    const invoiceHTML = generateInvoice(orderItem, invoiceId, findBooking || '', findUser);

    console.log('### invoiceHTML', invoiceHTML);

    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();

    // await page.setContent(invoiceHTML);
    // const pdfBuffer = await page.pdf({ format: 'A4' });
    // console.log('### pdf test', pdfBuffer );

    // await browser.close();

    // const uploadParams = {
    //     Bucket: bucketName,
    //     Key: `booking/invoices/invoice_${invoiceId}.pdf`,
    //     Body: pdfBuffer,
    //     ContentType: 'application/pdf',
    // };

    // const data = await uploadToS3(uploadParams);


    let subtotal = 0;


    subtotal = calculateTotal(orderItem);


    await Booking.updateOne(
        { _id: bookingId },
        {
            $set: {
                status: "PAYMENT_PENDING",
                orderItems: orderItem,
                invoiceUrl: 'https://acdoctor-service-booking-system.s3.ap-south-1.amazonaws.com/prod/sample.pdf',
                amount: subtotal.toFixed(2)
            },
            $setOnInsert: {
                invoiceId: invoiceId,
            },
        },
        { upsert: false }
    );



    // send this data to user and technician via sms

}

// exports.editOrderItemRequest = async (req, findBooking) => {
//     const { bookingId, orderItem } = req.body

//     const getInvoiceId = findBooking?.invoiceId || ''

//     const findUserData = await Booking.findOne({ _id: bookingId })
//     .populate

//     const invoiceHTML = generateInvoice(orderItem, getInvoiceId, findBooking?.bookingId || '');

//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();

//     await page.setContent(invoiceHTML);
//     const pdfBuffer = await page.pdf({ format: 'A4' });

//     await browser.close();

//     const uploadParams = {
//         Bucket: bucketName,
//         Key: `invoices/invoice_${getInvoiceId}.pdf`,
//         Body: pdfBuffer,
//         ContentType: 'application/pdf',
//     };

//     const data = await uploadToS3(uploadParams);

//     await Booking.updateOne({ _id: bookingId }, { orderItems: orderItem, invoiceUrl: data.Location });
//     // send this data to user and technician via sms
// }

function getOperationalWindow() {
  const now = new Date();

  const today8PM = new Date();
  today8PM.setHours(20, 0, 0, 0);

  let start;
  let end;

  if (now >= today8PM) {
    // After 8 PM → new shift started
    start = today8PM;
    end = new Date(today8PM);
    end.setDate(end.getDate() + 1);
  } else {
    // Before 8 PM → shift started yesterday
    start = new Date(today8PM);
    start.setDate(start.getDate() - 1);
    end = today8PM;
  }

  return { start, end };
}
