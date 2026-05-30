const moment = require("moment");

const Enquiry = require("../../models/Enquiry/enquiry.model");
const Booking = require("../../models/Bookings/booking.model");
const Address = require("../../models/User/address.model");
const Technician = require("../../models/Technician/technician.model");
const { STATUS, MESSAGES, CODES } = require("../../Config/responseConstants");
const User = require("../../models/User/user.model");
const Notification = require("../../models/Notifications/notification.model");
const Assignment = require("../../models/Assignment/assignment.model");
const Job = require("../../models/Job/job.model");
const { sendPushNotification } = require("../../Utils/notification");
const Service = require("../../models/Service/service.model");
const OldAcEnquiryDetail = require("../../models/Enquiry/oldAcEnquiry");
const { Types } = require("mongoose");
const {
  handleOldAcEnquiry,
  cleanupCopperPipingImages,
  cleanupOldAcPhotos,
} = require("../../Helper/enquiry");
const inspection = require("../../models/Enquiry/inspection");
const CopperPipingEnquiry = require("../../models/Enquiry/copperpiping");

const ALLOWED_STATUSES = [
  "REQUESTED",
  "BOOKED",
  "SCHEDULED",
  "IN_PROGRESS",
  "HOLD",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "QUOTE_SHARED",
  "QUOTE_REJECTED",
  "QUOTE_ACCEPTED",
  "BOOKING_CREATED",
  "INSPECTION_SCHEDULED",
  "INSPECTION_COMPLETED",
  "FOLLOW_UP_REQUIRED",
];

const ALLOWED_RESCHEDULE_STATUS = ["REQUESTED", "SCHEDULED", "RESCHEDULED"];

const ALLOWED_CANCEL_STATUS = ["REQUESTED", "SCHEDULED"];

// exports.createEnquiry = async (req, res) => {
//     let formattedDate = moment().format('DDMMYYYY');

//     try {
//         const { user_id, serviceDetails,
//             addressId, slot, date, name, type, subType } = req.body;

//         if (!user_id) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.USER_ID_REQUIRED
//             });
//         }

//         if (!name) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.NAME_REQUIRED_FOR_BOOKING
//             });
//         }

//         if (!addressId) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.ADDRESS_ID_REQUIRED
//             });
//         }
//         if (!slot) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL, message: MESSAGES.SLOT_REQUIRED

//             });
//         }
//         if (!date || isNaN(new Date(date).getTime())) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.INVALID_DATE
//             });
//         }

//         const address = await Address.findOne({ _id: addressId })
//         if (!address) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.VALID_ADDRESS_ID_REQUIRED
//             });
//         }

//         const countTotalEnquiry = await Enquiry.countDocuments();
//         const enquiryId = `ACDEQ${formattedDate}-${(countTotalEnquiry + 1)}`;

//         const newEnquiry = new Enquiry({
//             user_id,
//             enquiryId,
//             details: serviceDetails,
//             addressDetails: address,
//             schedule: {
//                 slot,
//                 date: new Date(date),
//             },
//             type,
//             subType,
//         });

//         // Save Enquiry
//         await newEnquiry.save();

//         // send push notification
//         const userToken = await User.findOne({ _id: user_id }).select('deviceToken')
//         if (userToken) {
//             if (!userToken.name) {
//                 await User.updateOne(
//                     { _id: user_id },
//                     { name })
//             }
//             if (userToken.deviceToken) {
//                 if (userToken.deviceToken != "") {
//                     const registrationToken = userToken.deviceToken;
//                     const title = '📦 Booking';
//                     const body = MESSAGES.BOOKING_CREATE_NOTIFICATION;
//                     await sendPushNotification(registrationToken, title, body);

//                     await Notification.create({
//                         userId: user_id,
//                         text: MESSAGES.BOOKING_CREATE_NOTIFICATION
//                     })
//                 }
//             }
//         }

//         return res.status(201).json({
//             status: STATUS.SUCCESS,
//             message: MESSAGES.BOOKING_CREATED,
//         });

//     } catch (error) {
//         console.error('Error creating booking:', error);
//         return res.status(500).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.SERVER_ERROR,
//             error: error.message
//         });
//     }
// }

exports.updateEnquiryWithAddons = async (req, res) => {
  try {
    const { enquiryId, addons } = req.body;

    if (!enquiryId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_ID_REQUIRED,
      });
    }
    const enquiry = await Enquiry.findOne({ enquiryId });
    if (!enquiry) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_NOT_FOUND,
      });
    }

    enquiry.addons = addons;
    await enquiry.save();
  } catch (error) {
    console.error("Error updating enquiry with addons:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { enquiryId, status } = req.body;

    if (!enquiryId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_ID_REQUIRED,
      });
    }
    const enquiry = await Enquiry.findOne({ enquiryId });
    if (!enquiry) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_NOT_FOUND,
      });
    }

    if (status && ALLOWED_STATUSES.includes(status)) {
      enquiry.status = status;
    }

    await enquiry.save();

    return res.status(200).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.ENQUIRY_UPDATED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.updateEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { details, addressId, slot, date } = req.body;

    // Validate the required fields
    if (!enquiryId) {
      return res
        .status(CODES.BAD_REQUEST)
        .json({ status: STATUS.FAIL, message: MESSAGES.MISSING_ENQUIRY_ID });
    }

    // Check if booking exists
    const existingEnquiry = await Enquiry.findById(enquiryId);
    if (!existingEnquiry) {
      return res
        .status(CODES.SUCCESS)
        .json({ status: STATUS.FAIL, message: MESSAGES.ENQUIRY_NOT_FOUND });
    }

    // Update booking fields
    existingEnquiry.details = details || existingEnquiry.details;

    // Check if address exists for given addressId
    if (addressId) {
      const address = await Address.findOne({ _id: addressId });
      if (!address) {
        return res.status(CODES.SUCCESS).json({
          status: STATUS.FAIL,
          message: MESSAGES.VALID_ADDRESS_ID_REQUIRED,
        });
      }
      existingEnquiry.addressDetails = address;
    }
    existingEnquiry.slot = slot || existingEnquiry.slot;
    existingEnquiry.date = new Date(date) || existingEnquiry.date;

    await existingEnquiry.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.ENQUIRY_UPDATED,
    });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.assignTechnicianToEnquiry = async (req, res) => {
  try {
    const { enquiryId, technicianId, assignmentType, instructions, schedule } =
      req.body;
    console.log("this is my enquiry ", enquiryId);

    if (!enquiryId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_ID_REQUIRED,
      });
    }
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.ENQUIRY_NOT_FOUND,
      });
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    // Create assignment record
    const assignment = new Assignment({
      enquiry_id: enquiry._id,
      technician_id: technician._id,
      type: assignmentType || "WORK",
    });
    await assignment.save();

    // Create job record against the assignment
    const job = new Job({
      assignment_id: assignment._id,
      enquiry_id: enquiry._id,
      technician_id: technician._id,
      instructions: instructions || [],
      schedule: schedule || enquiry.schedule,
    });
    await job.save();

    enquiry.assignedTo = technician._id;
    if (schedule) {
      enquiry.schedule = schedule;
    }
    await enquiry.save();

    return res.status(200).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TECHNICIAN_ASSIGNED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error assigning technician to enquiry:", error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.listEnquiries = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status ? req.query.status.split(",") : [];
  const type = req.query.type ? req.query.type.split(",") : [];
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
  const filter = req.query.filter || "";

  const matchConditions = {
    $and: [
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
      {
        $or: [
          { status: { $in: status } },
          {
            $and: [
              { status: { $in: ["BOOKED", "REQUESTED", "IN_PROGRESS"] } },
              { $expr: { $eq: [status.length, 0] } },
            ],
          },
        ],
      },
    ],
  };

  if (type.length > 0) {
    matchConditions.$and.push({
      subType: { $in: type },
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
  try {
    const enquiries = await Enquiry.aggregate([
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
          localField: "assignedTo",
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
        $match: matchConditions,
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
          technicianName: {
            $ifNull: ["$technician_data.name", ""],
          },
          schedule: {
            slot: "$schedule.slot",
            date: "$schedule.date",
          },
          date: 1,
          order_id: 1,
          bookingId: 1,
          enquiryId: 1,
          subType: 1,
          updatedAt: 1,
          slot: 1,
        },
      },
    ]);

    const totalEnquiries = await Enquiry.aggregate([
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
        $match: matchConditions,
      },
      {
        $count: "total",
      },
    ]);

    const totalCount = totalEnquiries.length ? totalEnquiries[0].total : 0;
    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: enquiries || [],
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

// exports.getEnquiryById = async (req, res) => {
// const { enquiryId } = req.params;

//     if (!enquiryId || enquiryId === '' || enquiryId == null) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.ENQUIRY_ID_REQUIRED
//         });
//     }

//     try {

//         const enquiry = await Enquiry.aggregate([
//             {
//                 $match: { _id: new Types.ObjectId(enquiryId) },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "user_id",
//                     foreignField: "_id",
//                     as: "user_info",
//                 },
//             },
//             {
//                 $unwind: {
//                     path: "$user_info",
//                     preserveNullAndEmptyArrays: true,
//                 },
//             },
//             {
//                 $unwind: {
//                     path: "$serviceDetails",
//                     preserveNullAndEmptyArrays: true,
//                 },
//             },

//             {
//                 $lookup: {
//                     from: "services",
//                     localField: "serviceDetails.service_id",
//                     foreignField: "_id",
//                     as: "serviceDetails.service_data",
//                     pipeline: [
//                         {
//                             $project: {
//                                 _id: 1,
//                                 name: 1,
//                                 icon: 1,
//                                 category: 1,
//                                 key: 1,
//                             }
//                         }
//                     ]
//                 },
//             },
//             {
//                 $unwind: {
//                     path: "$serviceDetails.service_data",
//                     preserveNullAndEmptyArrays: true,
//                 },
//             },
//             {
//                 $lookup: {
//                     from: 'technicians',
//                     localField: 'assigned_to',
//                     foreignField: '_id',
//                     as: 'technician_data'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$technician_data',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id",
//                     address: { $first: "$address" },
//                     status: { $first: "$status" },
//                     createdAt: { $first: "$createdAt" },
//                     updatedAt: { $first: "$updatedAt" },
//                     user: { $first: "$user_info" },
//                     technician: { $first: "$technician_data" },
//                     amount: { $first: { $toDouble: "$amount" } },
//                     date: { $first: "$date" },
//                     invoiceUrl: { $first: "$invoiceUrl" },
//                     bookingId: { $first: "$bookingId" },
//                     invoiceId: { $first: "$invoiceId" },
//                     slot: { $first: "$slot" },
//                     order_id: { $first: "$order_id" },
//                     addressDetails: { $first: "$addressDetails" },
//                     serviceDetails: {
//                         $push: {
//                             service_id: "$serviceDetails.service_id",
//                             serviceType: "$serviceDetails.serviceType",
//                             quantity: "$serviceDetails.quantity",
//                             acType: "$serviceDetails.acType",
//                             place: "$serviceDetails.place",
//                             comment: "$serviceDetails.comment",
//                             otherService: { $ifNull: ["$serviceDetails.otherService", ""] },
//                             services: "$serviceDetails.services",
//                             service_data: "$serviceDetails.service_data",
//                         },
//                     },
//                     orderItems: {
//                         $first: {
//                             $map: {
//                                 input: "$orderItems",
//                                 as: "item",
//                                 in: {
//                                     _id: "$$item._id",
//                                     item: "$$item.item",
//                                     quantity: "$$item.quantity",
//                                     price: { $toDouble: "$$item.price" },
//                                 },
//                             },
//                         },
//                     },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     address: 1,
//                     status: 1,
//                     createdAt: 1,
//                     updatedAt: 1,
//                     user: {
//                         _id: "$user._id",
//                         name: "$user.name",
//                         isActive: "$user.isActive",
//                         phoneNumber: "$user.phoneNumber",
//                         countryCode: "$user.countryCode",
//                         type: "$user.type",
//                     },
//                     technician: { $ifNull: ["$technician", {}] },
//                     amount: 1,
//                     date: 1,
//                     invoiceUrl: 1,
//                     bookingId: 1,
//                     invoiceId: 1,
//                     slot: 1,
//                     order_id: 1,
//                     serviceDetails: 1,
//                     orderItems: 1,
//                     addressDetails: 1,
//                 },
//             },
//         ]);

//         const service = await Service.findOne({ _id: enquiry[0].serviceDetails[0].service_id })
//         enquiry[0].service = service || {}

//         if (enquiry.length > 0) {
//             return res.status(CODES.SUCCESS).json({
//                 status: STATUS.SUCCESS,
//                 data: enquiry[0]
//             });
//         } else {
//             return res.status(CODES.SUCCESS).json({
//                 status: STATUS.FAIL,
//                 message: MESSAGES.ENQUIRY_NOT_FOUND
//             });
//         }
//     } catch (error) {
//         console.error("Error finding enquiry:", error);
//         return res.status(500).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.SERVER_ERROR,
//             error: error.message
//         });
//     }
// };

// exports.getEnquiriesByUserId = async (req, res) => {
//     const page = parseInt(req.query.page, 10) || 1;
//     const limit = parseInt(req.query.limit, 10) || 10;
//     const search = req.query.search || '';
//     const sortField = req?.query?.sortby || "createdAt";
//     const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;

//     const userId = req.params.userId || req?.user?._id

//     if (!userId) {
//         return res.status(200).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.USER_ID_REQUIRED,
//         });
//     }
//     const offset = (page - 1) * limit;
//     try {
//         const enquiries = await Enquiry.aggregate([
//             { $match: { user_id: new Types.ObjectId(userId) } },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'user_id',
//                     foreignField: '_id',
//                     as: 'user_info'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$user_info',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'services',
//                     localField: 'service_id',
//                     foreignField: '_id',
//                     as: 'service_info'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$service_info',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'technicians',
//                     localField: 'assigned_to',
//                     foreignField: '_id',
//                     as: 'technician_data'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$technician_data',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $match: {
//                     $or: [
//                         { status: { $regex: search, $options: 'i' } },
//                     ]
//                 }
//             },
//             {
//                 $sort: { [sortField]: sortOrder }

//             },
//             {
//                 $skip: offset
//             },
//             {
//                 $limit: limit
//             },
//             {
//                 $project: {
//                     address: 1,
//                     status: 1,
//                     createdAt: 1,
//                     user:
//                     {
//                         id: { $ifNull: ["$user_info._id", ""] },
//                         name: { $ifNull: ["$user_info.name", ""] },
//                         phoneNumber: { $ifNull: ["$user_info.phoneNumber", ""] },
//                         createdAt: { $ifNull: ["$user_info.createdAt", null] },
//                     }
//                     ,
//                     service:
//                     {
//                         id: { $ifNull: ["$service_info._id", ""] },
//                         name: { $ifNull: ["$service_info.name", ""] }
//                     },
//                     technicianName: { $ifNull: ["$technician_data", {}] },
//                     date: 1,
//                     amount: { $toDouble: "$amount" },
//                     order_id: 1,
//                     bookingId: 1,
//                     invoiceId: 1,
//                     invoiceUrl: 1,
//                     updatedAt: 1,
//                     slot: 1,
//                 }
//             }
//         ]);

//         const totalEnquiries = await Enquiry.aggregate([
//             { $match: { user_id: new Types.ObjectId(userId) } },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'user_id',
//                     foreignField: '_id',
//                     as: 'user_info'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$user_info',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'services',
//                     localField: 'service_id',
//                     foreignField: '_id',
//                     as: 'service_info'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$service_info',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'technicians',
//                     localField: 'assigned_to',
//                     foreignField: '_id',
//                     as: 'technician_data'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$technician_data',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $match: {
//                     $or: [
//                         { status: { $regex: search, $options: 'i' } },
//                     ]
//                 }
//             },
//             {
//                 $count: 'total'
//             }
//         ]);

//         const totalCount = totalEnquiries.length ? totalEnquiries[0].total : 0;

//         return res.status(CODES.SUCCESS).json({
//             status: STATUS.SUCCESS,
//             data: enquiries || [],
//             count: totalCount,
//             pagination: {
//                 totalCount,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(totalCount / limit)
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching enquiry list:', error);
//         return res.status(500).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.SERVER_ERROR,
//             error: error.message
//         });
//     }
// }

exports.getEnquiriesByUserId = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || "";
  const sortField = req.query.sortby || "createdAt";
  const sortOrder = req.query.orderby === "asc" ? 1 : -1;

  const userId = req.params.userId || req?.user?._id;

  if (!userId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.USER_ID_REQUIRED,
    });
  }

  const offset = (page - 1) * limit;

  try {
    const matchQuery = {
      user_id: new Types.ObjectId(userId),
    };

    if (search) {
      matchQuery.$or = [
        { status: { $regex: search, $options: "i" } },
        { subType: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
        { enquiryId: { $regex: search, $options: "i" } },
      ];
    }

    const enquiries = await Enquiry.aggregate([
      { $match: matchQuery },
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
          from: "technicians",
          localField: "assignedTo",
          foreignField: "_id",
          as: "technician_info",
        },
      },
      {
        $unwind: {
          path: "$technician_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "oldacenquirydetails",
          localField: "_id",
          foreignField: "enquiryId",
          as: "oldAcInfo",
        },
      },
      {
        $unwind: {
          path: "$oldAcInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "copperpipingenquiries",
          localField: "_id",
          foreignField: "enquiryId",
          as: "copperPipingInfo",
        },
      },
      {
        $unwind: {
          path: "$copperPipingInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consultancies",
          localField: "_id",
          foreignField: "enquiryId",
          as: "consultancyInfo",
        },
      },
      {
        $unwind: {
          path: "$consultancyInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "leads",
          localField: "_id",
          foreignField: "enquiryId",
          as: "leadInfo",
        },
      },
      {
        $unwind: {
          path: "$leadInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "purchaseleads",
          let: { enquiryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$enquiryId", "$$enquiryId"] },
              },
            },
            {
              $lookup: {
                from: "products",
                let: { productId: "$productId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$productId"] },
                    },
                  },
                ],
                as: "product_info",
              },
            },
            {
              $unwind: {
                path: "$product_info",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "purchaseLeadDoc",
        },
      },
      {
        $unwind: {
          path: "$purchaseLeadDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          purchaseLeadDetails: {
            $cond: {
              if: { $eq: ["$subType", "PURCHASE_LEAD"] },
              then: {
                _id: "$purchaseLeadDoc._id",
                purchaseId: "$purchaseLeadDoc.purchaseId",
                quantity: "$purchaseLeadDoc.quantity",
                unitPrice: "$purchaseLeadDoc.unitPrice",
                soldAmount: "$purchaseLeadDoc.soldAmount",
                status: "$purchaseLeadDoc.status",
                remarks: "$purchaseLeadDoc.remarks",
                source: "$purchaseLeadDoc.source",
                nextFollowUpAt: "$purchaseLeadDoc.nextFollowUpAt",
                createdAt: "$purchaseLeadDoc.createdAt",
                product: {
                  _id: "$purchaseLeadDoc.product_info._id",
                  name: "$purchaseLeadDoc.product_info.name",
                  brand: "$purchaseLeadDoc.product_info.brand",
                  model: "$purchaseLeadDoc.product_info.model",
                  images: "$purchaseLeadDoc.product_info.images",
                  category: "$purchaseLeadDoc.product_info.category",
                  pricing: "$purchaseLeadDoc.product_info.pricing",
                  specifications:
                    "$purchaseLeadDoc.product_info.specifications",
                },
              },
              else: {},
            },
          },
        },
      },
      { $sort: { [sortField]: sortOrder } },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          enquiryId: 1,
          type: 1,
          subType: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          addressDetails: 1,
          schedule: 1,
          parentBookingId: 1,
          isRevisit: 1,
          oldAcDetails: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: { $ifNull: ["$oldAcInfo.oldAcDetails", []] },
              else: [],
            },
          },

          totalNoOfAC: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: { $ifNull: ["$oldAcInfo.totalNoOfAC", 0] },
              else: 0,
            },
          },

          brand: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: { $ifNull: ["$oldAcInfo.brand", ""] },
              else: "",
            },
          },

          alternateNumber: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: { $ifNull: ["$oldAcInfo.alternateNumber", ""] },
              else: "",
            },
          },

          propertyType: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: { $ifNull: ["$oldAcInfo.propertyType", ""] },
              else: "",
            },
          },
          copperPipingDetails: {
            $cond: {
              if: { $eq: ["$subType", "COPPER_PIPING"] },
              then: {
                propertyType: "$copperPipingInfo.propertyType",
                acTypes: "$copperPipingInfo.acTypes",
                outdoorUnitLocation: "$copperPipingInfo.outdoorUnitLocation",
                pipeLength: "$copperPipingInfo.pipeLength",
                additionalNotes: "$copperPipingInfo.additionalNotes",
                images: "$copperPipingInfo.images",
              },
              else: {},
            },
          },
          brands: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $setUnion: [
                  {
                    $map: {
                      input: { $ifNull: ["$oldAcInfo.oldAcDetails", []] },
                      as: "ac",
                      in: { $ifNull: ["$$ac.brand", ""] },
                    },
                  },
                  [],
                ],
              },
              else: [],
            },
          },
          acTypes: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $setUnion: [
                  {
                    $map: {
                      input: { $ifNull: ["$oldAcInfo.oldAcDetails", []] },
                      as: "ac",
                      in: { $ifNull: ["$$ac.acType", ""] },
                    },
                  },
                  [],
                ],
              },
              else: {
                $cond: {
                  if: { $eq: ["$subType", "COPPER_PIPING"] },
                  then: {
                    $setUnion: [
                      {
                        $map: {
                          input: { $ifNull: ["$copperPipingInfo.acTypes", []] },
                          as: "cp",
                          in: { $ifNull: ["$$cp.type", ""] },
                        },
                      },
                      [],
                    ],
                  },
                  else: [],
                },
              },
            },
          },
          // noOfAc: {
          //   $cond: {
          //     if: { $eq: ["$subType", "OLD_AC"] },
          //     then: {
          //       $size: { $ifNull: ["$oldAcInfo.oldAcDetails", []] },
          //     },
          //     else: {
          //       $cond: {
          //         if: { $eq: ["$subType", "COPPER_PIPING"] },
          //         then: {
          //           $sum: {
          //             $map: {
          //               input: { $ifNull: ["$copperPipingInfo.acTypes", []] },
          //               as: "ac",
          //               in: { $ifNull: ["$$ac.quantity", 0] },
          //             },
          //           },
          //         },
          //         else: 0,
          //       },
          //     },
          //     else: {
          //       $cond: {
          //         if: { $eq: ["$subType", "FREE_CONSULTATION"] },
          //         then: {
          //           $toInt: { $ifNull: ["$consultancyInfo.quantity", 0] },
          //         },
          //         else: 0,
          //       },
          //     },
          //   },
          // },
          noOfAc: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$subType", "OLD_AC"] },
                  then: { $size: { $ifNull: ["$oldAcInfo.oldAcDetails", []] } },
                },
                {
                  case: { $eq: ["$subType", "COPPER_PIPING"] },
                  then: {
                    $sum: {
                      $map: {
                        input: { $ifNull: ["$copperPipingInfo.acTypes", []] },
                        as: "ac",
                        in: { $ifNull: ["$$ac.quantity", 0] },
                      },
                    },
                  },
                },
                {
                  case: { $eq: ["$subType", "FREE_CONSULTATION"] },
                  then: {
                    $toInt: { $ifNull: ["$consultancyInfo.quantity", 0] },
                  },
                },
                {
                  case: { $eq: ["$subType", "AMC"] },
                  then: {
                    $sum: {
                      $map: {
                        input: { $ifNull: ["$leadInfo.acDetails", []] },
                        as: "ac",
                        in: { $ifNull: ["$$ac.quantity", 0] },
                      },
                    },
                  },
                },
              ],
              default: 0,
            },
          },
          user: {
            id: { $ifNull: ["$user_info._id", ""] },
            name: { $ifNull: ["$user_info.name", ""] },
            phoneNumber: { $ifNull: ["$user_info.phoneNumber", ""] },
            email: { $ifNull: ["$user_info.email", ""] },
            countryCode: { $ifNull: ["$user_info.countryCode", ""] },
            profilePhoto: { $ifNull: ["$user_info.profilePhoto", ""] },
          },
          technician: {
            id: { $ifNull: ["$technician_info._id", ""] },
            name: { $ifNull: ["$technician_info.name", ""] },
            phoneNumber: { $ifNull: ["$technician_info.phoneNumber", ""] },
            email: { $ifNull: ["$technician_info.email", ""] },
            countryCode: { $ifNull: ["$technician_info.countryCode", ""] },
            profilePhoto: { $ifNull: ["$technician_info.profilePhoto", ""] },
          },
        },
      },
    ]);

    const totalCount = await Enquiry.countDocuments(matchQuery);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: enquiries,
      count: totalCount,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching enquiry list:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createEnquiry = async (req, res) => {
  let formattedDate = moment().format("DDMMYYYY");

  try {
    const {
      addressId,
      slot,
      date,
      // oldAcDetails,
      name,
      subType,
      // copperPipingDetails,
      totalNoOfAC,
      brand,
      propertyType,
      alternateNumber,
    } = req.body;

    let user_id = req.user._id;

    let copperPipingDetails = req.body.copperPipingDetails;
    let oldAcDetails = req.body.oldAcDetails;

    if (!user_id) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_ID_REQUIRED,
      });
    }

    if (!name) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.NAME_REQUIRED_FOR_BOOKING,
      });
    }

    if (!addressId) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.ADDRESS_ID_REQUIRED,
      });
    }

    if (!slot) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.SLOT_REQUIRED,
      });
    }

    if (!date || isNaN(new Date(date).getTime())) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.INVALID_DATE,
      });
    }

    const address = await Address.findOne({ _id: addressId });
    if (!address) {
      await cleanupOldAcPhotos(oldAcDetails);
      await cleanupCopperPipingImages(copperPipingDetails);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.VALID_ADDRESS_ID_REQUIRED,
      });
    }

    const countTotalEnquiry = await Enquiry.countDocuments();
    const enquiryId = `ACDEQ${formattedDate}-${countTotalEnquiry + 1}`;

    const newEnquiry = await Enquiry.create({
      user_id,
      enquiryId,
      addressDetails: address,
      schedule: {
        slot,
        date: new Date(date),
      },
      type: "QUOTE_REQUEST",
      subType: req.body.subType,
      status: "REQUESTED",
    });

    let oldAcDoc = null;
    if (subType === "OLD_AC") {
      const result = await handleOldAcEnquiry({
        enquiryId: newEnquiry._id,
        oldAcDetails,
        totalNoOfAC,
        brand,
        propertyType,
        alternateNumber,
      });

      oldAcDoc = result.oldAcDoc;

      newEnquiry.noOfAc = result.noOfAc;
      await newEnquiry.save();
    }

    let copperPipingData = null;

    if (subType === "COPPER_PIPING") {
      if (!copperPipingDetails) {
        return res.status(400).json({
          status: false,
          message: "Copper piping details required",
        });
      }

      const copperDoc = await CopperPipingEnquiry.create({
        enquiryId: newEnquiry._id,
        propertyType: copperPipingDetails.propertyType,
        acTypes: copperPipingDetails.acTypes,
        outdoorUnitLocation: copperPipingDetails.outdoorUnitLocation,
        pipeLength: copperPipingDetails.pipeLength,
        additionalNotes: copperPipingDetails.additionalNotes,
        images: copperPipingDetails.images,
      });

      copperPipingData = copperDoc;
    }

    // const userToken = await User.findOne({ _id: user_id }).select(
    //   "deviceToken name",
    // );

    // if (userToken) {
    //   if (!userToken.name) {
    //     await User.updateOne({ _id: user_id }, { name });
    //   }

    //   if (userToken.deviceToken && userToken.deviceToken !== "") {
    //     const registrationToken = userToken.deviceToken;
    //     const title = "Old AC Request";
    //     const body = "Your Old AC request has been created successfully.";

    //     await sendPushNotification(registrationToken, title, body);

    //     await Notification.create({
    //       userId: user_id,
    //       title,
    //       text: body,
    //     });
    //   }
    // }

    const userData = await User.findOne({ _id: user_id }).select("deviceToken");

    let notificationTitle = "";
    let notificationText = "";

    switch (subType) {
      case "BOOKING":
        notificationTitle = "Booking Created";
        notificationText =
          "Your service booking has been created successfully.";
        break;

      case "AMC":
        notificationTitle = "AMC Request Submitted";
        notificationText = "Your AMC enquiry has been submitted successfully.";
        break;

      case "OLD_AC":
        notificationTitle = "Old AC Request Submitted";
        notificationText =
          "Your old AC enquiry has been submitted successfully.";
        break;

      case "FREE_CONSULTATION":
        notificationTitle = "Consultation Requested";
        notificationText = "Your free consultation request has been submitted.";
        break;

      case "COPPER_PIPING":
        notificationTitle = "Copper Piping Request Submitted";
        notificationText =
          "Your copper piping enquiry has been submitted successfully.";
        break;

      default:
        notificationTitle = "Enquiry Submitted";
        notificationText = "Your enquiry has been submitted successfully.";
    }

    /* Save notification in DB */
    await Notification.create({
      userId: user_id,
      title: notificationTitle,
      text: notificationText,
    });

    /* Send push notification */
    if (userData?.deviceToken && userData.deviceToken.trim() !== "") {
      await sendPushNotification(
        userData.deviceToken,
        notificationTitle,
        notificationText,
      );
    }

    return res.status(201).json({
      status: STATUS.SUCCESS,
      message: "Old AC enquiry created successfully",
      data: {
        enquiry: newEnquiry,
        oldAcDetails: oldAcDoc,
        copperPipingDetails: copperPipingData,
      },
    });
  } catch (error) {
    console.error("Error creating Old AC enquiry:", error);
    // await cleanupCopperPipingImages(copperPipingDetails);
    // await cleanupOldAcPhotos(oldAcDetails);

    if (typeof copperPipingDetails !== "undefined") {
    await cleanupCopperPipingImages(copperPipingDetails);
  }

  if (typeof oldAcDetails !== "undefined") {
    await cleanupOldAcPhotos(oldAcDetails);
  }

    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getEnquiryById = async (req, res) => {
  try {
    const enquiryId = req.params.id;

    if (!enquiryId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Enquiry ID is required",
      });
    }

    const enquiry = await Enquiry.aggregate([
      {
        $match: { _id: new Types.ObjectId(enquiryId) },
      },

      // ✅ USER LOOKUP (ONLY REQUIRED FIELDS)
      {
        $lookup: {
          from: "users",
          let: { userId: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$userId"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                phoneNumber: 1,
                email: 1,
                countryCode: 1,
                profilePhoto: 1,
              },
            },
          ],
          as: "user_info",
        },
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ TECHNICIAN LOOKUP (ONLY REQUIRED FIELDS)
      {
        $lookup: {
          from: "technicians",
          let: { techId: "$assignedTo" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$techId"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                phoneNumber: 1,
                countryCode: 1,
                email: 1,
                profilePhoto: 1,
              },
            },
          ],
          as: "technician_info",
        },
      },
      {
        $unwind: {
          path: "$technician_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ OLD AC DETAILS LOOKUP
      {
        $lookup: {
          from: "oldacenquirydetails",
          localField: "_id",
          foreignField: "enquiryId",
          as: "oldAcDoc",
        },
      },

      // ✅ COPPER PIPING DETAILS LOOKUP
      {
        $lookup: {
          from: "copperpipingenquiries",
          localField: "_id",
          foreignField: "enquiryId",
          as: "copperDoc",
        },
      },

      {
        $lookup: {
          from: "leads",
          let: { enquiryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$enquiryId", "$$enquiryId"] },
              },
            },
          ],
          as: "leadDoc",
        },
      },
      {
        $unwind: {
          path: "$leadDoc",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "consultancies",
          let: { enquiryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$enquiryId", "$$enquiryId"] },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "consultancyDoc",
        },
      },
      {
        $unwind: {
          path: "$consultancyDoc",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "bookings",
          let: { enquiryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$enquiryId", "$$enquiryId"] },
              },
            },
            {
              $project: {
                _id: 1,
                bookingId: 1,
                amount: 1,
                date: 1,
                slot: 1,
                status: 1,
                order_id: 1,
                orderItems: 1,
                serviceDetails: 1,
                createdAt: 1,
              },
            },
          ],
          as: "booking_info",
        },
      },
      {
        $unwind: {
          path: "$booking_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "purchaseleads",
          let: { enquiryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$enquiryId", "$$enquiryId"] },
              },
            },
            {
              $lookup: {
                from: "products",
                let: { productId: "$productId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$productId"] },
                    },
                  },
                ],
                as: "product_info",
              },
            },
            {
              $unwind: {
                path: "$product_info",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "purchaseLeadDoc",
        },
      },
      {
        $unwind: {
          path: "$purchaseLeadDoc",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ INSPECTION LOOKUP (FETCH LATEST BY SUBTYPE)
      {
        $lookup: {
          from: "inspections",
          let: { enquiryId: "$_id", subType: "$subType" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$enquiryId", "$$enquiryId"] },
                    { $eq: ["$subType", "$$subType"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "inspectionDoc",
        },
      },
      {
        $unwind: {
          path: "$inspectionDoc",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ Extract OLD AC DETAILS ARRAY
      {
        $addFields: {
          oldAcDetails: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [{ $arrayElemAt: ["$oldAcDoc.oldAcDetails", 0] }, []],
              },
              else: [],
            },
          },

          // BULK FIELDS
          totalNoOfAC: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [{ $arrayElemAt: ["$oldAcDoc.totalNoOfAC", 0] }, 0],
              },
              else: 0,
            },
          },

          brand: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [{ $arrayElemAt: ["$oldAcDoc.brand", 0] }, ""],
              },
              else: "",
            },
          },

          alternateNumber: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [
                  { $arrayElemAt: ["$oldAcDoc.alternateNumber", 0] },
                  "",
                ],
              },
              else: "",
            },
          },

          propertyType: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [{ $arrayElemAt: ["$oldAcDoc.propertyType", 0] }, ""],
              },
              else: "",
            },
          },
        },
      },

      // ✅ Merge OLD AC inspection quotation inside oldAcDetails
      {
        $addFields: {
          oldAcDetails: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $map: {
                  input: "$oldAcDetails",
                  as: "ac",
                  in: {
                    $mergeObjects: [
                      "$$ac",
                      {
                        inspectionDetails: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: {
                                  $ifNull: ["$inspectionDoc.acQuotations", []],
                                },
                                as: "quote",
                                cond: {
                                  $eq: ["$$quote.oldAcDetailId", "$$ac._id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              else: [],
            },
          },
        },
      },

      // ✅ COPPER PIPING DETAILS OBJECT
      {
        $addFields: {
          copperPipingDetails: {
            $cond: {
              if: { $eq: ["$subType", "COPPER_PIPING"] },
              then: {
                $mergeObjects: [
                  { $ifNull: [{ $arrayElemAt: ["$copperDoc", 0] }, {}] },
                  {
                    inspectionDetails: {
                      $ifNull: ["$inspectionDoc.copperPipingDetails", {}],
                    },
                  },
                ],
              },
              else: {},
            },
          },
          noOfAc: {
            $cond: {
              if: { $eq: ["$subType", "COPPER_PIPING"] },
              then: {
                $let: {
                  vars: {
                    copper: { $arrayElemAt: ["$copperDoc", 0] },
                  },
                  in: {
                    $sum: {
                      $map: {
                        input: { $ifNull: ["$$copper.acTypes", []] },
                        as: "ac",
                        in: "$$ac.quantity",
                      },
                    },
                  },
                },
              },
              else: "$noOfAc",
            },
          },
          noOfAc: {
            $cond: {
              if: { $eq: ["$subType", "COPPER_PIPING"] },
              then: {
                $let: {
                  vars: {
                    copper: { $arrayElemAt: ["$copperDoc", 0] },
                  },
                  in: {
                    $sum: {
                      $map: {
                        input: { $ifNull: ["$$copper.acTypes", []] },
                        as: "ac",
                        in: "$$ac.quantity",
                      },
                    },
                  },
                },
              },
              else: "$noOfAc",
            },
          },
        },
      },

      {
        $addFields: {
          amcDetails: {
            $cond: {
              if: { $eq: ["$subType", "AMC"] },
              then: {
                _id: "$leadDoc._id",
                leadId: "$leadDoc.leadId",
                username: "$leadDoc.username",
                phoneNumber: "$leadDoc.phoneNumber",
                place: "$leadDoc.place",
                address: "$leadDoc.address",
                quantity: "$leadDoc.quantity",
                acDetails: "$leadDoc.acDetails",
                comment: "$leadDoc.comment",
                createdAt: "$leadDoc.createdAt",
              },
              else: {},
            },
          },
        },
      },

      {
        $addFields: {
          consultancyDetails: {
            $cond: {
              if: { $eq: ["$subType", "FREE_CONSULTATION"] },
              then: {
                _id: "$consultancyDoc._id",
                consultancyId: "$consultancyDoc.consultancyId",
                brandId: "$consultancyDoc.brandId",
                alternatePhone: "$consultancyDoc.alternatePhone",
                quantity: "$consultancyDoc.quantity",
                comment: "$consultancyDoc.comment",
                place: "$consultancyDoc.place",
                documentURL: "$consultancyDoc.documentURL",
                slot: "$consultancyDoc.slot",
                date: "$consultancyDoc.date",
                createdAt: "$consultancyDoc.createdAt",
              },
              else: {},
            },
          },
        },
      },

      {
        $addFields: {
          purchaseLeadDetails: {
            $cond: {
              if: { $eq: ["$subType", "PURCHASE_LEAD"] },
              then: {
                _id: "$purchaseLeadDoc._id",
                purchaseId: "$purchaseLeadDoc.purchaseId",
                quantity: "$purchaseLeadDoc.quantity",
                unitPrice: "$purchaseLeadDoc.unitPrice",
                soldAmount: "$purchaseLeadDoc.soldAmount",
                status: "$purchaseLeadDoc.status",
                remarks: "$purchaseLeadDoc.remarks",
                source: "$purchaseLeadDoc.source",
                nextFollowUpAt: "$purchaseLeadDoc.nextFollowUpAt",
                createdAt: "$purchaseLeadDoc.createdAt",
                product: {
                  _id: "$purchaseLeadDoc.product_info._id",
                  name: "$purchaseLeadDoc.product_info.name",
                  brand: "$purchaseLeadDoc.product_info.brand",
                  model: "$purchaseLeadDoc.product_info.model",
                  images: "$purchaseLeadDoc.product_info.images",
                  category: "$purchaseLeadDoc.product_info.category",
                  pricing: "$purchaseLeadDoc.product_info.pricing",
                  specifications:
                    "$purchaseLeadDoc.product_info.specifications",
                },
              },
              else: {},
            },
          },
        },
      },

      // ✅ Remove extra unwanted docs
      {
        $project: {
          oldAcDoc: 0,
          copperDoc: 0,
          inspectionDoc: 0,
          leadDoc: 0,
          consultancyDoc: 0,
          purchaseLeadDoc: 0,
        },
      },
    ]);

    if (!enquiry || enquiry.length === 0) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Enquiry not found",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: enquiry[0],
    });
  } catch (error) {
    console.error("Error fetching enquiry details:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.cancelEnquiry = async (req, res) => {
  try {
    const { enquiryId, reason } = req.body;
    const userId = req.user._id;

    if (!enquiryId) {
      return res.status(400).json({
        status: false,
        message: "Enquiry id is required",
      });
    }

    const enquiry = await Enquiry.findOne({ _id: enquiryId });

    if (!enquiry) {
      return res.status(404).json({
        status: false,
        message: "Enquiry not found",
      });
    }

    if (enquiry.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to cancel this enquiry",
      });
    }

    if (["CANCELLED", "COMPLETED"].includes(enquiry.status)) {
      return res.status(400).json({
        status: false,
        message: `Enquiry already ${enquiry.status}`,
      });
    }

    enquiry.status = "CANCELLED";
    enquiry.cancelReason = reason || "User cancelled the enquiry";
    enquiry.cancelledBy = "USER";
    enquiry.cancelledAt = new Date();
    await enquiry.save();

    if (enquiry.bookingId) {
      await Booking.updateOne(
        { _id: enquiry.bookingId },
        {
          status: "CANCELLED",
          cancelReason: reason || "User cancelled the enquiry",
          cancelledBy: "USER",
          cancelledAt: new Date(),
        },
      );
    }

    if (enquiry.assignedTo) {
      await Technician.updateOne(
        { _id: enquiry.assignedTo },
        { status: "AVAILABLE" },
      );
    }

    if (enquiry.assignedTo) {
      const technician = await Technician.findOne({
        _id: enquiry.assignedTo,
      }).select("deviceToken");

      if (technician?.deviceToken) {
        await sendPushNotification(
          technician.deviceToken,
          "Enquiry Cancelled",
          "Customer has cancelled the enquiry.",
        );
      }
    }

    return res.status(200).json({
      status: true,
      message: "Enquiry cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// exports.requestRevisit = async (req, res) => {
//   try {
//     const { enquiryId, reason, date, slot } = req.body;
//     const userId = req.user._id;

//     if (!date || !slot) {
//       return res.status(400).json({
//         status: false,
//         message: "Date and slot are required for revisit",
//       });
//     }

//     const bookingDate = new Date(date);
//     bookingDate.setHours(0, 0, 0, 0);
//     const today = new Date();

//     // reset time for accurate comparison
//     today.setHours(0, 0, 0, 0);

//     if (bookingDate < today) {
//       return res.status(400).json({
//         status: false,
//         message: "Cannot select past date for revisit",
//       });
//     }

//     if (!["FIRST_HALF", "SECOND_HALF"].includes(slot)) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid slot selected",
//       });
//     }
    
//     const now = new Date();

//     if (bookingDate.getTime() === today.getTime()) {
//       const currentHour = now.getHours();

//       if (slot === "FIRST_HALF" && currentHour >= 12) {
//         return res.status(400).json({
//           status: false,
//           message: "First half slot is already over",
//         });
//       }

//       if (slot === "SECOND_HALF" && currentHour >= 18) {
//         return res.status(400).json({
//           status: false,
//           message: "Second half slot is already over",
//         });
//       }
//     }

//     const booking = await Booking.findOne({ _id: enquiryId });
    
//     console.log("Booking: ", booking)

//     if (!booking) {
//       return res.status(404).json({
//         status: false,
//         message: "Booking not found",
//       });
//     }

//     if (booking.user_id.toString() !== userId.toString()) {
//       return res.status(403).json({
//         status: false,
//         message: "Unauthorized",
//       });
//     }

//     // const existingBooking = await Booking.findOne({
//     //   date: new Date(date),
//     //   slot,
//     //   status: { $nin: ["COMPLETE", "PAYMENT_PENDING", "PAID"] },
//     // });

//     // if (existingBooking) {
//     //   return res.status(400).json({
//     //     status: false,
//     //     message: "Selected slot is not available",
//     //   });
//     // }
    

//     // Only after completion
//     if (!["COMPLETE", "PAYMENT_PENDING", "PAID"].includes(booking.status)) {
//       return res.status(400).json({
//         status: false,
//         message: "Revisit allowed only after completion",
//       });
//     }

//     const completionTime = new Date(booking.updatedAt);
//     const nowTime = new Date();

//     const diffHours = (nowTime - completionTime) / (1000 * 60 * 60);

//     if (diffHours > 48) {
//       return res.status(400).json({
//         status: false,
//         message: "Revisit request window expired",
//       });
//     }

//     // Only once (ROOT CHECK)
//     const rootBookingId = booking.parentBookingId || booking._id;

//     const existingRevisit = await Booking.findOne({
//       parentBookingId: rootBookingId,
//       isRevisit: true,
//     });

//     if (existingRevisit || booking.isRevisit) {
//       return res.status(400).json({
//         status: false,
//         message: "Only one revisit allowed",
//       });
//     }

//     const oldEnquiry = await Enquiry.findById(booking.enquiryId);

//     if (!oldEnquiry) {
//       return res.status(404).json({
//         status: false,
//         message: "Parent enquiry not found",
//       });
//     }

//     // Create enquiry
//     const newEnquiry = await Enquiry.create({
//       user_id: booking.user_id,
//       enquiryId: oldEnquiry.enquiryId,
//       type: "BOOKING",
//       subType: oldEnquiry?.subType,
//       details: oldEnquiry?.details,
//       addressDetails: oldEnquiry?.addressDetails,
//       parentEnquiryId: oldEnquiry?._id,
//       schedule: {
//         date: bookingDate,
//         slot,
//       },
//       isRevisit: true,
//       revisitReason: reason || "Not satisfied",
//       status: "REQUESTED",
//     });

//     // Create booking
//     const newBooking = await Booking.create({
//       user_id: booking.user_id,
//       bookingId: booking.bookingId,
//       serviceDetails: booking.serviceDetails,
//       addressDetails: booking.addressDetails,
//       date: bookingDate,
//       slot,
//       enquiryId: newEnquiry._id,
//       parentBookingId: rootBookingId,
//       isRevisit: true,
//       revisitReason: reason || "Not satisfied",
//       status: "BOOKED",
//       amount: booking.amount,
//       couponDetails: booking.couponDetails,
//       tax: booking.tax,
//       grandTotal: booking.grandTotal,
//     });

//     // link
//     newEnquiry.bookingId = newBooking._id;
//     await newEnquiry.save();

//     return res.status(200).json({
//       status: true,
//       message: "Revisit created successfully",
//       data: {
//         bookingId: newBooking._id,
//         enquiryId: newEnquiry._id,
//         parentBookingId: newBooking.parentBookingId,
//         isRevisit: newEnquiry.isRevisit,
//       },
//     });
//   } catch (error) {
//     console.log("revisit error: ", error)
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//     });
//   }
// };

// exports.rescheduleEnquiry = async (req, res) => {
//   try {
//     const { enquiryId, newDate, newSlot, reason } = req.body;
//     const userId = req.user._id;

//     if (!enquiryId || !newDate || !newSlot) {
//       return res.status(400).json({
//         status: false,
//         message: "Enquiry id, new date and new slot are required",
//       });
//     }

//     const enquiry = await Enquiry.findOne({ _id: enquiryId });

//     if (!enquiry) {
//       return res.status(404).json({
//         status: false,
//         message: "Job not found",
//       });
//     }

//     if (enquiry.user_id.toString() !== userId.toString()) {
//       return res.status(403).json({
//         status: false,
//         message: "You are not allowed to reschedule this job",
//       });
//     }

//     if (!ALLOWED_RESCHEDULE_STATUS.includes(enquiry.status)) {
//       return res.status(400).json({
//         status: false,
//         message: `Enquiry cannot be rescheduled when status is ${enquiry.status}`,
//       });
//     }

//     enquiry.schedule.date = new Date(newDate);
//     enquiry.schedule.slot = newSlot;

//     enquiry.status = "RESCHEDULED";
//     enquiry.rescheduleReason = reason || "";
//     enquiry.rescheduledAt = new Date();

//     await enquiry.save();

//     return res.status(200).json({
//       status: true,
//       message: "Enquiry rescheduled successfully",
//       data: enquiry,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//     });
//   }
// };

exports.requestRevisit = async (req, res) => {
  try {
    const { enquiryId, reason } = req.body;
    const userId = req.user._id;

    // if (!date || !slot) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Date and slot are required",
    //   });
    // }

    // const bookingDate = new Date(date);
    // bookingDate.setHours(0, 0, 0, 0);

    // const today = new Date();
    // today.setHours(0, 0, 0, 0);

    // if (bookingDate < today) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Cannot select past date",
    //   });
    // }

    // if (!["FIRST_HALF", "SECOND_HALF"].includes(slot)) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Invalid slot",
    //   });
    // }

    // Get Enquiry
    const enquiry = await Enquiry.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({
        status: false,
        message: "Enquiry not found",
      });
    }

    if (enquiry.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized",
      });
    }

    // Only after completion
    if (!["COMPLETED", "PAYMENT_PENDING", "PAID"].includes(enquiry.status)) {
      return res.status(400).json({
        status: false,
        message: "Revisit allowed only after completion",
      });
    }

    // 48-hour window
    const diffHours =
      (new Date() - new Date(enquiry.updatedAt)) / (1000 * 60 * 60);

    if (diffHours > 48) {
      return res.status(400).json({
        status: false,
        message: "Revisit window expired",
      });
    }

    // ROOT CHECK
    const rootEnquiryId = enquiry.parentEnquiryId || enquiry._id;

    const existingRevisit = await Enquiry.findOne({
      parentEnquiryId: rootEnquiryId,
      isRevisit: true,
    });

    if (existingRevisit || enquiry.isRevisit) {
      return res.status(400).json({
        status: false,
        message: "Only one revisit allowed",
      });
    }

    // Create new enquiry
    const newEnquiry = await Enquiry.create({
      user_id: enquiry.user_id,
      enquiryId: enquiry.enquiryId,
      type: enquiry.type,
      subType: enquiry.subType,
      details: enquiry.details,
      addressDetails: enquiry.addressDetails,
      parentEnquiryId: rootEnquiryId,
      // schedule: {
      //   date: bookingDate,
      //   slot,
      // },
      isRevisit: true,
      revisitReason: reason || "Not satisfied",
      status: "REQUESTED",
    });

    let newBooking = null;

    // Create booking ONLY if original had one
    if (enquiry.bookingId) {
      const oldBooking = await Booking.findById(enquiry.bookingId);

      if (oldBooking) {
        const rootBookingId = oldBooking.parentBookingId || oldBooking._id;

        newBooking = await Booking.create({
          user_id: oldBooking.user_id,
          bookingId: oldBooking.bookingId,
          serviceDetails: oldBooking.serviceDetails,
          addressDetails: oldBooking.addressDetails,
          // date: bookingDate,
          // slot,
          enquiryId: newEnquiry._id,
          parentBookingId: rootBookingId,
          isRevisit: true,
          revisitReason: reason || "Not satisfied",
          status: "BOOKED",
          amount: oldBooking.amount,
          couponDetails: oldBooking.couponDetails,
          tax: oldBooking.tax,
          grandTotal: oldBooking.grandTotal,
        });

        newEnquiry.bookingId = newBooking._id;
        await newEnquiry.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Revisit created successfully",
      data: {
        enquiryId: newEnquiry._id,
        bookingId: newBooking?._id || null,
        parentEnquiryId: newEnquiry.parentEnquiryId,
        isRevisit: newEnquiry.isRevisit,
      },
    });
  } catch (error) {
    console.log("revisit error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.rescheduleEnquiry = async (req, res) => {
  try {
    const { enquiryId, newDate, newSlot, reason } = req.body;
    const userId = req.user._id;

    if (!enquiryId || !newDate || !newSlot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Enquiry id, new date and new slot are required",
      });
    }

    const enquiry = await Enquiry.findOne({ _id: enquiryId });

    if (!enquiry) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Enquiry not found",
      });
    }

    if (enquiry.user_id.toString() !== userId.toString()) {
      return res.status(CODES.FORBIDDEN).json({
        status: STATUS.FAIL,
        message: "You are not allowed to reschedule this job",
      });
    }

    // console.log("reschedule status: ", enquiry.status)

    if (!ALLOWED_RESCHEDULE_STATUS.includes(enquiry.status)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: `Enquiry cannot be rescheduled when status is ${enquiry.status}`,
      });
    }

    if (!enquiry.schedule || !enquiry.schedule.date || !enquiry.schedule.slot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Enquiry schedule is not properly set",
      });
    }

    const newDateObj = new Date(newDate);
    const existingDateObj = new Date(enquiry.schedule.date);

    if (isNaN(newDateObj) || isNaN(existingDateObj)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Invalid date provided",
      });
    }

    const newDateOnly = newDateObj.toISOString().split("T")[0];
    const existingDateOnly = existingDateObj.toISOString().split("T")[0];

    if (newDateOnly === existingDateOnly && enquiry.schedule.slot === newSlot) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Enquiry is already scheduled for the selected date and time slot. Please choose a different slot.",
      });
    }

    // ✅ Update fields
    enquiry.schedule.date = new Date(newDate);
    enquiry.schedule.slot = newSlot;
    enquiry.status = "RESCHEDULED";
    enquiry.rescheduleReason = reason || "";
    enquiry.rescheduledAt = new Date();

    await enquiry.save();

    // ✅ Fetch updated enriched enquiry using same aggregation pipeline
    const updatedEnquiry = await Enquiry.aggregate([
      {
        $match: { _id: new Types.ObjectId(enquiryId) },
      },

      // ---------------- USER LOOKUP ----------------
      // {
      //   $lookup: {
      //     from: "users",
      //     let: { userId: "$user_id" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: { $eq: ["$_id", "$$userId"] },
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 1,
      //           name: 1,
      //           phoneNumber: 1,
      //           email: 1,
      //           countryCode: 1,
      //           profilePhoto: 1,
      //         },
      //       },
      //     ],
      //     as: "user_info",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$user_info",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      // ---------------- TECHNICIAN LOOKUP ----------------
      {
        $lookup: {
          from: "technicians",
          let: { techId: "$assignedTo" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$techId"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                phoneNumber: 1,
                countryCode: 1,
                email: 1,
                profilePhoto: 1,
              },
            },
          ],
          as: "technician_info",
        },
      },
      {
        $unwind: {
          path: "$technician_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ---------------- OLD AC LOOKUP ----------------
      {
        $lookup: {
          from: "oldacenquirydetails",
          localField: "_id",
          foreignField: "enquiryId",
          as: "oldAcDoc",
        },
      },

      // ---------------- COPPER LOOKUP ----------------
      {
        $lookup: {
          from: "copperpipingenquiries",
          localField: "_id",
          foreignField: "enquiryId",
          as: "copperDoc",
        },
      },

      // ---------------- INSPECTION LOOKUP ----------------
      {
        $lookup: {
          from: "inspections",
          let: { enquiryId: "$_id", subType: "$subType" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$enquiryId", "$$enquiryId"] },
                    { $eq: ["$subType", "$$subType"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "inspectionDoc",
        },
      },
      {
        $unwind: {
          path: "$inspectionDoc",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ---------------- OLD AC DETAILS ----------------
      {
        $addFields: {
          oldAcDetails: {
            $cond: {
              if: { $eq: ["$subType", "OLD_AC"] },
              then: {
                $ifNull: [{ $arrayElemAt: ["$oldAcDoc.oldAcDetails", 0] }, []],
              },
              else: [],
            },
          },
        },
      },

      // ---------------- COPPER DETAILS ----------------
      {
        $addFields: {
          copperPipingDetails: {
            $cond: {
              if: { $eq: ["$subType", "COPPER_PIPING"] },
              then: {
                $mergeObjects: [
                  { $ifNull: [{ $arrayElemAt: ["$copperDoc", 0] }, {}] },
                  {
                    inspectionDetails: {
                      $ifNull: ["$inspectionDoc.copperPipingDetails", {}],
                    },
                  },
                ],
              },
              else: {},
            },
          },
        },
      },

      {
        $project: {
          oldAcDoc: 0,
          copperDoc: 0,
          inspectionDoc: 0,
        },
      },
    ]);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Enquiry rescheduled successfully",
      data: updatedEnquiry[0],
    });
  } catch (error) {
    console.error("Error rescheduling enquiry:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.submitInspection = async (req, res) => {
  try {
    const { enquiryId, subType, acQuotations, copperPipingDetails } = req.body;
    const technicianId = req.technicianId;

    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry)
      return res
        .status(404)
        .json({ status: false, message: "Enquiry not found" });

    if (
      !enquiry.assignedTo ||
      enquiry.assignedTo.toString() !== technicianId.toString()
    )
      return res.status(403).json({ status: false, message: "Not assigned" });

    if (subType === "OLD_AC") {
      const oldAc = await OldAcEnquiryDetail.findOne({ enquiryId });

      if (!oldAc)
        return res
          .status(404)
          .json({ status: false, message: "Old AC details not found" });

      const validIds = oldAc.oldAcDetails.map((ac) => ac._id.toString());

      for (let q of acQuotations) {
        if (
          !q.oldAcDetailId ||
          !validIds.includes(q.oldAcDetailId.toString())
        ) {
          return res.status(400).json({
            status: false,
            message: "Invalid oldAcDetailId in quotation",
          });
        }
      }
    }

    const newInspection = await inspection.findOneAndUpdate(
      { enquiryId, subType },
      {
        technicianId,
        subType,
        acQuotations: subType === "OLD_AC" ? acQuotations : [],
        copperPipingDetails:
          subType === "COPPER_PIPING" ? copperPipingDetails : null,
        status: "INSPECTED",
      },
      { new: true, upsert: true },
    );

    enquiry.status = "INSPECTION_COMPLETED";
    await enquiry.save();

    return res.json({
      status: true,
      message: "Inspection submitted successfully",
      data: newInspection,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.adminSubmitOffer = async (req, res) => {
  try {
    const { enquiryId, offers } = req.body;

    const inspectionData = await inspection.findOne({ enquiryId });

    console.log(
      inspectionData,
      "inspectionDatainspectionDatainspectionDatainspectionDatainspectionDatainspectionData",
    );

    if (!inspectionData)
      return res.status(404).json({
        status: false,
        message: "Inspection not found",
      });

    if (inspectionData.status !== "INSPECTED") {
      return res.status(400).json({
        status: false,
        message: "Inspection not completed yet",
      });
    }

    let totalAmount = 0;

    //  OLD_AC
    if (inspectionData.subType === "OLD_AC") {
      offers.forEach((item) => {
        if (inspectionData.acQuotations[item.index]) {
          inspectionData.acQuotations[item.index].offeredAmount =
            item.offeredAmount;

          totalAmount += item.offeredAmount;
        }
      });
    }

    //  COPPER_PIPING
    if (inspectionData.subType === "COPPER_PIPING") {
      inspectionData.copperPipingDetails.offeredAmount = req.body.offeredAmount;

      totalAmount = req.body.offeredAmount;
    }

    inspectionData.totalOfferAmount = totalAmount;
    inspectionData.status = "QUOTE_SHARED";

    await inspectionData.save();

    await Enquiry.updateOne({ _id: enquiryId }, { status: "QUOTE_SHARED" });

    return res.json({
      status: true,
      message: "Offer submitted successfully",
      data: inspectionData,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.respondToOffer = async (req, res) => {
  try {
    const { inspectionId, itemId, action, reason } = req.body;

    if (!inspectionId || !["ACCEPT", "REJECT"].includes(action)) {
      return res.status(400).json({
        status: false,
        message: "Invalid request",
      });
    }

    const inspectionData = await inspection.findById(inspectionId);

    if (!inspectionData) {
      return res.status(404).json({
        status: false,
        message: "Inspection not found",
      });
    }

    if (
      inspectionData.status === "ACCEPTED" ||
      inspectionData.status === "REJECTED"
    ) {
      return res.status(400).json({
        status: false,
        message: "Offer already finalized",
      });
    }

    if (inspectionData.subType === "OLD_AC") {
      if (!itemId) {
        return res.status(400).json({
          status: false,
          message: "AC itemId required",
        });
      }

      const acItem = inspectionData.acQuotations.id(itemId);

      if (!acItem) {
        return res.status(404).json({
          status: false,
          message: "AC quotation not found",
        });
      }

      if (acItem.status !== "PENDING") {
        return res.status(400).json({
          status: false,
          message: "Already responded",
        });
      }

      if (action === "ACCEPT") {
        acItem.status = "ACCEPTED";
      }

      if (action === "REJECT") {
        if (!reason) {
          return res.status(400).json({
            status: false,
            message: "Rejection reason required",
          });
        }
        acItem.status = "REJECTED";
        acItem.rejectionReason = reason;
      }

      const items = inspectionData.acQuotations;

      const acceptedCount = items.filter((i) => i.status === "ACCEPTED").length;
      const rejectedCount = items.filter((i) => i.status === "REJECTED").length;

      if (acceptedCount === items.length) {
        inspectionData.status = "ACCEPTED";
      } else if (rejectedCount === items.length) {
        inspectionData.status = "REJECTED";
      } else {
        inspectionData.status = "PARTIAL";
      }

      inspectionData.totalOfferAmount = items
        .filter((i) => i.status === "ACCEPTED")
        .reduce((sum, item) => sum + item.offeredAmount, 0);
    }

    if (inspectionData.subType === "COPPER_PIPING") {
      const piping = inspectionData.copperPipingDetails;

      if (!piping) {
        return res.status(400).json({
          status: false,
          message: "Copper piping data not found",
        });
      }

      if (piping.status !== "PENDING") {
        return res.status(400).json({
          status: false,
          message: "Already responded",
        });
      }

      if (action === "ACCEPT") {
        piping.status = "ACCEPTED";
        inspectionData.status = "ACCEPTED";
        inspectionData.totalOfferAmount = piping.offeredAmount;
      }

      if (action === "REJECT") {
        if (!reason) {
          return res.status(400).json({
            status: false,
            message: "Rejection reason required",
          });
        }

        piping.status = "REJECTED";
        piping.rejectionReason = reason;
        inspectionData.status = "REJECTED";
        inspectionData.totalOfferAmount = 0;
      }
    }

    await inspectionData.save();

    await Enquiry.updateOne(
      { _id: inspectionData.enquiryId },
      {
        status:
          inspectionData.status == "REJECTED"
            ? "QUOTE_REJECTED"
            : "QUOTE_ACCEPTED",
      },
    );

    return res.json({
      status: true,
      message: `Offer ${action.toLowerCase()}ed successfully`,
      data: inspectionData,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
