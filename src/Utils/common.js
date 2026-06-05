const axios = require("axios");
const qs = require("qs");

function generateRandom4Digit() {
  return JSON.stringify(Math.floor(1000 + Math.random() * 9000));
}

function getFolderPath(type) {
  let folder;
  let checkNumber = Number(type);
  console.log(typeof checkNumber);
  switch (checkNumber) {
    case 1:
      folder = "service/banner";
      break;
    case 2:
      folder = "partner/image";
      break;
    case 3:
      folder = "user";
      break;
    case 4:
      folder = "technician/document";
      break;
    case 5:
      folder = "technician/profile";
      break;
    case 6:
      folder = "order/invoice";
      break;
    case 7:
      folder = "homebanners";
      break;
    case 8:
      folder = "service/icons";
      break;
    case 9:
      folder = "products";
      break;
    case 10:
      folder = "tools/image";
      break;
    case 11:
      folder = "brand/logo";
      break;
    case 12:
      folder = "coupon";
      break;
    case 13:
      folder = "assets";
      break;
    default:
      throw new Error("Invalid type provided");
  }

  return `${process.env.BUCKET_FOLDER}/${folder}`;
}

function calculateTotal(items) {
  return items.reduce((total, item) => {
    let quantity = parseInt(item.quantity.replace("+", ""), 10);
    let price = parseFloat(item.price.toString());
    return total + quantity * price;
  }, 0);
}

async function sendOTPSMS(phone, OTP) {

  const payload = {
    template_id: process.env.MSG91_TEMPLATE_ID,
    short_url: "0",
    realTimeResponse: "1",
    recipients: [
      {
        mobiles: `91${phone}`,
        var: OTP, // OTP variable used in DLT template
      },
    ],
  };

  try {
    const response = await axios.post(
      `${process.env.MSG91_URL}/api/v5/flow`,
      payload,
      {
        headers: {
          accept: "application/json",
          authkey: process.env.MSG91_AUTH_KEY,
          "content-type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("MSG91 Error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  generateRandom4Digit,
  getFolderPath,
  calculateTotal,
  sendOTPSMS,
};
