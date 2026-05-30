const { Types } = require("mongoose");
const Booking = require("../../models/Bookings/booking.model");
const Address = require("../../models/User/address.model");
const Technician = require("../../models/Technician/technician.model");
const TaxConfig = require("../../models/Taxation/TaxConfig.model");
const { STATUS, MESSAGES, CODES } = require("../../Config/responseConstants");
const {
  generateInvoiceId,
  generateInvoice,
  generateInvoicePDF,
} = require("../../Utils/htmlfile/invoice");
const puppeteer = require("puppeteer");
const { uploadToS3 } = require("../../Utils/s3");
const moment = require("moment");
const bookingHelperController = require("../BookingController/booking.helper");
const Service = require("../../models/Service/service.model");
const User = require("../../models/User/user.model");
const Notification = require("../../models/Notifications/notification.model");
const { sendPushNotification } = require("../../Utils/notification");
const { calculateTotal } = require("../../Utils/common");
const {
  creditPointsForCompletedACs,
} = require("../../Helper/creditPointContractor");
const Enquiry = require("../../models/Enquiry/enquiry.model");
const ALLOWED_STATUSES = [
  "ASSIGNMENT_PENDING",
  "TECHNICIAN_ASSIGNED",
  "PAYMENT_PENDING",
  "PAID",
  "IN_PROGRESS",
  "COMPLETE",
  "CANCELLED",
  "JOB_PENDING",
];

const TECHNICIAN_ALLOWED_STATUSES = [
  "IN_PROGRESS",
  "COMPLETE",
  "CANCELLED",
  "JOB_PENDING",
];

const VALID_TRANSITIONS = {
  TECHNICIAN_ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETE", "CANCELLED", "JOB_PENDING"],
  JOB_PENDING: ["IN_PROGRESS", "CANCELLED", "COMPLETE"],
};

// exports.createBooking = async (req, res) => {
//   let formattedDate = moment().format("DDMMYYYY");

//   try {
//     const {
//       user_id,
//       serviceDetails,
//       addressId,
//       slot,
//       date,
//       amount,
//       order_id,
//       name,
//       type,
//       subType,
//     } = req.body;

//     if (!user_id) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.USER_ID_REQUIRED,
//       });
//     }

//     if (!name) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.NAME_REQUIRED_FOR_BOOKING,
//       });
//     }

//     if (!addressId) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.ADDRESS_ID_REQUIRED,
//       });
//     }
//     if (!slot) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.SLOT_REQUIRED,
//       });
//     }
//     if (!date || isNaN(new Date(date).getTime())) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.INVALID_DATE,
//       });
//     }

//     if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.BOOKING_AMOUNT,
//       });
//     }

//     const address = await Address.findOne({ _id: addressId });
//     if (!address) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.VALID_ADDRESS_ID_REQUIRED,
//       });
//     }

//     const countTotalBooking = await Booking.countDocuments();
//     const bookingId = `ACDOCBK${formattedDate}-${countTotalBooking + 1}`;

//     let orderItem = [];
//     for (const item of serviceDetails) {
//       const findServices = await Service.findOne({
//         _id: item.service_id,
//       }).select("name");
//       let obj = {};
//       obj.item = `${findServices?.name} ${item?.acType}`.trim();
//       obj.quantity = item.quantity;
//       obj.price = 0;
//       orderItem.push(obj);
//     }

//     const newBooking = new Booking({
//       user_id,
//       bookingId,
//       serviceDetails,
//       addressDetails: address,
//       slot,
//       date: new Date(date),
//       amount: amount.toString(),
//       order_id: order_id || "",
//       orderItems: orderItem,
//     });

//     // Save booking
//     const savedBooking = await newBooking.save();

//     // send push notification
//     const userToken = await User.findOne({ _id: user_id }).select(
//       "deviceToken",
//     );
//     if (userToken) {
//       if (!userToken.name) {
//         await User.updateOne({ _id: user_id }, { name });
//       }
//       if (userToken.deviceToken) {
//         if (userToken.deviceToken != "") {
//           const registrationToken = userToken.deviceToken;
//           const title = "📦 Booking";
//           const body = MESSAGES.BOOKING_CREATE_NOTIFICATION;
//           await sendPushNotification(registrationToken, title, body);

//           await Notification.create({
//             userId: user_id,
//             title,
//             text: MESSAGES.BOOKING_CREATE_NOTIFICATION,
//           });
//         }
//       }
//     }

//     return res.status(201).json({
//       status: STATUS.SUCCESS,
//       message: MESSAGES.BOOKING_CREATED,
//     });
//   } catch (error) {
//     console.error("Error creating booking:", error);
//     return res.status(500).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.SERVER_ERROR,
//       error: error.message,
//     });
//   }
// };
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

exports.createBooking = async (req, res) => {
  let formattedDate = moment().format("DDMMYYYY");

  try {
    const {
      user_id,
      serviceDetails,
      addressId,
      slot,
      date,
      amount,
      order_id,
      name,
      type,
      subType,
    } = req.body;

    if (!user_id) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_ID_REQUIRED,
      });
    }

    if (!name) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.NAME_REQUIRED_FOR_BOOKING,
      });
    }

    if (!addressId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.ADDRESS_ID_REQUIRED,
      });
    }
    if (!slot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.SLOT_REQUIRED,
      });
    }
    if (!date || isNaN(new Date(date).getTime())) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.INVALID_DATE,
      });
    }

    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.BOOKING_AMOUNT,
      });
    }

    const address = await Address.findOne({ _id: addressId });
    if (!address) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.VALID_ADDRESS_ID_REQUIRED,
      });
    }

    const enquiry = new Enquiry({
      user_id,
      details: {
        serviceDetails: serviceDetails.map((service) => ({
          service_id: service.service_id,
          items: [
            {
              acType: service.acType || "",
              quantity: service.quantity || 1,
            },
          ],
        })),
      },
      type: type || "BOOKING",
      subType,
      addressDetails: address,
      schedule: {
        slot,
        date: new Date(date),
      },
      status: "BOOKING_CREATED",
    });

    const savedEnquiry = await enquiry.save();

    const countTotalBooking = await Booking.countDocuments();
    const bookingId = `ACDOCBK${formattedDate}-${countTotalBooking + 1}`;

    // let orderItem = [];
    // for (const item of serviceDetails) {
    //   const findServices = await Service.findOne({
    //     _id: item.service_id,
    //   }).select("name");
    //   let obj = {};
    //   obj.item = `${findServices?.name} ${item?.acType}`.trim();
    //   obj.quantity = item.quantity;
    //   obj.price = 0;
    //   orderItem.push(obj);
    // }

    // ---------- CREATE ORDER ITEMS ----------
    const orderItem = await Promise.all(
      serviceDetails.map(async (item) => {
        const service = await Service.findById(item.service_id).select("name");

        return {
          item: `${service?.name || ""} ${item?.acType || ""}`.trim(),
          quantity: item.quantity,
          price: 0,
        };
      }),
    );

    const istDate = new Date(date).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const newBooking = new Booking({
      user_id,
      bookingId,
      serviceDetails,
      addressDetails: address,
      slot,
      date: new Date(istDate),
      amount: amount.toString(),
      order_id: order_id || "",
      orderItems: orderItem,
      enquiryId: savedEnquiry._id,
    });

    const savedBooking = await newBooking.save();

    await Enquiry.findByIdAndUpdate(savedEnquiry._id, {
      bookingId: savedBooking._id,
    });

    const userToken = await User.findOne({ _id: user_id }).select(
      "deviceToken",
    );
    // if (userToken) {
    //   if (!userToken.name) {
    //     await User.updateOne({ _id: user_id }, { name });
    //   }
    //   if (userToken.deviceToken) {
    //     if (userToken.deviceToken != "") {
    //       const registrationToken = userToken.deviceToken;
    //       const title = "📦 Booking";
    //       const body = MESSAGES.BOOKING_CREATE_NOTIFICATION;
    //       await sendPushNotification(registrationToken, title, body);

    //       await Notification.create({
    //         userId: user_id,
    //         title,
    //         text: MESSAGES.BOOKING_CREATE_NOTIFICATION,
    //       });
    //     }
    //   }
    // }

    const title = "📦 Booking request recieved";
    const body = MESSAGES.BOOKING_CREATE_NOTIFICATION;

    // Always create notification
    await Notification.create({
      title: title,
      userId: user_id,
      text: body,
    });

    // Send push notification only if device token exists
    if (userToken?.deviceToken?.trim()) {
      await sendPushNotification(userToken.deviceToken, title, body);
    }

    return res.status(201).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.BOOKING_CREATED,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.singleBookingGetById = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId || bookingId === "" || bookingId == null) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.BOOKING_ID_REQUIRED,
    });
  }

  try {
    const booking = await Booking.aggregate([
      {
        $match: { _id: new Types.ObjectId(bookingId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$serviceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "serviceDetails.service_data",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                icon: 1,
                category: 1,
                key: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$serviceDetails.service_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "servicereports", // collection name (IMPORTANT: lowercase plural)
          localField: "_id",
          foreignField: "job",
          as: "serviceReport",
        },
      },
      {
        $unwind: {
          path: "$serviceReport",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //     $addFields: {
      //         "serviceDetails.service_data": {
      //             _id: "$serviceDetails.service_data._id",
      //             name: "$serviceDetails.service_data.name",
      //             icon: "$serviceDetails.service_data.icon",
      //             category: "$serviceDetails.service_data.category",
      //             key: "$serviceDetails.service_data.key",
      //         },
      //     },
      // },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          address: { $first: "$address" },
          status: { $first: "$status" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          user: { $first: "$user_info" },
          technician: { $first: "$technician_data" },
          amount: { $first: { $toDouble: "$amount" } },
          date: { $first: "$date" },
          invoiceUrl: { $first: "$invoiceUrl" },
          bookingId: { $first: "$bookingId" },
          invoiceId: { $first: "$invoiceId" },
          slot: { $first: "$slot" },
          order_id: { $first: "$order_id" },
          addressDetails: { $first: "$addressDetails" },
          tax: {
            $first: {
              gst: "$tax.gst",
              cgst: "$tax.cgst",
              sgst: "$tax.sgst",
              taxableAmount: { $toDouble: "$tax.taxableAmount" },
              cgstAmount: { $toDouble: "$tax.cgstAmount" },
              sgstAmount: { $toDouble: "$tax.sgstAmount" },
              totalTax: { $toDouble: "$tax.totalTax" },
            },
          },
          grandTotal: { $first: { $toDouble: "$grandTotal" } },
          cancelReason: { $first: "$cancelReason" },
          serviceDetails: {
            $push: {
              service_id: "$serviceDetails.service_id",
              serviceType: "$serviceDetails.serviceType",
              quantity: "$serviceDetails.quantity",
              acType: "$serviceDetails.acType",
              place: "$serviceDetails.place",
              comment: "$serviceDetails.comment",
              otherService: { $ifNull: ["$serviceDetails.otherService", ""] },
              services: "$serviceDetails.services",
              service_data: "$serviceDetails.service_data",
            },
          },
          serviceReport: { $first: "$serviceReport" },
          orderItems: {
            $first: {
              $map: {
                input: "$orderItems",
                as: "item",
                in: {
                  _id: "$$item._id",
                  item: "$$item.item",
                  quantity: "$$item.quantity",
                  price: { $toDouble: "$$item.price" },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          address: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: "$user._id",
            name: "$user.name",
            isActive: "$user.isActive",
            phoneNumber: "$user.phoneNumber",
            countryCode: "$user.countryCode",
            type: "$user.type",
          },
          serviceReport: 1,
          technician: { $ifNull: ["$technician", {}] },
          amount: 1,
          date: 1,
          invoiceUrl: 1,
          bookingId: 1,
          invoiceId: 1,
          slot: 1,
          order_id: 1,
          serviceDetails: 1,
          orderItems: 1,
          addressDetails: 1,
          tax: 1,
          grandTotal: 1,
          cancelReason: 1,
        },
      },
    ]);

    const service = await Service.findOne({
      _id: booking[0].serviceDetails[0].service_id,
    });
    booking[0].service = service || {};

    if (booking.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: booking[0],
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.BOOKING_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error("Error finding booking:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userBookingList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || "";
  // const sortField = req.query.sortField || 'date';
  // const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;

  const userId = req.params.userId;

  if (!userId) {
    return res.status(200).json({
      status: STATUS.FAIL,
      message: MESSAGES.USER_ID_REQUIRED,
    });
  }
  const offset = (page - 1) * limit;
  try {
    const bookings = await Booking.aggregate([
      { $match: { user_id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service_info",
        },
      },
      {
        $unwind: {
          path: "$service_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: search, $options: "i" } }],
        },
      },
      {
        $sort: { [sortField]: sortOrder },
      },
      {
        $skip: offset,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          address: 1,
          status: 1,
          createdAt: 1,
          user: {
            id: { $ifNull: ["$user_info._id", ""] },
            name: { $ifNull: ["$user_info.name", ""] },
            phoneNumber: { $ifNull: ["$user_info.phoneNumber", ""] },
            createdAt: { $ifNull: ["$user_info.createdAt", null] },
          },
          service: {
            id: { $ifNull: ["$service_info._id", ""] },
            name: { $ifNull: ["$service_info.name", ""] },
          },
          technicianName: { $ifNull: ["$technician_data", {}] },
          date: 1,
          amount: { $toDouble: "$amount" },
          order_id: 1,
          bookingId: 1,
          invoiceId: 1,
          invoiceUrl: 1,
          updatedAt: 1,
          slot: 1,
        },
      },
    ]);

    const totalBookings = await Booking.aggregate([
      { $match: { user_id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service_info",
        },
      },
      {
        $unwind: {
          path: "$service_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: search, $options: "i" } }],
        },
      },
      {
        $count: "total",
      },
    ]);

    const totalCount = totalBookings.length ? totalBookings[0].total : 0;

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: bookings || [],
      count: totalCount,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching booking list:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.editBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { serviceDetails, addressId, slot, date, amount } = req.body;

    // Validate the required fields
    if (!bookingId) {
      return res
        .status(CODES.BAD_REQUEST)
        .json({ status: STATUS.FAIL, message: MESSAGES.MISSING_BOOKING_ID });
    }

    if (!addressId) {
      return res
        .status(CODES.BAD_REQUEST)
        .json({ status: STATUS.FAIL, message: MESSAGES.ADDRESS_ID_REQUIRED });
    }
    if (!slot) {
      return res
        .status(CODES.BAD_REQUEST)
        .json({ status: STATUS.FAIL, message: MESSAGES.SLOT_REQUIRED });
    }

    // Check if booking exists
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      return res
        .status(CODES.SUCCESS)
        .json({ status: STATUS.FAIL, message: MESSAGES.BOOKING_NOT_FOUND });
    }

    // Check if address exists
    const address = await Address.findOne({ _id: addressId });
    if (!address) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.VALID_ADDRESS_ID_REQUIRED,
      });
    }

    // Update booking fields

    existingBooking.serviceDetails =
      serviceDetails || existingBooking.serviceDetails;
    existingBooking.addressDetails = address;
    existingBooking.slot = slot;
    existingBooking.date = new Date(date);
    existingBooking.amount = amount.toString();

    const updatedBooking = await existingBooking.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.BOOKING_UPDATED,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.rescheduleBooking = async (req, res) => {
  try {
    const { bookingId, newDate, newSlot, reason } = req.body;
    const userId = req.user._id;

    // Validation
    if (!bookingId || !newDate || !newSlot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Booking id, new date and new slot are required",
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Booking not found",
      });
    }

    // Authorization check
    if (booking.user_id.toString() !== userId.toString()) {
      return res.status(CODES.FORBIDDEN).json({
        status: STATUS.FAIL,
        message: "You are not allowed to reschedule this booking",
      });
    }

    // Allow only specific statuses
    // const allowedStatuses = ["BOOKED", "TECHNICIAN_ASSIGNED"];

    // if (!allowedStatuses.includes(booking.status)) {
    //   return res.status(CODES.BAD_REQUEST).json({
    //     status: STATUS.FAIL,
    //     message: `Booking cannot be rescheduled when status is ${booking.status}`,
    //   });
    // }

    // // Check if already rescheduled
    // if (booking.rescheduled) {
    //   return res.status(CODES.BAD_REQUEST).json({
    //     status: STATUS.FAIL,
    //     message:
    //       "This booking has already been rescheduled once and cannot be modified again.",
    //   });
    // }

    // Allow only before technician assignment
    if (!["BOOKED", "RESCHEDULED"].includes(booking.status)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Booking can only be rescheduled before a technician is assigned",
      });
    }

    // Optional validations (recommended)
    const validSlots = ["FIRST_HALF", "SECOND_HALF"];
    if (!validSlots.includes(newSlot)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Invalid slot selected",
      });
    }

    if (new Date(newDate) < new Date()) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Reschedule date cannot be in the past",
      });
    }

    const newDateObj = new Date(newDate);
    const existingDateObj = new Date(booking.date);

    // Normalize to date-only (ignore time)
    const newDateOnly = newDateObj.toISOString().split("T")[0];
    const existingDateOnly = existingDateObj.toISOString().split("T")[0];

    // Block same date + same slot
    if (newDateOnly === existingDateOnly && booking.slot === newSlot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Booking is already scheduled for the selected date and time slot. Please choose a different slot.",
      });
    }

    booking.date = new Date(newDate);
    booking.slot = newSlot;
    booking.rescheduled = true;
    booking.status = "RESCHEDULED";
    booking.rescheduleReason = reason || "";
    // booking.rescheduledAt = new Date();

    await booking.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Booking rescheduled successfully",
      data: {
        _id: booking._id,
        user_id: booking.user_id,
        bookingId: booking.bookingId,
        enquiryId: booking.enquiryId,
        date: booking.date,
        status: booking.status,
        rescheduled: booking.rescheduled,
        rescheduleReason: booking.rescheduleReason,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.bookingList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status ? req.query.status.split(",") : [];
  const search = req.query.search || "";
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;
  const startDate = req?.query?.startDate
    ? new Date(req.query.startDate)
    : null;
  const endDate = req?.query?.endDate ? new Date(req.query.endDate) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const filters = req.query.filters ? req.query.filters.split(",") : [];

  const matchConditions = { $and: [] };

  if (search) {
    matchConditions.$and.push(
      {
        $or: [
          { bookingId: { $regex: search, $options: "i" } },
          { "user_info.phoneNumber": { $regex: search, $options: "i" } },
          { "technician_data.phoneNumber": { $regex: search, $options: "i" } },
          { "technician_data.name": { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { "user_info.name": { $regex: search, $options: "i" } },
          { "technician_data.status": { $regex: search, $options: "i" } },
        ],
      },
      // {
      //   $or: [
      //     { status: { $in: status } },
      //     {
      //       $and: [
      //         { status: { $in: ["BOOKED", "IN_PROGRESS"] } },
      //         { $expr: { $eq: [status.length, 0] } },
      //       ],
      //     },
      //   ],
      // },
    );
  }

  if (status.length) {
    matchConditions.$and.push({
      status: { $in: status },
    });
  }

  if (startDate && endDate) {
    matchConditions.$and.push({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  } else if (startDate) {
    matchConditions.$and.push({
      date: {
        $gte: startDate,
      },
    });
  } else if (endDate) {
    matchConditions.$and.push({
      date: {
        $lte: endDate,
      },
    });
  }

  const offset = (page - 1) * limit;

  let filterConditions = [];

  filters.forEach((filter) => {
    switch (filter) {
      case "TODAYS_ENQUIRES":
        filterConditions.push({
          $or: [
            // 1. Yesterday SECOND_HALF only
            {
              date: { $gte: yesterday, $lt: today },
              slot: "SECOND_HALF",
              status: { $in: ["BOOKED", "ASSIGNMENT_PENDING"] },
            },

            // 2. Today FULL DAY (both slots)
            {
              date: { $gte: today, $lte: endOfToday },
              status: { $in: ["BOOKED", "ASSIGNMENT_PENDING"] },
            },

            // 3. Tomorrow FULL DAY (both slots)
            {
              date: { $gte: tomorrow, $lte: endOfTomorrow },
              status: { $in: ["BOOKED", "ASSIGNMENT_PENDING"] },
            },
          ],
        });
        break;

      case "OLD_ENQUIRES":
        filterConditions.push({
          date: { $lt: today },
          status: { $in: ["BOOKED", "ASSIGNMENT_PENDING"] },
        });
        break;

      case "TECHNICIAN_ASSIGNED":
        filterConditions.push({
          status: "TECHNICIAN_ASSIGNED",
          // date: { $gte: today, $lte: endOfToday },
        });
        break;

      case "IN_PROGRESS":
        filterConditions.push({
          status: "IN_PROGRESS",
          // date: { $gte: today, $lte: endOfToday },
        });
        break;

      case "PENDING_JOBS":
        filterConditions.push({
          status: "JOB_PENDING",
          // date: { $lt: today },
          // status: { $in: ["IN_PROGRESS", "TECHNICIAN_ASSIGNED"] },
        });
        break;

      // This logic fetches completed bookings within a recent time window:
      // - On Monday: includes weekend data → Saturday (00:00) to end of today
      // - On other days: includes yesterday → yesterday (00:00) to end of today
      case "COMPLETED":
        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday

        const startDateForCompleted = new Date(currentDate);

        if (dayOfWeek === 1) {
          // Monday → go back 2 days (Saturday)
          startDateForCompleted.setDate(currentDate.getDate() - 2);
        } else {
          // Any other day → yesterday
          startDateForCompleted.setDate(currentDate.getDate() - 1);
        }

        startDateForCompleted.setHours(0, 0, 0, 0);

        filterConditions.push({
          status: "COMPLETE",
          date: { $gte: startDateForCompleted, $lte: endOfToday },
        });
        break;

      case "PAYMENT_PENDING":
        filterConditions.push({
          status: "PAYMENT_PENDING",
          // date: { $gte: today, $lte: endOfToday },
        });
        break;

      case "PAID":
        filterConditions.push({
          status: "PAID",
          // date: { $gte: today, $lte: endOfToday },
        });
        break;

      case "TODAYS_CANCELLED":
        filterConditions.push({
          status: "CANCELLED",
          date: { $gte: today, $lte: endOfToday },
        });
        break;

      case "OLD_CANCELLED":
        filterConditions.push({
          status: "CANCELLED",
          date: { $lt: today },
        });
        break;

      case "CANCELLED":
        filterConditions.push({
          status: "CANCELLED",
          // date: { $gte: today, $lte: endOfToday },
        });
        break;

      default:
      // filterCondition = {};
    }
  });

  // if (Object.keys(filterCondition).length) {
  //   matchConditions.$and.push(filterCondition);
  // }

  if (filterConditions.length) {
    matchConditions.$and.push({
      $or: filterConditions,
    });
  }

  const finalMatch = matchConditions.$and.length > 0 ? matchConditions : {};

  try {
    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $lookup: {
      //     from: "services",
      //     localField: "service_id",
      //     foreignField: "_id",
      //     as: "service_info",
      //   },
      // },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service_info",
        },
      },
      // {
      //   $unwind: {
      //     path: "$service_info",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: finalMatch,
      },
      {
        $sort: { [sortField]: sortOrder },
      },
      {
        $skip: offset,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          address: 1,
          status: 1,
          createdAt: 1,
          user: {
            id: { $ifNull: ["$user_info._id", ""] },
            name: { $ifNull: ["$user_info.name", ""] },
            phoneNumber: { $ifNull: ["$user_info.phoneNumber", ""] },
            createdAt: { $ifNull: ["$user_info.createdAt", null] },
          },
          // service: {
          //   id: { $ifNull: ["$service_info._id", ""] },
          //   name: { $ifNull: ["$service_info.name", ""] },
          // },
          services: {
            $map: {
              input: "$serviceDetails",
              as: "sd",
              in: {
                service_id: "$$sd.service_id",
                serviceType: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$service_info",
                              as: "s",
                              cond: { $eq: ["$$s._id", "$$sd.service_id"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: { $ifNull: ["$$matched.name", ""] },
                  },
                },
              },
            },
          },
          technicianName: { $ifNull: ["$technician_data", {}] },
          date: 1,
          amount: { $toDouble: "$amount" },
          grandTotal: { $toDouble: "$grandTotal" },
          order_id: 1,
          bookingId: 1,
          updatedAt: 1,
          slot: 1,
          cancelReason: 1,
        },
      },
    ]);

    const totalBookings = await Booking.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "service_id",
          foreignField: "_id",
          as: "service_info",
        },
      },
      {
        $unwind: {
          path: "$service_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $match: finalMatch,
      },
      {
        $count: "total",
      },
    ]);

    const totalCount = totalBookings.length ? totalBookings[0].total : 0;
    const totalRecords = totalCount;

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: bookings || [],
      count: totalCount,
      pagination: {
        totalCount,
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching booking list:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.addOrderItem = async (req, res) => {
  try {
    const { bookingId, orderItem } = req.body;
    console.log("order items: ", orderItem);

    if (!bookingId || bookingId == "") {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.BOOKING_ID_REQUIRED,
      });
    }

    const booking = await Booking.findOne({ _id: bookingId });

    if (!booking) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.BOOKING_NOT_FOUND,
      });
    }

    // Clean order items (remove _id if present)
    const cleanedOrderItems = orderItem.map(({ _id, ...rest }) => rest);

    // 1. Calculate subtotal from order items
    const subtotal = parseFloat(
      cleanedOrderItems.reduce((total, item) => {
        return total + parseFloat(item.price) * parseInt(item.quantity);
      }, 0).toFixed(2)
    );

    // 2. Get active tax config and calculate grandTotal
    const taxConfig = await TaxConfig.findOne({ isActive: true });

    let taxSnapshot = {};
    let grandTotal = subtotal;

    if (taxConfig) {
      const cgstAmount = parseFloat(((subtotal * taxConfig.cgst) / 100).toFixed(2));
      const sgstAmount = parseFloat(((subtotal * taxConfig.sgst) / 100).toFixed(2));
      const gstAmount = parseFloat(((subtotal * taxConfig.gst) / 100).toFixed(2));

      taxSnapshot = {
        gst: taxConfig.gst,
        cgst: taxConfig.cgst,
        sgst: taxConfig.sgst,
        taxableAmount: subtotal,
        cgstAmount,
        sgstAmount,
        totalTax: gstAmount,
      };

      grandTotal = parseFloat((subtotal + taxSnapshot.totalTax).toFixed(2));
    }

    // 3. Handle coupon discount if applied
    let updateData = {
      orderItems: cleanedOrderItems,
      amount: subtotal,
      tax: taxSnapshot,
      grandTotal,
      invoiceId: booking.bookingId,
    };

    // If coupon is already applied, recalculate discount with new totals
    if (booking.isCouponApplied && booking.appliedCoupon) {
      const couponDiscount = booking.appliedCoupon.discount || 0;
      
      // Calculate new discount amount based on updated grandTotal
      const discountAmount = parseFloat(((grandTotal * couponDiscount) / 100).toFixed(2));
      
      // Validate discount does not exceed total
      if (discountAmount <= grandTotal) {
        const discountedTotal = parseFloat((grandTotal - discountAmount).toFixed(2));
        
        updateData = {
          ...updateData,
          isCouponApplied: true,
          originalTotal: grandTotal,
          discountAmount: discountAmount,
          discountedTotal: discountedTotal,
          grandTotal: discountedTotal
        };
      } else {
        // If discount exceeds new total, reset coupon
        updateData = {
          ...updateData,
          isCouponApplied: false,
          originalTotal: 0,
          discountAmount: 0,
          discountedTotal: 0,
          appliedCoupon: {
            couponCode: "",
            discount: 0,
            minValue: 0
          }
        };
      }
    }

    // 4. Update booking with all calculated values
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: updateData },
      { new: true }
    );

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.ITEM_ADDED,
      data: {
        bookingId: updatedBooking._id,
        subtotal: subtotal,
        tax: taxSnapshot,
        grandTotal: grandTotal,
        isCouponApplied: updatedBooking.isCouponApplied,
        discountAmount: updatedBooking.discountAmount,
        discountedTotal: updatedBooking.discountedTotal,
        appliedCoupon: updatedBooking.appliedCoupon
      }
    });
  } catch (error) {
    console.error("Error adding order items:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: "Error adding order items",
      error: error.message
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.generateInvoice = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId || bookingId == "") {
    return res.status(400).json({
      status: STATUS.FAIL,
      message: MESSAGES.BOOKING_ID_REQUIRED,
    });
  }

  const booking = await Booking.findById(bookingId).populate(
    "user_id",
    "name phoneNumber countryCode",
  );

  if (!booking) {
    return res.status(400).json({
      status: STATUS.FAIL,
      message: MESSAGES.BOOKING_NOT_FOUND,
    });
  }

  if (!booking.orderItems || booking.orderItems.length === 0) {
    return res.status(400).json({
      status: STATUS.FAIL,
      message: "Order item required",
    });
  }

  // normalize (MongoDB) Decimal128 → number
  const orderItems = booking.orderItems.map((item) => ({
    ...item.toObject(),
    price: parseFloat(item.price.toString()),
  }));

  // 1 Generate HTML
  const invoiceHTML = generateInvoice(
    orderItems,
    booking.invoiceId,
    booking,
    booking.user_id,
  );

  // 2 Convert HTML → PDF
  const pdfBuffer = await generateInvoicePDF(invoiceHTML);

  // 3 Upload PDF → S3
  const fileName = `invoice_${booking.invoiceId}.pdf`;
  const s3Path = `invoices/${fileName}`;

  const uploadParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: s3Path,
    Body: pdfBuffer,
    ContentType: "application/pdf",
    // ACL: "public-read", // optional
  };

  const s3Response = await uploadToS3(uploadParams);

  // 4 Save invoice URL in booking
  booking.invoiceUrl = s3Response.Location;
  booking.status = "PAYMENT_PENDING";
  await booking.save();

  // 5 Send notification (existing logic)
  const userToken = await User.findById(booking.user_id).select("deviceToken");

  if (userToken) {
    if (userToken.deviceToken) {
      if (userToken.deviceToken != "") {
        const registrationToken = userToken.deviceToken;
        const title = "🧾 Invoice Generated";
        const body = MESSAGES.BOOKING_CREATE_NOTIFICATION;
        await sendPushNotification(registrationToken, title, body);

        await Notification.create({
          userId: booking.user_id,
          title,
          text: MESSAGES.BOOKING_CREATE_NOTIFICATION,
        });
      }
    }
  }

  return res.status(CODES.SUCCESS).json({
    status: STATUS.SUCCESS,
    url: s3Response.Location,
    message: "Invoice generated successfully",
  });
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.technicianAssign = async (req, res) => {
  const { bookingId, technicianId } = req.body;

  if (!bookingId && !technicianId) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: MESSAGES.BOOKING_ID_AND_TECHNICIAN_ID_REQUIRED,
    });
  }

  const booking = await Booking.findOne({ _id: bookingId });

  if (!booking) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: MESSAGES.BOOKING_NOT_FOUND,
    });
  }

  // updating status
  await Booking.updateOne(
    { _id: booking._id },
    { assigned_to: technicianId, status: "TECHNICIAN_ASSIGNED" },
  );

  // send push notification
  const userToken = await User.findOne({ _id: booking.user_id }).select(
    "deviceToken",
  );
  // await Notification.create({
  //   userId: booking.user_id,
  //   text: MESSAGES.BOOKING_TECHNICIAN_ASSIGNED,
  // });
  if (userToken) {
    if (userToken.deviceToken) {
      if (userToken.deviceToken != "") {
        const registrationToken = userToken.deviceToken;
        const title = "👷 Technician Assigned";
        const body = MESSAGES.BOOKING_TECHNICIAN_ASSIGNED;
        await sendPushNotification(registrationToken, title, body);

        await Notification.create({
          userId: booking.user_id,
          title,
          text: MESSAGES.BOOKING_TECHNICIAN_ASSIGNED,
        });
      }
    }
  }

  return res.status(CODES.SUCCESS).json({
    status: STATUS.SUCCESS,
    message: MESSAGES.TECHNICIAN_ASSIGNED_SUCCESS,
  });
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.bookingStatusManage = async (req, res) => {
  const { bookingId, status } = req.body;
  
  // console.log("booking status: ----> ", status)

  if (!bookingId || !status) {
    return res.send({
      status: false,
      message: "Booking id and status are required",
    });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).send({
      status: false,
      message: `Invalid status`,
    });
  }
  const booking = await Booking.findOne({ _id: bookingId });

  if (!booking) {
    return res.send({
      status: false,
      message: "Booking not found",
    });
  }

  try {
    // update the booking
    await Booking.updateOne({ _id: bookingId }, { status: status });

    const statusMap = {
      ASSIGNED: "SCHEDULED",
      IN_PROGRESS: "IN_PROGRESS",
      HOLD: "HOLD",
      PAYMENT_PENDING: "PAYMENT_PENDING",
      COMPLETE: "COMPLETED",
      CANCELLED: "CANCELLED",
      PAID: "PAID",
      JOB_PENDING: "HOLD"
    };

    const enquiryStatus = statusMap[status];

    if (enquiryStatus) {
      await Enquiry.updateOne({ bookingId }, { status: enquiryStatus });
    }

    if (ALLOWED_STATUSES.includes("COMPLETE")) {
      // updating status
      await Technician.updateOne(
        { _id: booking.assigned_to },
        { status: "AVAILABLE" },
      );

      await creditPointsForCompletedACs(bookingId);

      // send push notification
      const userToken = await User.findOne({ _id: booking.user_id }).select(
        "deviceToken",
      );

      if (userToken?.deviceToken) {
        if (userToken.deviceToken != "") {
          const registrationToken = userToken.deviceToken;
          const title = "📦 Booking Completed";
          const body = MESSAGES.BOOKING_COMPLETED;
          await sendPushNotification(registrationToken, title, body);

          await Notification.create({
            userId: booking.user_id,
            title,
            text: MESSAGES.BOOKING_COMPLETED,
          });
        }
      }
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Booking status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.mobileBookingList = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const userId = req.params.userId;
    const search = req.params.search;

    if (!userId) {
      return res.status(200).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_ID_REQUIRED,
      });
    }

    // const bookings = await Booking.aggregate([
    //     { $match: { user_id: new Types.ObjectId(userId) } },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "user_id",
    //             foreignField: "_id",
    //             as: "userDetails",
    //         },
    //     },
    //     { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    //     { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
    //     {
    //         $lookup: {
    //             from: "services",
    //             localField: "serviceDetails.service_id",
    //             foreignField: "_id",
    //             as: "serviceDetails.serviceData",
    //         },
    //     },
    //     { $unwind: { path: "$serviceDetails.serviceData", preserveNullAndEmptyArrays: true } },
    //     { $sort: { createdAt: -1 } },
    //     { $skip: skip },
    //     { $limit: pageSize },
    //     {
    //         $group: {
    //             _id: "$_id",
    //             bookingId: { $first: "$bookingId" },
    //             invoiceId: { $first: "$invoiceId" },
    //             status: { $first: "$status" },
    //             date: { $first: "$date" },
    //             amount: { $first: "$amount" },
    //             userDetails: { $first: "$userDetails" },
    //             serviceDetails: { $push: "$serviceDetails" },
    //         },
    //     },
    //     {
    //         $project: {
    //             _id: 1,
    //             bookingId: 1,
    //             invoiceId: 1,
    //             status: 1,
    //             date: 1,
    //             amount: 1,
    //             userDetails: {
    //                 name: "$userDetails.name",
    //                 email: "$userDetails.email",
    //             },
    //             serviceDetails: 1,
    //             createdAt: 1,
    //         },
    //     },
    // ]);

    const bookings = await Booking.aggregate([
      { $match: { user_id: new Types.ObjectId(userId) } },

      // Unwind services
      {
        $unwind: {
          path: "$serviceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Join service master
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "serviceDetails.serviceData",
        },
      },
      {
        $unwind: {
          path: "$serviceDetails.serviceData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Join order doc
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "booking_id",
          as: "orderData",
        },
      },
      { $unwind: { path: "$orderData", preserveNullAndEmptyArrays: true } },

      // Join Techncian doc
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technicianDetails",
        },
      },
      {
        $unwind: {
          path: "$technicianDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Regroup by booking
      {
        $group: {
          _id: "$_id",

          bookingId: { $first: "$bookingId" },
          enquiryId: { $first: "$enquiryId" },
          order_id: { $first: "$order_id" },
          //   invoiceId: { $first: "$invoiceId" },

          status: { $first: "$status" },
          slot: { $first: "$slot" },
          date: { $first: "$date" },
          amount: { $first: "$amount" },
          grandTotal: { $first: "$grandTotal" },

          assigned_to: { $first: "$assigned_to" },

          // Add Technician name here
          //   technicianName: { $first: "$technicianDetails.name" },
          //   technicianPhone: { $first: "$technicianDetails.phoneNumber" },
          //   technicianPosition: { $first: "$technicianDetails.position" },

          payment_status: { $first: "$orderData.payment_status" },
          order_amount: { $first: "$orderData.amount" },

          // serviceDetails: {
          //   $push: {
          //     service_id: "$serviceDetails.service_id",
          //     serviceType: "$serviceDetails.serviceData.name",
          //     quantity: "$serviceDetails.quantity",
          //     acType: "$serviceDetails.acType",
          //   },
          // },
          serviceType: {
            $addToSet: "$serviceDetails.serviceData.name",
          },
          acTypes: {
            $addToSet: "$serviceDetails.acType",
          },

          rescheduled: { $first: "$rescheduled" },
          rescheduleReason: { $first: "$rescheduleReason" },
          parentBookingId: { $first: "$parentBookingId" },
          isRevisit: { $first: "$isRevisit" },

          createdAt: { $first: "$createdAt" },
        },
      },

      {
        $project: {
          _id: 1,
          bookingId: 1,
          enquiryId: 1,
          order_id: 1,
          //   invoiceId: 1,
          status: 1,
          slot: 1,
          date: 1,
          amount: 1,
          grandTotal: 1,
          assigned_to: 1,

          //   technicianName: 1,
          //   technicianPhone: 1,
          //   technicianPosition: 1,

          payment_status: 1,
          order_amount: 1,
          serviceType: 1,
          acTypes: 1,

          //   serviceDetails: {
          //     serviceType: 1,
          //     acType: 1,
          //     quantity: 1,
          //     service_id: 1,
          //     serviceData: {
          //       name: 1,
          //       category: 1,
          //     },
          //   },

          rescheduled: 1,
          rescheduleReason: 1,
          parentBookingId: 1,
          isRevisit: 1,

          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ]);

    const totalCountPipeline = [
      { $match: { user_id: new Types.ObjectId(userId) } },
      { $count: "totalCount" },
    ];
    const totalCountResult = await Booking.aggregate(totalCountPipeline);
    const totalCount = totalCountResult[0]?.totalCount || 0;

    return res.status(200).json({
      success: true,
      data: bookings,
      total: totalCount,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.mobileBookingDetails = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    if (!bookingId) {
      return res.status(200).json({
        status: STATUS.FAIL,
        message: "Booking id is required",
      });
    }

    const bookings = await Booking.aggregate([
      { $match: { _id: new Types.ObjectId(bookingId) } },
      {
        $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "serviceDetails.serviceData",
        },
      },
      {
        $unwind: {
          path: "$serviceDetails.serviceData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician_data",
        },
      },
      {
        $unwind: {
          path: "$technician_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            bookingId: "$_id",
            enquiryId: "$enquiryId",
            date: "$date",
            status: "$status",
            slot: "$slot",
            invoiceUrl: "$invoiceUrl",
            addressDetails: "$addressDetails",
            // otherService: "$serviceDetails.otherService",
            order_id: "$order_id",
            couponDetails: "$couponDetails",
            technician_data: "$technician_data",
            service_id: "$serviceDetails.service_id",
            service_name: "$serviceDetails.serviceData.name",
          },
          technician_data: { $first: "$technician_data" },
          addressDetails: { $first: "$addressDetails" },
          bookingId: { $first: "$bookingId" },
          order_id: { $first: "$order_id" },
          couponDetails: { $first: "$couponDetails" },
          invoiceUrl: { $first: "$invoiceUrl" },
          status: { $first: "$status" },
          date: { $first: "$date" },
          slot: { $first: "$slot" },
          amount: { $first: "$amount" },
          grandTotal: { $first: "$grandTotal" },
          isCouponApply: { $first: "$isCouponApply" },
          serviceDetails: {
            $push: {
              serviceType: "$serviceDetails.serviceType",
              quantity: "$serviceDetails.quantity",
              acType: "$serviceDetails.acType",
              otherService: { $ifNull: ["$serviceDetails.otherService", ""] },
              place: "$serviceDetails.place",
              comment: "$serviceDetails.comment",
              services: "$serviceDetails.services",
              service_name: "$serviceDetails.serviceData.name",
            },
          },
          parentBookingId: { $first: "$parentBookingId" },
          isRevisit: { $first: "$isRevisit" },
          revisitReason: { $first: "$revisitReason" },
          serviceData: { $first: "$serviceDetails.serviceData" },
        },
      },
      {
        $group: {
          _id: "$_id.bookingId",
          bookingId: { $first: "$bookingId" },
          enquiryId: { $first: "$_id.enquiryId" },
          status: { $first: "$status" },
          amount: { $first: "$amount" },
          grandTotal: { $first: "$grandTotal" },
          isCouponApply: { $first: "$isCouponApply" },
          date: { $first: "$date" },
          invoiceUrl: { $first: "$invoiceUrl" },
          addressDetails: { $first: "$addressDetails" },
          order_id: { $first: "$order_id" },
          couponDetails: { $first: "$couponDetails" },
          technician_data: { $first: "$technician_data" },
          slot: { $first: "$slot" },
          serviceDetails: {
            $push: {
              service_name: "$_id.service_name",
              service_id: "$_id.service_id",
              as_details: "$serviceDetails",
            },
          },
          parentBookingId: { $first: "$parentBookingId" },
          isRevisit: { $first: "$isRevisit" },
          revisitReason: { $first: "$revisitReason" },
        },
      },
      {
        $project: {
          _id: 1,
          bookingId: 1,
          enquiryId: 1,
          invoiceId: 1,
          status: { $ifNull: ["$status", ""] },
          date: { $ifNull: ["$date", ""] },
          amount: { $ifNull: [{ $toDouble: "$amount" }, 0] },
          grandTotal: 1,
          isCouponApply: { $ifNull: ["$isCouponApply", "2"] },
          invoiceUrl: { $ifNull: ["$invoiceUrl", ""] },
          addressDetails: { $ifNull: ["$addressDetails", ""] },
          order_id: { $ifNull: ["$order_id", ""] },
          couponDetails: { $ifNull: ["$couponDetails", {}] },
          technician_data: {
            _id: 1,
            name: 1,
            phoneNumber: 1,
          },
          parentBookingId: 1,
          isRevisit: 1,
          revisitReason: 1,
          slot: { $ifNull: ["$slot", ""] },
          serviceDetails: 1,
        },
      },
    ]);

    for (const element of bookings) {
      if (!element.hasOwnProperty("technician_data")) {
        element.technician_data = {};
      }
    }
    return res.status(200).json({
      success: true,
      data: bookings[0],
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// exports.mobileBookingSummary = async (req, res) => {
//   try {
//     const bookingId = req.params.bookingId;
//     if (!bookingId) {
//       return res.status(200).json({
//         status: STATUS.FAIL,
//         message: "Booking id is required",
//       });
//     }

//     const booking = await Booking.aggregate([
//       {
//         $match: { _id: new Types.ObjectId(bookingId) },
//       },
//       {
//         $project: {
//           originalTotal: { $ifNull: ["$originalTotal", ""] },
//           discountAmount: { $ifNull: ["$discountAmount", ""] },
//           discountedTotal: { $ifNull: ["$discountedTotal", ""] },
//           couponDetails: { $ifNull: ["$couponDetails", {}] },
//           isCouponApply: { $ifNull: ["$isCouponApply", 0] },
//           discount: { $ifNull: ["$discount", ""] },
//           originalTotal: { $ifNull: ["$originalTotal", ""] },
//           discountedTotal: { $ifNull: ["$discountedTotal", ""] },
//           discount: { $ifNull: ["$discount", ""] },
//           discountAmount: { $ifNull: ["$discountAmount", ""] },
//           _id: 0,
//         },
//       },
//     ]);
//     const resultData = booking.length ? booking[0] : "";

//     // function calculateTotal(items) {
//     //     return items.reduce((total, item) => {
//     //         let quantity = parseInt(item.quantity.replace('+', ''), 10);
//     //         let price = parseFloat(item.price.toString());
//     //         return total + quantity * price;
//     //     }, 0);
//     // }

//     const result = await Booking.aggregate([
//       {
//         $match: { _id: new Types.ObjectId(bookingId) }, // Match the specific booking by ID
//       },
//       {
//         $unwind: "$orderItems", // If the items are stored as an array within the document
//       },
//       {
//         $project: {
//           _id: "$orderItems._id",
//           item: "$orderItems.item",
//           quantity: "$orderItems.quantity",
//           price: { $toDouble: "$orderItems.price" },
//         },
//       },
//     ]);

//     const totalPrice = calculateTotal(result);

//     return res.status(200).json({
//       success: true,
//       orderItem: result,
//       totalPrice: totalPrice,
//       ...resultData,
//     });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

exports.mobileBookingSummary = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    if (!bookingId) {
      return res.status(200).json({
        status: STATUS.FAIL,
        message: "Booking id is required",
      });
    }

    const booking = await Booking.aggregate([
      {
        $match: { _id: new Types.ObjectId(bookingId) },
      },

      // Unwind order items for calculation
      {
        $unwind: {
          path: "$orderItems",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Convert values for calculation
      {
        $addFields: {
          itemTotal: {
            $multiply: [
              { $toDouble: "$orderItems.price" },
              {
                $toDouble: {
                  $ifNull: ["$orderItems.quantity", 0],
                },
              },
            ],
          },
        },
      },

      // Group back to booking level
      {
        $group: {
          _id: "$_id",

          orderItems: {
            $push: {
              item: "$orderItems.item",
              quantity: "$orderItems.quantity",
              price: { $toDouble: "$orderItems.price" },
            },
          },

          orderItemsTotal: { $sum: "$itemTotal" },

          // Pricing fields
          amount: { $first: { $toDouble: "$amount" } },
          grandTotal: { $first: { $toDouble: "$grandTotal" } },
          originalTotal: { $first: "$originalTotal" },

          discount: { $first: "$discount" },
          discountAmount: { $first: "$discountAmount" },
          discountedTotal: { $first: "$discountedTotal" },
          isCouponApply: { $first: "$isCouponApply" },
          couponDetails: { $first: "$couponDetails" },

          tax: { $first: "$tax" },
        },
      },

      // Final clean response
      {
        $project: {
          _id: 0,

          orderItems: 1,
          orderItemsTotal: 1,

          pricing: {
            amount: "$amount",
            originalTotal: "$originalTotal",
            discountedTotal: "$discountedTotal",
            discount: "$discount",
            discountAmount: "$discountAmount",
            isCouponApply: "$isCouponApply",
            couponDetails: "$couponDetails",
            grandTotal: "$grandTotal",
          },

          tax: {
            gst: "$tax.gst",
            cgst: "$tax.cgst",
            sgst: "$tax.sgst",
            taxableAmount: {
              $toDouble: "$tax.taxableAmount",
            },
            cgstAmount: {
              $toDouble: "$tax.cgstAmount",
            },
            sgstAmount: {
              $toDouble: "$tax.sgstAmount",
            },
            totalTax: {
              $toDouble: "$tax.totalTax",
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: booking.length ? booking[0] : {},
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.generateInvoiceProceedToPayBooking = async (req, res) => {
  const { bookingId } = req.params;

  return res.status(200).json({
    status: true,
    message: "invoice generated successfully",
  });
};

// List of bookings assigned to a specific technician
exports.technicianBookingList = async (req, res) => {
  try {
    const technicianId = req.technicianId;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const status = req.query.status ? req.query.status.split(",") : [];
    const sortField = req.query.sortby || "createdAt";
    const sortOrder = req.query.orderby === "asc" ? 1 : -1; // default desc

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const offset = (page - 1) * limit;

    /* ---------------- COMMON MATCH ---------------- */
    const baseMatch = {
      assigned_to: new Types.ObjectId(technicianId),
      ...(status.length && { status: { $in: status } }),
      ...(startDate && endDate && { date: { $gte: startDate, $lte: endDate } }),
      ...(startDate && !endDate && { date: { $gte: startDate } }),
      ...(endDate && !startDate && { date: { $lte: endDate } }),
    };

    /* ================= LIST PIPELINE ================= */
    const listPipeline = [
      { $match: baseMatch },

      /* USER */
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      /* SERVICES */
      { $unwind: "$serviceDetails" },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },

      /* SEARCH */
      {
        $match: {
          $or: [
            { bookingId: { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { "user.phoneNumber": { $regex: search, $options: "i" } },
          ],
        },
      },

      /* GROUP → ONE BOOKING */
      {
        $group: {
          _id: "$_id",
          bookingId: { $first: "$bookingId" },
          status: { $first: "$status" },
          slot: { $first: "$slot" },
          date: { $first: "$date" },
          createdAt: { $first: "$createdAt" },
          amount: { $first: "$amount" },
          addressDetails: { $first: "$addressDetails" },

          customer: {
            $first: {
              name: "$user.name",
              phoneNumber: "$user.phoneNumber",
            },
          },

          serviceNames: { $addToSet: "$service.name" },
        },
      },

      /* SORT & PAGINATION */
      //   { $sort: { createdAt: -1 } },
      {
        $sort: { [sortField]: sortOrder },
      },

      { $skip: offset },
      { $limit: limit },

      /* FINAL SHAPE */
      {
        $project: {
          bookingId: 1,
          status: 1,
          slot: 1,
          date: 1,
          createdAt: 1,
          amount: { $toDouble: "$amount" },
          customer: 1,
          serviceNames: 1,

          address: {
            $cond: [
              { $gt: [{ $size: "$addressDetails" }, 0] },
              {
                $let: {
                  vars: {
                    addr: { $arrayElemAt: ["$addressDetails", 0] },
                  },
                  in: {
                    house: "$$addr.house",
                    street: "$$addr.street",
                    city: "$$addr.city",
                    state: "$$addr.state",
                    zipcode: "$$addr.zipcode",
                  },
                },
              },
              {},
            ],
          },
        },
      },
    ];

    /* ================= COUNT PIPELINE ================= */
    const countPipeline = [
      { $match: baseMatch },

      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      { $unwind: "$serviceDetails" },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },

      {
        $match: {
          $or: [
            { bookingId: { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { "user.phoneNumber": { $regex: search, $options: "i" } },
          ],
        },
      },

      { $group: { _id: "$_id" } },
      { $count: "total" },
    ];

    const [bookings, totalCountAgg] = await Promise.all([
      Booking.aggregate(listPipeline),
      Booking.aggregate(countPipeline),
    ]);

    const totalCount = totalCountAgg[0]?.total || 0;

    return res.status(200).json({
      status: "success",
      data: bookings,
      pagination: {
        totalCount,
        page,
        limit,
        totalPage: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Technician booking list error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

// Booking details of a booking assigned to a specific technician
exports.technicianBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const technicianId = req.technicianId;

    const pipeline = [
      //  ONLY THIS BOOKING + ASSIGNED TO TECHNICIAN
      {
        $match: {
          _id: new Types.ObjectId(bookingId),
          assigned_to: new Types.ObjectId(technicianId),
        },
      },

      //  USER
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      //  SERVICES
      {
        $unwind: {
          path: "$serviceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceDetails.service_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },

      //  TECHNICIAN
      {
        $lookup: {
          from: "technicians",
          localField: "assigned_to",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: { path: "$technician", preserveNullAndEmptyArrays: true } },

      //  GROUP BACK TO ONE BOOKING
      {
        $group: {
          _id: "$_id",
          bookingId: { $first: "$bookingId" },
          status: { $first: "$status" },
          slot: { $first: "$slot" },
          date: { $first: "$date" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          amount: { $first: "$amount" },
          addressDetails: { $first: "$addressDetails" },

          customer: {
            $first: {
              name: "$user.name",
              phoneNumber: "$user.phoneNumber",
              email: "$user.email",
              type: "$user.type"
            },
          },

          technician: {
            $first: {
              name: "$technician.name",
              phoneNumber: "$technician.phoneNumber",
            },
          },

          services: {
            $push: {
              serviceId: "$service._id",
              name: "$service.name",
              quantity: "$serviceDetails.quantity",
              acType: "$serviceDetails.acType",
              place: "$serviceDetails.place",
              comment: "$serviceDetails.comment",
              _id: "$serviceDetails._id",
            },
          },
        },
      },

      //  FINAL SHAPE
      {
        $project: {
          bookingId: 1,
          status: 1,
          slot: 1,
          date: 1,
          createdAt: 1,
          updatedAt: 1,
          amount: { $toDouble: "$amount" },
          customer: 1,
          technician: 1,
          services: 1,
          address: {
            $let: {
              vars: {
                addr: { $arrayElemAt: ["$addressDetails", 0] },
              },
              in: {
                house: "$$addr.house",
                street: "$$addr.street",
                city: "$$addr.city",
                state: "$$addr.state",
                zipcode: "$$addr.zipcode",
              },
            },
          },
        },
      },
    ];

    const booking = await Booking.aggregate(pipeline);

    if (!booking.length) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found or not assigned to this technician",
      });
    }

    return res.status(200).json({
      status: "success",
      data: booking[0],
    });
  } catch (error) {
    console.error("Technician booking details error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

exports.manageBookingStatusByTechnician = async (req, res) => {
  try {
    const technicianId = req.technicianId;
    const { bookingId, status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({
        status: false,
        message: "bookingId and status are required",
      });
    }

    if (!TECHNICIAN_ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Technician is not allowed to set this status",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      assigned_to: technicianId,
    });

    if (!booking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found or not assigned to technician",
      });
    }

    const currentStatus = booking.status;

    if (
      !VALID_TRANSITIONS[currentStatus] ||
      !VALID_TRANSITIONS[currentStatus].includes(status)
    ) {
      return res.status(400).json({
        status: false,
        message: `Cannot change status from ${currentStatus} to ${status}`,
      });
    }

    // Update booking status
    booking.status = status;
    await booking.save();
    
    await Booking.updateOne({ _id: bookingId }, { status: status });

    const statusMap = {
      ASSIGNED: "SCHEDULED",
      IN_PROGRESS: "IN_PROGRESS",
      HOLD: "HOLD",
      PAYMENT_PENDING: "PAYMENT_PENDING",
      COMPLETE: "COMPLETED",
      CANCELLED: "CANCELLED",
      PAID: "PAID",
    };

    const enquiryStatus = statusMap[status];

    if (enquiryStatus) {
      await Enquiry.updateOne({ bookingId }, { status: enquiryStatus });
    }

    // If booking finished → make technician available
    if (status === "COMPLETE" || status === "CANCELLED") {
      await Technician.updateOne(
        { _id: technicianId },
        { status: "AVAILABLE" },
      );
    }

    // Push notification to user
    const user = await User.findById(booking.user_id).select("deviceToken");

    if (user?.deviceToken) {
      let title = "📦 Booking Update";
      let body = "";

      if (status === "IN_PROGRESS") {
        body = MESSAGES.BOOKING_IN_PROGRESS;
      } else if (status === "COMPLETE") {
        body = MESSAGES.BOOKING_COMPLETED;
      } else if (status === "CANCELLED") {
        body = MESSAGES.BOOKING_CANCELLED;
      }

      await sendPushNotification(user.deviceToken, title, body);

      await Notification.create({
        userId: booking.user_id,
        // bookingId: booking._id,
        title,
        text: body,
      });
    }

    return res.status(200).json({
      status: true,
      message: `Booking marked as ${status}`,
    });
  } catch (error) {
    console.error("Technician booking status error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
