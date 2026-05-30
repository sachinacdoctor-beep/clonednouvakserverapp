const { Types, default: mongoose } = require("mongoose");
const Technician = require("../../models/Technician/technician.model");
const { STATUS, MESSAGES, CODES } = require("../../Config/responseConstants");
const Booking = require("../../models/Bookings/booking.model");
const { generateRandom4Digit, sendOTPSMS } = require("../../Utils/common");
const TechnicianAuth = require("../../models/Technician/technician_auth.model");
const moment = require("moment");

const jwt = require("jsonwebtoken");
const {
  getPresignedUrl,
  deleteMultipleFromS3,
  cleanupServiceReportPhotos,
  getMultiplePresignedUrls,
  safeDelete,
} = require("../../Utils/s3");
const Attendance = require("../../models/Attendance/Attendance.model");
const Leave = require("../../models/Attendance/Leave.model");
const ToolRequest = require("../../models/Tools/ToolRequest.model");
const Holiday = require("../../models/Attendance/Holiday.model");
const Tool = require("../../models/Tools/tools.model");
const AssignedTool = require("../../models/Tools/AssignedTool.model");
const Notification = require("../../models/Notifications/notification.model");
const MaterialModel = require("../../models/Material/Material.model");
const serviceReportModel = require("../../models/ServiceReport/serviceReport.model");
const technicianServiceReport = require("../../models/ServiceReport/technicainServiceReport");
const {
  getTotalAcQuantity,
  getDateRange,
} = require("../../middlewares/Technician/custom");
const User = require("../../models/User/user.model");
const ReportTool = require("../../models/Tools/ReportTool");
const ActivityPoint = require("../../models/Performance/performance");
const { validateAndPrepareACs } = require("../../Helper/acHelper");
const {
  creditPointsForCompletedACs,
} = require("../../Helper/creditPointContractor");
const ContractorPointLedger = require("../../models/Technician/contractorLedger");
const redeemptionRequest = require("../../models/Technician/redeemptionRequest");
const RedemptionConfig = require("../../models/Technician/redeemptionRequest");
const TechnicianAddress = require("../../models/Technician/technicianAddress");
const {
  generateTechnicianTokens,
  generateAccessToken,
  generateRefreshToken,
} = require("../../middlewares/Technician/technician.auth");

const ALLOWED_POSITIONS = [
  "TBA",
  "HELPER",
  "TECHNICIAN",
  "SENIOR TECHNICIAN",
  "SUPERVISOR",
  "MANAGER",
];
const ALLOWED_TECHNICIAN_STATUS = [
  "PROFILE_CREATED",
  "KYC_PENDING",
  "ON_JOB",
  "AVAILABLE",
  "ON_LEAVE",
  "ON_BREAK",
  "ON_TRAINING",
];
const ALLOWED_TECHNICIAN_KYC_STATUS = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "REQUESTED",
];

const KYC_PENDING = "KYC_PENDING";
const VERIFIED = "VERIFIED";
const REJECTED = "REJECTED";
const REQUESTED = "REQUESTED";
const AVAILABLE = "AVAILABLE";
const TBU = "TBU"; // To be uploaded
const SIGNED_UP = "SIGNED_UP";
const PROFILE_CREATED = "PROFILE_CREATED";
const TBA = "TBA";

function buildDateFilter(query) {
  const { filter, startDate, endDate } = query;

  let dateFilter = {};

  const now = new Date();

  switch (filter) {
    case "today":
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      dateFilter = {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      };
      break;

    case "week":
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);

      dateFilter = {
        createdAt: {
          $gte: firstDayOfWeek,
          $lt: lastDayOfWeek,
        },
      };
      break;

    case "month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      dateFilter = {
        createdAt: {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
      };
      break;

    case "year":
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

      dateFilter = {
        createdAt: {
          $gte: startOfYear,
          $lt: endOfYear,
        },
      };
      break;

    case "custom":
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      }
      break;

    default:
      dateFilter = {};
  }

  return dateFilter;
}

exports.createTechnician = async (req, res) => {
  const {
    name,
    phoneNumber,
    joiningDate,
    profilePhoto,
    position,
    secondaryContactNumber,
    countryCode,
    type,
    email,
    dob,
    experience,
    professionalSkills,
    street,
    city,
    state,
    zipcode,
    house,
    landmark,
  } = req.body;

  try {
    const existingTechnician = await Technician.findOne({ phoneNumber });
    if (existingTechnician) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "A technician with the given phone number already exists",
      });
    }

    const technician = await Technician.create({
      name,
      phoneNumber,
      joiningDate,
      position,
      type,
      countryCode,
      profilePhoto: profilePhoto || "",
      status: KYC_PENDING,
      kycStatus: REQUESTED,
      secondaryContactNumber: secondaryContactNumber || "",
      dob: dob || null,
      email: email || null,
      experience: experience || "",
      professionalSkills: Array.isArray(professionalSkills)
        ? professionalSkills
        : [],
    });

    // Create technician address if address fields are provided
    let technicianAddress = null;
    if (street && city && state && zipcode) {
      technicianAddress = await TechnicianAddress.create({
        technicianId: technician._id,
        house: house || "",
        street,
        city,
        state,
        zipcode,
        landmark: landmark || "",
        isActive: true,
      });
    }

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TECHNICIAN_CREATED,
      data: {
        technician,
        address: technicianAddress,
      },
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.editTechnician = async (req, res) => {
  const {
    technicianId,
    name,
    joiningDate,
    profilePhoto,
    type,
    position,
    email,
    secondaryContactNumber,
    dob,
    experience,
    street,
    city,
    state,
    zipcode,
    house,
    landmark,
  } = req.body;

  const existingTechnician = await Technician.findById(technicianId);
  if (!existingTechnician) {
    return res.status(CODES.NOT_FOUND).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_NOT_FOUND,
    });
  }

  await Technician.updateOne(
    { _id: technicianId },
    {
      name: name || existingTechnician?.name,
      joiningDate: joiningDate || existingTechnician?.joiningDate,
      profilePhoto: profilePhoto || existingTechnician?.profilePhoto,
      position: position || existingTechnician?.position,
      type: type || existingTechnician?.type,
      dob: dob || existingTechnician?.dob,
      email: email || existingTechnician?.email,
      experience: experience || existingTechnician?.experience,
      secondaryContactNumber:
        secondaryContactNumber || existingTechnician?.secondaryContactNumber,
    },
  );

  const addressUpdate = {};
  if (house !== undefined) addressUpdate.house = house;
  if (street !== undefined) addressUpdate.street = street;
  if (city !== undefined) addressUpdate.city = city;
  if (state !== undefined) addressUpdate.state = state;
  if (zipcode !== undefined) addressUpdate.zipcode = zipcode;
  if (landmark !== undefined) addressUpdate.landmark = landmark;
  if (Object.keys(addressUpdate).length > 0) {
    const existingAddress = await TechnicianAddress.findOne({ technicianId });
    if (existingAddress) {
      await TechnicianAddress.updateOne(
        { technicianId },
        { $set: addressUpdate },
      );
    } else {
      if (!street || !city || !state || !zipcode) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message:
            "Street, city, state and zipcode are required to create a new address",
        });
      }
      await TechnicianAddress.create({
        technicianId,
        house: house || "",
        street,
        city,
        state,
        zipcode,
        landmark: landmark || "",
        isActive: true,
      });
    }
  }

  return res.status(CODES.SUCCESS).json({
    status: STATUS.SUCCESS,
    message: MESSAGES.TECHNICIAN_UPDATED,
  });
};

exports.updateKycStatus = async (req, res) => {
  const { technicianId, action } = req.body;

  if (!technicianId || !action) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Technician ID and action are required",
    });
  }

  if (!["APPROVE", "REJECT", "REQUEST"].includes(action.toUpperCase())) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Invalid action. Allowed actions are APPROVE, REQUEST or REJECT",
    });
  }

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    const updateData = {
      kycStatus: technician.kycStatus,
      status: technician.status,
    };

    switch (action.toUpperCase()) {
      case "REQUEST":
        updateData.kycStatus = REQUESTED;
        updateData.status = KYC_PENDING;
        break;
      case "APPROVE":
        updateData.kycStatus = VERIFIED;
        updateData.status = AVAILABLE;
        break;
      case "REJECT":
        updateData.kycStatus = REJECTED;
        updateData.status = KYC_PENDING;
        break;
    }

    await Technician.findByIdAndUpdate(technicianId, updateData, { new: true });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: `Technician KYC ${action.toUpperCase()}ED successfully`,
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.toggleTechnicianStatus = async (req, res) => {
  const { technicianId } = req.query;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Technician ID is required",
    });
  }

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    let newStatus;
    let registeredValue = technician.registered;
    if (technician.status === "DISABLED") {
      newStatus = technician.kycStatus === VERIFIED ? AVAILABLE : KYC_PENDING;
      registeredValue =
        technician.kycStatus === VERIFIED ? true : registeredValue;
    } else {
      newStatus = "DISABLED";
    }

    await Technician.findByIdAndUpdate(
      technicianId,
      { status: newStatus, registered: registeredValue },
      { new: true },
    );

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: `Technician status updated to ${newStatus}`,
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getTechnicianProfile = async (req, res) => {
  const { technicianId } = req.params;

  if (!technicianId || technicianId === "" || technicianId == null) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    const technician = await Technician.findById(technicianId);

    if (technician) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: technician,
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error("Error finding technician:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getTechnicianById = async (req, res) => {
  const { technicianId } = req.params;

  if (!technicianId || technicianId === "" || technicianId == null) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    const [technician, technicianAddress] = await Promise.all([
      Technician.findById(technicianId),
      TechnicianAddress.findOne({ technicianId }),
    ]);

    if (technician) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: {
          technician,
          address: technicianAddress,
        },
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error("Error finding technician:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.updateKyc = async (req, res) => {
  const { type, docUrl } = req.body;
  let comment = "Uploaded by technician";
  let technicianId = req.technicianId;
  if (!type || !docUrl) {
    console.log("type, docUrl, comment", type, docUrl, comment);
    return res.status(CODES.BAD_REQUEST).json({
      status: false,
      message: "All fields (type, docUrl, comment) are required",
    });
  }
  if (!technicianId) {
    if (docUrl) {
      await deleteMultipleFromS3(docUrl).catch(() => {});
    }
    technicianId = req.params.technicianId;
    comment = "Uploaded by admin";
  }

  if (!technicianId) {
    if (docUrl) {
      await deleteMultipleFromS3(docUrl).catch(() => {});
    }
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  // const { type, docUrl } = req.body;

  const existingTechnician = await Technician.findById(technicianId);

  if (!existingTechnician) {
    if (docUrl) {
      await deleteMultipleFromS3(docUrl).catch(() => {});
    }
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_NOT_FOUND,
    });
  }

  const updateResult = await Technician.updateOne(
    {
      _id: technicianId,
      "kycDocs.type": type.toUpperCase(),
    },
    {
      $set: {
        "kycDocs.$.url": docUrl,
        "kycDocs.$.comment": comment,
        // Set status to KYC_PENDING and kyc-status as REQUESTED at the time of kyc doc upload
        status: "KYC_PENDING",
        kycStatus: "REQUESTED",
      },
    },
  );

  if (updateResult.matchedCount === 0) {
    await Technician.updateOne(
      { _id: technicianId },
      {
        $push: {
          kycDocs: { type: type.toUpperCase(), url: docUrl, comment },
        },
        // Set status to KYC_PENDING and kyc-status as REQUESTED at the time of kyc doc upload
        $set: {
          status: "KYC_PENDING",
          kycStatus: "REQUESTED",
        },
      },
    );
  }

  return res.status(CODES.SUCCESS).json({
    status: STATUS.SUCCESS,
    message: MESSAGES.TECHNICIAN_UPDATED,
  });
};

// TODO: Do we need technicianActiveInactive ?
exports.technicianActiveInactive = async (req, res) => {
  const { technicianId } = req.params;

  // Validate if technicianId is provided
  if (!technicianId || technicianId === "" || technicianId == null) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    const technician = await Technician.findById(technicianId);

    if (technician) {
      //   if (technician.status == "KYC_PENDING") {
      //     return res.status(CODES.BAD_REQUEST).json({
      //       status: STATUS.FAIL,
      //       message: "Technician KYC is not verified",
      //     });
      //   }

      await Technician.findOneAndUpdate(
        { _id: new Types.ObjectId(technicianId) },
        { active: technician.active === 0 ? 1 : 0 },
      );
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message:
          technician.active === 0
            ? MESSAGES.TECHNICIAN_ACTIVATE
            : MESSAGES.TECHNICIAN_DEACTIVATE,
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error("Error updating technician status:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// technicianList
exports.technicianList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const filter = req.query.filter || "";
  const search = req.query.search || "";
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;
  const offset = (page - 1) * limit;

  const type = req.query.type || "";
  const position = req.query.position || "";
  const status = req.query.status || "";
  const kycStatus = req.query.kycStatus || "";

  const matchConditions = {
    $and: [],
  };

  if (search) {
    matchConditions.$and.push({
      $or: [
        { phoneNumber: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (type) {
    matchConditions.$and.push({ type });
  }

  if (position) {
    matchConditions.$and.push({ position });
  }

  if (status) {
    matchConditions.$and.push({ status });
  }

  if (kycStatus) {
    matchConditions.$and.push({ kycStatus });
  }

  if (matchConditions.$and.length === 0) {
    delete matchConditions.$and;
  }

  try {
    const technicians = await Technician.aggregate([
      {
        $match: matchConditions,
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$name", ""] },
          position: { $ifNull: ["$position", ""] },
          kycStatus: { $ifNull: ["$kycStatus", ""] },
          active: { $ifNull: ["$active", 0] },
          profilePhoto: { $ifNull: ["$profilePhoto", ""] },
          joiningDate: { $ifNull: ["$joiningDate", ""] },
          countryCode: { $ifNull: ["$countryCode", ""] },
          phoneNumber: { $ifNull: ["$phoneNumber", ""] },
          status: { $ifNull: ["$status", ""] },
          type: { $ifNull: ["$type", ""] },
          secondaryContactNumber: { $ifNull: ["$secondaryContactNumber", ""] },
          email: { $ifNull: ["$email", ""] },
          experience: { $ifNull: ["$experience", ""] },
          dob: { $ifNull: ["$dob", ""] },
          isPaired: 1,
          // kycDocs: { $ifNull: ["$kycDocs", []] },
          createdAt: 1,
          updatedAt: 1,
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
    ]);

    const totalTechnicians = await Technician.countDocuments(matchConditions);

    if (technicians.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: technicians,
        count: totalTechnicians,
        pagination: {
          totalTechnicians,
          page,
          limit,
          totalPages: Math.ceil(totalTechnicians / limit),
        },
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
        data: [],
        count: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching technician list:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// technicianList
exports.technicianBookingList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || "";
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const offset = (page - 1) * limit;

  const { technicianId } = req.params;
  if (!technicianId) {
    return res.status(400).send({
      status: false,
      message: "Technician ID is required",
    });
  }
  const matchConditions = [{ assigned_to: new Types.ObjectId(technicianId) }];

  if (startDate && endDate) {
    matchConditions.push({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  } else if (startDate) {
    matchConditions.push({
      date: {
        $gte: startDate,
      },
    });
  } else if (endDate) {
    matchConditions.push({
      date: {
        $lte: endDate,
      },
    });
  }

  try {
    const bookings = await Booking.aggregate([
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
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
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          bookingId: { $first: "$bookingId" },
          date: { $first: "$date" },
          status: { $first: "$status" },
          slot: { $first: "$slot" },
          order_id: { $first: "$order_id" },
          userName: { $first: "$user.name" },
          userId: { $first: "$user._id" },
          services: {
            $push: {
              serviceName: { $ifNull: ["$service.name", "Unknown Service"] },
              serviceType: "$serviceDetails.serviceType",
              acType: "$serviceDetails.acType",
              quantity: "$serviceDetails.quantity",
            },
          },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
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
    ]);

    const totalCount = await Booking.aggregate([
      {
        $match: {
          assigned_to: new Types.ObjectId(technicianId),
        },
      },
      {
        $count: "totalCount",
      },
    ]);

    const total = totalCount.length ? totalCount[0].totalCount : 0;

    return res.status(200).json({
      status: true,
      data: bookings,
      count: total,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// technicianKYC
// To be deleted later
exports.technicianUpdateKycStatus = async (req, res) => {
  const { technicianId, kycStatus } = req.body;

  if (technicianId == "" || !technicianId || !kycStatus) {
    return res.status(200).json({
      status: STATUS.FAIL,
      message: "Technician ID is required",
    });
  }
  try {
    const technicians = await Technician.findOne({
      _id: technicianId,
    });

    if (!technicians) {
      return res.status(200).json({
        status: STATUS.FAIL,
        message: "No data found",
      });
    }

    if (!ALLOWED_TECHNICIAN_KYC_STATUS.includes(kycStatus)) {
      return res.status(200).send({
        status: false,
        message: "Invalid status",
      });
    }

    const updateData = { kycStatus };
    if (kycStatus === VERIFIED) {
      updateData.status = AVAILABLE;
    }
    await Technician.findByIdAndUpdate(technicianId, updateData, { new: true });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TECHNICIAN_UPDATED,
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getAvailableTechnicians = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type || "";

    const matchConditions = {
      position: { $ne: "HELPER" },
      status: "AVAILABLE",
      kycStatus: "VERIFIED",
    };

    if (type) {
      matchConditions.type = type;
    }

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const technicians = await Technician.find(matchConditions)
      .select("name phoneNumber _id status kycStatus position type")
      .skip(offset)
      .limit(limit)
      .exec();

    const totalTechnicians = await Technician.countDocuments(matchConditions);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: technicians,
      count: totalTechnicians,
      pagination: {
        totalTechnicians,
        page,
        limit,
        totalPages: Math.ceil(totalTechnicians / limit),
      },
    });
  } catch (error) {
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// Update professional skills for a technician (override existing skills)
exports.updateProfessionalSkills = async (req, res) => {
  const { technicianId } = req.params;
  const { professionalSkills, position, exp } = req.body;

  if (!technicianId) {
    return res.status(400).json({
      status: false,
      message: "Technician ID is required",
    });
  }
  if (!Array.isArray(professionalSkills)) {
    return res.status(400).json({
      status: false,
      message: "professionalSkills must be an array",
    });
  }

  try {
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        status: false,
        message: "Technician not found",
      });
    }

    technician.professionalSkills = professionalSkills;

    if (position) {
      technician.position = position;
    }
    if (exp) {
      technician.experience = exp;
    }

    await technician.save();

    return res.status(200).json({
      status: true,
      message: "Professional skills updated successfully",
      data: technician,
    });
  } catch (error) {
    console.error("Error updating professional skills:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating professional skills",
      error: error.message,
    });
  }
};

// Technician App Specific APIs
exports.login = async (req, res) => {
  try {
    const { phoneNumber, countryCode, type, deviceToken } = req.body;

    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        status: false,
        message: "Phone number and country code are required",
      });
    }

    const technicianType = type || "ACD";
    const isDevelopment = process.env.NODE_ENV === "development";
    // const isDemoNumber = phoneNumber === process.env.PHONE_NUMBER;

    const isDemoNumber =
      (technicianType === "ACD" && phoneNumber === process.env.PHONE_NUMBER) ||
      (technicianType === "FC" && phoneNumber === process.env.FC_PHONE_NUMBER);

    const otp =
      isDevelopment || isDemoNumber
        ? process.env.DEMO_OTP || "1111"
        : generateRandom4Digit();

    const otpExpiryTime = Date.now() + 2 * 60 * 1000;

    /* ---------- FIND TECHNICIAN ---------- */

    let technician = await Technician.findOne({ phoneNumber, countryCode });

    /* ---------- RESTRICT DELETED / DISABLED ---------- */
    if (technician) {
      if (technician.isDeleted) {
        return res.status(403).json({
          status: false,
          message: "Your account has been deleted. Please contact admin",
        });
      }

      if (technician.status === "DISABLED") {
        return res.status(403).json({
          status: false,
          message: "Your account is disabled. Please contact admin",
        });
      }
    }

    /* ---------- IF TECHNICIAN EXISTS ---------- */

    if (technician && technician.type !== technicianType) {
      return res.status(400).json({
        status: false,
        message: `This number is already registered as ${technician.type} technician`,
      });
    }

    /* ---------- SAVE DEVICE TOKEN ---------- */

    if (technician && deviceToken) {
      technician.deviceToken = deviceToken;
      await technician.save();
    }

    /* ---------- CREATE TECHNICIAN IF NOT EXISTS ---------- */

    if (!technician) {
      technician = await Technician.create({
        phoneNumber,
        countryCode,
        type: technicianType,
        name: "UNSET",
        joiningDate: new Date(),
        profilePhoto: "",
        status: SIGNED_UP,
        kycStatus: TBU,
        secondaryContactNumber: "",
        dob: null,
        position: TBA,
        email: null,
        registered: false,
        deviceToken,
      });
    }

    /* ---------- SAVE OTP ---------- */

    await TechnicianAuth.findOneAndUpdate(
      { phoneNumber },
      {
        countryCode,
        phoneNumber,
        otp,
        otpExpiryTime,
        technician_id: technician._id,
        // deviceToken,
      },
      { upsert: true, new: true },
    );

    if (!isDevelopment && !isDemoNumber) {
      await sendOTPSMS(phoneNumber, otp);
    }

    return res.status(200).json({
      status: true,
      technicianId: technician._id,
      otp: isDevelopment || isDemoNumber ? otp : undefined,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const technicianAuth = await TechnicianAuth.findOne({
    phoneNumber: phoneNumber,
  });
  if (technicianAuth) {
    if (!technicianAuth.otp || Date.now() > technicianAuth.otpExpiryTime) {
      return res.status(400).json({
        status: false,
        message: "OTP expired",
      });
    }
    if (technicianAuth.otp === Number(otp)) {
      const technician = await Technician.findOne({ phoneNumber });

      const { accessToken, refreshToken } =
        generateTechnicianTokens(technician);

      technicianAuth.otp = null;
      technicianAuth.otpExpiryTime = null;
      technicianAuth.otpAttempts = 0;
      await technicianAuth.save();

      return res.status(200).json({
        status: true,
        accessToken,
        refreshToken,
      });
    } else {
      return res.status(500).json({
        status: false,
        message: "Invalid OTP",
      });
    }
  } else {
    return res.status(500).json({
      status: false,
      message: "No such technician found",
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Technician id is required",
      });
    }

    const technician = await Technician.findById(id);

    if (!technician) {
      return res.status(404).json({
        status: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    const phoneNumber = technician.phoneNumber;

    const isDevelopment = process.env.NODE_ENV === "development";

    const isDemoNumber = phoneNumber === process.env.PHONE_NUMBER;

    const otp =
      isDevelopment || isDemoNumber
        ? process.env.DEMO_OTP || "1111"
        : generateRandom4Digit();

    const otpExpiryTime = Date.now() + 2 * 60 * 1000;

    await TechnicianAuth.findOneAndUpdate(
      { technician_id: technician._id },
      {
        otp,
        otpExpiryTime,
      },
      { upsert: true, new: true },
    );

    if (!isDevelopment && !isDemoNumber) {
      await sendOTPSMS(technician.phoneNumber, otp);
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      ...(isDevelopment && { otp }),
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.requestAccountDeletion = async (req, res) => {
  try {
    const technicianId = req.technicianId;
    const { reason } = req.body;

    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(404).json({
        status: false,
        message: "Technician not found",
      });
    }

    // Demo number check
    const isDemoNumber =
      (technician.type === "ACD" &&
        technician.phoneNumber === process.env.PHONE_NUMBER) ||
      (technician.type === "FC" &&
        technician.phoneNumber === process.env.FC_PHONE_NUMBER);

    // Already pending
    if (technician.deletionRequest?.status === "PENDING") {
      return res.status(400).json({
        status: false,
        message: "Deletion request already pending",
      });
    }

    // If demo → directly delete (skip admin flow)
    if (isDemoNumber) {
      technician.isDeleted = true;
      technician.deletedAt = new Date();
      technician.status = "DISABLED";

      technician.deletionRequest = {
        requested: false,
        requestedAt: null,
        reason: "",
        status: "APPROVED",
      };

      await technician.save();

      return res.status(200).json({
        status: true,
        message: "Your account is deleted successfully",
      });
    }

    // ✅ Normal flow → send request to admin
    technician.deletionRequest = {
      requested: true,
      requestedAt: new Date(),
      reason: reason || "",
      status: "PENDING",
    };

    await technician.save();

    return res.status(200).json({
      status: true,
      message: "Account deletion request submitted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.handleDeletionRequest = async (req, res) => {
  try {
    const { technicianId, action } = req.body;

    const allowedActions = ["APPROVE", "REJECT", "RESET"];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        status: false,
        message: "Invalid action",
      });
    }

    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(404).json({
        status: false,
        message: "Technician not found",
      });
    }

    switch (action) {
      // ✅ APPROVE DELETE
      case "APPROVE":
        if (technician.deletionRequest?.status !== "PENDING") {
          return res.status(400).json({
            status: false,
            message: "No pending deletion request",
          });
        }

        technician.deletionRequest.status = "APPROVED";
        technician.deletionRequest.requested = false;

        technician.isDeleted = true;
        technician.deletedAt = new Date();
        technician.status = "DISABLED";
        break;

      // ✅ REJECT REQUEST
      case "REJECT":
        if (technician.deletionRequest?.status !== "PENDING") {
          return res.status(400).json({
            status: false,
            message: "No pending deletion request",
          });
        }

        technician.deletionRequest.status = "REJECTED";
        technician.deletionRequest.requested = false;
        break;

      // 🔄 RESET / RESTORE ACCOUNT
      case "RESET":
        if (!technician.isDeleted) {
          return res.status(400).json({
            status: false,
            message: "Account is not deleted",
          });
        }

        technician.isDeleted = false;
        technician.deletedAt = null;
        technician.status = "AVAILABLE";

        technician.deletionRequest = {
          requested: false,
          requestedAt: null,
          reason: "",
          status: "NONE",
        };
        break;
    }

    await technician.save();

    // ✅ Clean message handling
    const actionMessages = {
      APPROVE: "Account deleted successfully",
      REJECT: "Deletion request rejected successfully",
      RESET: "Account restored successfully",
    };

    return res.status(200).json({
      status: true,
      message: actionMessages[action],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.checkTokenValidity = (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Token is required",
    });
  }
  jwt.verify(token, process.env.TECHNICIAN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(400).json({
        status: false,
        message: err,
      });
    }
    return res.status(200).json({
      status: true,
      message: "Token is valid",
    });
  });
};

// exports.refreshToken = async (req, res) => {
//   const { token } = req.body;
//   if (!token) {
//     return res.status(401).json({
//       status: false,
//       message: "Token is required",
//     });
//   }
//   jwt.verify(token, process.env.TECHNICIAN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(400).json({
//         status: false,
//         message: err,
//       });
//     }
//     const assessToken = jwt.sign(
//       { _id: decoded._id, phoneNumber: decoded.phoneNumber },
//       process.env.TECHNICIAN_SECRET,
//       { expiresIn: 10 },
//     );
//     const refreshToken = jwt.sign(
//       { _id: decoded._id, phoneNumber: decoded.phoneNumber },
//       process.env.TECHNICIAN_SECRET,
//       { expiresIn: "40 days" },
//     );

//     return res.status(200).json({
//       status: true,
//       assessToken,
//       refreshToken,
//     });
//   });
// };

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.TECHNICIAN_SECRET);

    const technicianPayload = {
      _id: decoded._id,
      phoneNumber: decoded.phoneNumber,
    };

    const accessToken = generateAccessToken(technicianPayload);
    const refreshToken = generateRefreshToken(technicianPayload);

    return res.status(200).json({
      status: true,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: "Invalid or expired refresh token",
    });
  }
};

exports.getTechnicianForAuthenticatedTechnician = async (req, res) => {
  const { technicianId } = req;
  try {
    let technician = await Technician.findById(technicianId);
    if (technician) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: technician,
        // data: {
        //   ...technician,
        //   kycStatus: 'IN_REVIEW',
        // },
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error("Error finding technician:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createProfile = async (req, res) => {
  const { technicianId } = req;
  const {
    name,
    secondaryContactNumber,
    email,
    dob,
    gender,
    profilePhoto,
    street,
    city,
    state,
    zipcode,
    house,
    // saveAs,
    landmark,
    // isDefault,
  } = req.body;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    // Update technician profile
    const updatedTechnician = await Technician.findByIdAndUpdate(
      technicianId,
      {
        name: name || technician.name,
        secondaryContactNumber:
          secondaryContactNumber || technician.secondaryContactNumber,
        email: email || technician.email,
        dob: dob || technician.dob,
        profilePhoto: profilePhoto || technician.profilePhoto,
        status: PROFILE_CREATED,
        gender,
      },
      { new: true },
    );

    // Create or update technician address if address fields are provided
    let technicianAddress = null;
    if (street && city && state && zipcode) {
      // If isDefault is true, unset default for other addresses
      // if (isDefault) {
      //   await TechnicianAddress.updateMany(
      //     { technicianId, isDefault: true },
      //     { isDefault: false },
      //   );
      // }

      // Upsert address (update if exists, create if doesn't)
      technicianAddress = await TechnicianAddress.findOneAndUpdate(
        // { technicianId, saveAs: saveAs || "Home" },
        { technicianId},
        {
          technicianId,
          house: house || "",
          street,
          city,
          state,
          zipcode,
          // saveAs: saveAs || "Home",
          landmark: landmark || "",
          isActive: 1,
          // isDefault: isDefault || false,
        },
        { upsert: true, new: true },
      );
    }

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TECHNICIAN_UPDATED,
      data: {
        technician: updatedTechnician,
        address: technicianAddress,
      },
    });
  } catch (error) {
    console.error("Error updating technician profile:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  const { technicianId } = req;
  const {
    name,
    secondaryContactNumber,
    email,
    dob,
    profilePhoto: newPhoto,
    street,
    city,
    state,
    zipcode,
    house,
    landmark,
  } = req.body;
  let profilePhoto = newPhoto;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      if (profilePhoto) await safeDelete(profilePhoto);
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    const updatedTechnician = await Technician.findByIdAndUpdate(
      technicianId,
      {
        name: name || technician.name,
        secondaryContactNumber:
          secondaryContactNumber || technician.secondaryContactNumber,
        email: email || technician.email,
        dob: dob || technician.dob,
        profilePhoto: profilePhoto || technician.profilePhoto,
      },
      { new: true },
    );

    if (
      profilePhoto &&
      technician.profilePhoto &&
      technician.profilePhoto !== profilePhoto
    ) {
      await safeDelete(technician.profilePhoto);
    }

    let technicianAddress = null;
    const addressFields = { house, street, city, state, zipcode, landmark };
    const hasAddressUpdate = Object.values(addressFields).some(
      (value) => value !== undefined,
    );

    if (hasAddressUpdate) {
      const existingAddress = await TechnicianAddress.findOne({ technicianId });
      const addressUpdate = {};
      if (house !== undefined) addressUpdate.house = house;
      if (street !== undefined) addressUpdate.street = street;
      if (city !== undefined) addressUpdate.city = city;
      if (state !== undefined) addressUpdate.state = state;
      if (zipcode !== undefined) addressUpdate.zipcode = zipcode;
      if (landmark !== undefined) addressUpdate.landmark = landmark;

      if (existingAddress) {
        technicianAddress = await TechnicianAddress.findOneAndUpdate(
          { technicianId },
          { $set: addressUpdate },
          { new: true },
        );
      } else {
        if (!street || !city || !state || !zipcode) {
          if (profilePhoto) await safeDelete(profilePhoto);
          return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message:
              "Street, city, state and zipcode are required to create a new address",
          });
        }
        technicianAddress = await TechnicianAddress.create({
          technicianId,
          house: house || "",
          street,
          city,
          state,
          zipcode,
          landmark: landmark || "",
          isActive: true,
        });
      }
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TECHNICIAN_UPDATED,
      data: {
        technician: updatedTechnician,
        address: technicianAddress,
      },
    });
  } catch (error) {
    console.error("Error updating technician profile:", error);
    if (profilePhoto) await safeDelete(profilePhoto);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getPresignedUrlForTechnician = async (req, res) => {
  const { technicianId } = req;
  const { fileName, fileType } = req.query;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    if (!fileName || !fileType) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "File name and type are required",
      });
    }

    const url = await getPresignedUrl(fileName, fileType, 4);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: url,
    });
  } catch (error) {
    console.error(
      "Error getting presigned URL for technician KYC upload:",
      error,
    );
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getPresignedUrlForTechnicianProfile = async (req, res) => {
  const { technicianId } = req;
  const { fileName, fileType } = req.query;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    if (!fileName || !fileType) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "File name and type are required",
      });
    }

    const url = await getPresignedUrl(fileName, fileType, 5);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: url,
    });
  } catch (error) {
    console.error(
      "Error getting presigned URL for technician KYC upload:",
      error,
    );
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getKyc = async (req, res) => {
  const { technicianId } = req;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: technician.kycDocs,
    });
  } catch (error) {
    console.error("Error getting KYC documents for technician:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createKycReviewRequest = async (req, res) => {
  const { technicianId } = req;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    const updatedTechnician = await Technician.findByIdAndUpdate(
      technicianId,
      { kycStatus: "REVIEW_REQUESTED" },
      { new: true },
    );

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: updatedTechnician,
    });
  } catch (error) {
    console.error("Error updating KYC status:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.markAttendance = async (req, res) => {
  const technicianId =
    req.technicianId || req.params.technicianId || req.body.technicianId;

  const { date, description, type } = req.body;

  if (!technicianId || !date || !type) {
    return res.status(400).json({
      status: false,
      message: "Technician ID, date and type are required",
    });
  }

  try {
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        status: false,
        message: "Technician not found",
      });
    }

    let attendanceDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [dd, mm, yyyy] = date.split("-").map(Number);
      attendanceDate = new Date(Date.UTC(yyyy, mm - 1, dd));
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid date format. Use DD-MM-YYYY",
      });
    }

    const action = type.toUpperCase();

    let attendance = await Attendance.findOne({
      technicianId,
      date: attendanceDate,
    });

    if (attendance && attendance.type === "LEAVE") {
      return res.status(400).json({
        status: false,
        message: "Attendance cannot be marked on a leave day",
      });
    }

    if (action === "CHECK_OUT") {
      if (!attendance || !attendance.checkInTime) {
        return res.status(400).json({
          status: false,
          message: "Check-in not done. Checkout not allowed",
        });
      }

      if (attendance.checkOutTime) {
        return res.status(400).json({
          status: false,
          message: "Checkout already done",
        });
      }

      attendance.checkOutTime = new Date();
      attendance.description = description || attendance.description;

      await attendance.save();

      return res.json({
        status: true,
        message: "Checkout marked successfully",
        data: attendance,
      });
    }

    const validTypes = ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"];

    if (!validTypes.includes(action)) {
      return res.status(400).json({
        status: false,
        message: `type must be one of ${validTypes.join(", ")}`,
      });
    }

    if (attendance && attendance.type === "PRESENT" && action === "PRESENT") {
      return res.status(400).json({
        status: false,
        message: "Attendance already marked as PRESENT",
      });
    }

    if (!attendance) {
      attendance = new Attendance({
        technicianId,
        date: attendanceDate,
        type: action === "CHECK_OUT" ? "PRESENT" : action,
      });
    } else {
      attendance.type = action === "CHECK_OUT" ? "PRESENT" : action;
    }

    if (action === "PRESENT" && !attendance.checkInTime) {
      attendance.checkInTime = new Date();
    }

    attendance.description = description || "";

    await attendance.save();

    return res.json({
      status: true,
      message:
        action === "PRESENT"
          ? "Attendance marked as PRESENT with check-in"
          : "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Attendance error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getAttendanceDataForDateRange = async (req, res) => {
  const technicianId =
    req.technicianId || req.query.technicianId || req.body.technicianId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Start date and end date are required",
    });
  }

  try {
    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          technicianId: new mongoose.Types.ObjectId(technicianId),
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },

      {
        $addFields: {
          totalMinutes: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "PRESENT"] },
                  { $ne: ["$checkInTime", null] },
                  { $ne: ["$checkOutTime", null] },
                ],
              },
              {
                $dateDiff: {
                  startDate: "$checkInTime",
                  endDate: "$checkOutTime",
                  unit: "minute",
                },
              },
              null,
            ],
          },
        },
      },

      {
        $addFields: {
          workingStatus: {
            $cond: [
              { $ne: ["$totalMinutes", null] },
              "COMPLETED",
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "PRESENT"] },
                      { $ne: ["$checkInTime", null] },
                      { $eq: ["$checkOutTime", null] },
                      {
                        $eq: [
                          {
                            $dateToString: {
                              format: "%Y-%m-%d",
                              date: "$date",
                            },
                          },
                          {
                            $dateToString: {
                              format: "%Y-%m-%d",
                              date: new Date(),
                            },
                          },
                        ],
                      },
                    ],
                  },
                  "ONGOING",
                  {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$type", "PRESENT"] },
                          { $ne: ["$checkInTime", null] },
                          { $eq: ["$checkOutTime", null] },
                        ],
                      },
                      "MISSING_CHECKOUT",
                      "N/A",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },

      {
        $addFields: {
          workingTime: {
            $cond: [
              { $ne: ["$totalMinutes", null] },
              "$totalMinutes",
              {
                $cond: [
                  { $eq: ["$workingStatus", "ONGOING"] },
                  "ONGOING",
                  {
                    $cond: [
                      { $eq: ["$workingStatus", "MISSING_CHECKOUT"] },
                      "MISSING_CHECKOUT",
                      "N/A",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: attendanceData,
    });
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getAttendanceDataForAdmin = async (req, res) => {
  const { technicianId, startDate, endDate } = req.query;

  if (!technicianId || !startDate || !endDate) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Technician ID, start date and end date are required",
    });
  }

  try {
    const attendanceData = await Attendance.find({
      technicianId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ date: -1 });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: attendanceData,
    });
  } catch (error) {
    console.error("Error fetching admin attendance data:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.applyLeave = async (req, res) => {
  const { technicianId } = req;
  const { date, reason, type } = req.body;

  if (!date || !reason || !type) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Date, type and reason are required",
    });
  }

  try {
    // Check if the date is a holiday using the Holiday model
    const isHoliday = await Holiday.findOne({
      date: new Date(date),
    });

    if (isHoliday) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Cannot apply for leave on a holiday",
      });
    }

    const technician = await Technician.findById(technicianId);
    const leaveData = await getLeaveData(technicianId, technician);

    if (leaveData.leavesRemaining <= 0) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "No leaves remaining",
      });
    }

    const leaveRecord = new Leave({
      technicianId,
      date,
      reason,
      leaveType: type.toUpperCase(),
      status: "PENDING",
    });

    technician.totalLeaves = leaveData.leavesRemaining - 1;

    // Add a corresponding attendance record for the leave once approved.
    // const attendanceRecord = new Attendance({
    //   technicianId,
    //   date: new Date(date),
    //   type: "LEAVE",
    //   description: reason,
    // });

    // await attendanceRecord.save();
    await technician.save();
    await leaveRecord.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Leave applied successfully",
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason, technicianId: bodyTechnicianId } = req.body;
    const technicianId = req.technicianId || bodyTechnicianId;

    if (!technicianId || !startDate || !endDate) {
      return res.status(400).json({
        status: "fail",
        message: "Required fields: startDate, endDate",
      });
    }

    if (leaveType) {
      const validTypes = ["SICK_LEAVE", "CASUAL_LEAVE", "PAID_LEAVE"];
      if (!validTypes.includes(leaveType)) {
        return res.status(400).json({
          status: "fail",
          message: `Invalid leaveType. Must be one of: ${validTypes.join(", ")}`,
        });
      }
    }

    const parseDDMMYYYY = (dateStr) => {
      const [dd, mm, yyyy] = dateStr.split("-");
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    };

    let sDate = parseDDMMYYYY(startDate);
    let eDate = parseDDMMYYYY(endDate);

    if (isNaN(sDate) || isNaN(eDate)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid date format. Expected DD-MM-YYYY",
      });
    }

    sDate.setHours(0, 0, 0, 0);
    eDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eDate < sDate) {
      return res.status(400).json({
        status: "fail",
        message: `Invalid date range. Start Date (${startDate}) must be before End Date (${endDate}).`,
      });
    }

    if (sDate <= today) {
      return res.status(400).json({
        status: "fail",
        message: "Leave must be requested at least one day in advance.",
      });
    }

    const existingLeave = await Leave.findOne({
      technicianId,
      startDate: { $lte: eDate },
      endDate: { $gte: sDate },
    });

    console.log(existingLeave, "existingLeaveexistingLeaveexistingLeave");

    if (existingLeave) {
      return res.status(400).json({
        status: "fail",
        message: `Leave already requested from ${existingLeave.startDate.toDateString()} to ${existingLeave.endDate.toDateString()}`,
      });
    }

    const leave = await Leave.create({
      technicianId,
      startDate: sDate,
      endDate: eDate,
      leaveType,
      reason: reason || "",
      status: "PENDING",
    });

    return res.status(201).json({
      status: "success",
      message: "Leave request submitted successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
      error: error.message,
    });
  }
};

// exports.leaveList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page, 10) || 1;
//     const limit = parseInt(req.query.limit, 10) || 10;
//     const search = req.query.search || "";
//     const status = req.query.status ? req.query.status.split(",") : [];
//     const leaveType = req.query.leaveType ? req.query.leaveType.split(",") : [];
//     const sortField = req.query.sortby || "createdAt";
//     const sortOrder = req.query.orderby === "asc" ? 1 : -1;
//     const startDate = req.query.startDate
//       ? new Date(req.query.startDate)
//       : null;
//     const endDate = req.query.endDate
//       ? new Date(req.query.endDate)
//       : null;

//     const skip = (page - 1) * limit;

//     const matchConditions = [];

//     if (search) {
//       matchConditions.push({
//         $or: [
//           { "technician_info.name": { $regex: search, $options: "i" } },
//           {
//             "technician_info.phoneNumber": {
//               $regex: search,
//               $options: "i",
//             },
//           },
//         ],
//       });
//     }

//     if (status.length > 0) {
//       matchConditions.push({ status: { $in: status } });
//     }

//     if (leaveType.length > 0) {
//       matchConditions.push({ leaveType: { $in: leaveType } });
//     }

//     if (startDate && endDate) {
//       matchConditions.push({
//         startDate: { $lte: endDate },
//         endDate: { $gte: startDate },
//       });
//     } else if (startDate) {
//       matchConditions.push({ endDate: { $gte: startDate } });
//     } else if (endDate) {
//       matchConditions.push({ startDate: { $lte: endDate } });
//     }

//     const basePipeline = [
//       {
//         $lookup: {
//           from: "technicians",
//           localField: "technicianId",
//           foreignField: "_id",
//           as: "technician_info",
//         },
//       },
//       {
//         $unwind: {
//           path: "$technician_info",
//           preserveNullAndEmptyArrays: false,
//         },
//       },
//     ];

//     if (matchConditions.length > 0) {
//       basePipeline.push({ $match: { $and: matchConditions } });
//     }

//     const countPipeline = [...basePipeline, { $count: "total" }];

//     const dataPipeline = [
//       ...basePipeline,
//       { $sort: { [sortField]: sortOrder } },
//       { $skip: skip },
//       { $limit: limit },
//       {
//         $project: {
//           technician: {
//             id: "$technician_info._id",
//             name: "$technician_info.name",
//             phoneNumber: "$technician_info.phoneNumber",
//           },
//           startDate: 1,
//           endDate: 1,
//           leaveType: 1,
//           status: 1,
//           reason: 1,
//           createdAt: 1,
//           updatedAt: 1,
//         },
//       },
//     ];

//     const [leaves, totalResult] = await Promise.all([
//       Leave.aggregate(dataPipeline),
//       Leave.aggregate(countPipeline),
//     ]);

//     const totalCount = totalResult.length ? totalResult[0].total : 0;

//     return res.status(200).json({
//       status: "success",
//       data: leaves,
//       count: totalCount,
//       pagination: {
//         totalCount,
//         page,
//         limit,
//         totalPages: Math.ceil(totalCount / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching leave list:", error);
//     return res.status(500).json({
//       status: "fail",
//       message: "Server error occurred",
//       error: error.message,
//     });
//   }
// };

// exports.getLeaveHistory = async (req, res) => {
//   const { technicianId } = req;

//   if (!technicianId) {
//     return res.status(CODES.BAD_REQUEST).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.TECHNICIAN_ID_REQUIRED,
//     });
//   }

//   try {
//     const leaveHistory = await Leave.find({ technicianId }).sort({ date: -1 }); // Sort by most recent first

//     return res.status(CODES.SUCCESS).json({
//       status: STATUS.SUCCESS,
//       data: leaveHistory,
//     });
//   } catch (error) {
//     console.error("Error fetching leave history:", error);
//     return res.status(CODES.SERVER_ERROR).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.SERVER_ERROR,
//       error: error.message,
//     });
//   }
// };

// exports.getLeaveSummary = async (req, res) => {
//   const { technicianId } = req;

//   if (!technicianId) {
//     return res.status(CODES.BAD_REQUEST).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.TECHNICIAN_ID_REQUIRED,
//     });
//   }

//   try {
//     const leaveData = await getLeaveData(technicianId);
//     const currentYear = new Date().getFullYear();
//     const leaveRecords = await Leave.find({
//       technicianId,
//       startDate: {
//         $gte: new Date(`${currentYear}-01-01`),
//         $lte: new Date(`${currentYear}-12-31`),
//       },
//     }).sort({ startDate: -1 });

//     return res.status(CODES.SUCCESS).json({
//       status: STATUS.SUCCESS,
//       data: {
//         totalLeavesAllowed: leaveData.totalLeavesAllowed,
//         leavesTaken: leaveData.leavesTaken,
//         leavesRemaining: leaveData.leavesRemaining,
//         leaveRecords,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching leave summary:", error);
//     return res.status(CODES.SERVER_ERROR).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.SERVER_ERROR,
//       error: error.message,
//     });
//   }
// };

exports.leaveList = async (req, res) => {
  try {
    console.log("This is my leave list");
    const technicianId = new Types.ObjectId(req.technicianId);
    const filter = req.query.filter || "weekly";

    const leaveStatus = req.query.leaveStatus
      ? req.query.leaveStatus.split(",")
      : [];

    const leaveType = req.query.leaveType ? req.query.leaveType.split(",") : [];

    const { start, end } = getDateRange(filter);

    /* ---------------- CLAMP FOR ATTENDANCE ONLY ---------------- */
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const effectiveEnd = end > today ? today : end;

    /* ---------------- ATTENDANCE SUMMARY ---------------- */
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          technicianId,
          date: { $gte: start, $lte: effectiveEnd },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      PRESENT: 0,
      LEAVE: 0,
      HOLIDAY: 0,
      ABSENT: 0,
    };

    attendanceStats.forEach((item) => {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
    });

    const totalDays =
      Math.ceil((effectiveEnd - start) / (1000 * 60 * 60 * 24)) + 1;

    let sundayCount = 0;
    for (
      let d = new Date(start);
      d <= effectiveEnd;
      d.setDate(d.getDate() + 1)
    ) {
      if (d.getDay() === 0) sundayCount++;
    }

    counts.HOLIDAY += Math.max(0, sundayCount - counts.HOLIDAY);

    const workingDays = totalDays - counts.HOLIDAY;

    counts.ABSENT = Math.max(0, workingDays - (counts.PRESENT + counts.LEAVE));

    const presentPercentage = workingDays
      ? Math.round((counts.PRESENT / workingDays) * 100)
      : 0;

    const leavePercentage = workingDays
      ? Math.round((counts.LEAVE / workingDays) * 100)
      : 0;

    const holidayPercentage = totalDays
      ? Math.round((counts.HOLIDAY / totalDays) * 100)
      : 0;

    const absentPercentage = workingDays
      ? Math.round((counts.ABSENT / workingDays) * 100)
      : 0;

    console.log(end, "end", start);

    /* ---------------- LEAVE LIST (UNCHANGED LOGIC) ---------------- */
    const leaveMatch = {
      technicianId,
      startDate: { $lte: end }, // ⬅ use original end
      endDate: { $gte: start }, // ⬅ use original start
    };

    if (leaveStatus.length > 0) {
      leaveMatch.status = { $in: leaveStatus };
    }

    if (leaveType.length > 0) {
      leaveMatch.leaveType = { $in: leaveType };
    }

    const data = await Leave.find(leaveMatch)
      .sort({ createdAt: -1 })
      .select("startDate endDate leaveType status reason createdAt");

    return res.status(200).json({
      status: true,
      filter,
      summary: {
        counts,
        presentPercentage,
        leavePercentage,
        holidayPercentage,
        absentPercentage,
      },
      data,
    });
  } catch (err) {
    console.error("Attendance summary error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch summary",
    });
  }
};

exports.createToolRequest = async (req, res) => {
  const { technicianId } = req;

  let formattedDate = moment().format("DDMMYYYY");
const countTotalRequest = await ToolRequest.countDocuments();
  // console.log("---------> ",countTotalRequest)

  const toolRequestId = `ACDOCTR${formattedDate}-${countTotalRequest + 1}`;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  const { type, reason, comment, tools } = req.body;

  if (!Array.isArray(tools) || tools.length === 0) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "At least one tool is required",
    });
  }

  try {
    const toolRequests = await Promise.all(
      tools.map(async (tool, index) => {
        // console.log(tool, "this is");

        // if (!tool.tool_id || !mongoose.Types.ObjectId.isValid(tool.tool_id)) {
        //   return res.status(CODES.BAD_REQUEST).json({
        //     status: STATUS.FAIL,
        //     message: `Invalid tool_id at index ${index}`,
        //   });
        // }

        if (!tool.tool_id || !mongoose.Types.ObjectId.isValid(tool.tool_id)) {
          throw new Error(`Invalid tool_id at index ${index}`);
        }

        if (!tool.quantity || tool.quantity <= 0) {
          return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: `Invalid quantity at index ${index}`,
          });
        }

        const findToolName = await Tool.findById(tool.tool_id).select("name");

        if (!findToolName) {
          return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: `Tool not found at index ${index}`,
          });
        }

        return {
          technicianId,
          tool_id: new mongoose.Types.ObjectId(tool.tool_id),
          toolRequestId,
          name: findToolName.name,
          quantity: tool.quantity,
          type: type || "TOOL",
          status: "REQUESTED",
          reason: reason || "OTHER",
          comment: comment || "",
          description: comment || "",
        };
      }),
    );

    const savedRequests = await ToolRequest.insertMany(toolRequests);

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "Tool requests submitted successfully",
      data: savedRequests,
    });
  } catch (error) {
    console.error(error);

    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: error.message,
    });
  }
};

exports.deleteToolRequest = async (req, res) => {
  const { technicianId } = req;
  const { requestId } = req.params;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  if (!requestId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: "Request ID is required",
    });
  }

  try {
    const deletedRequest = await ToolRequest.findOneAndDelete({
      _id: requestId,
      technicianId,
    });

    if (!deletedRequest) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "Tool request not found",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Tool request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tool request:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getMyToolRequests = async (req, res) => {
  const { technicianId } = req;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    // Pagination (default values)
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 100;

    if (page < 1) page = 1;
    if (limit < 1) limit = 100;

    let skip = (page - 1) * limit;

    let condition = [
      {
        $match: {
          technicianId: new Types.ObjectId(technicianId),
        },
      },
      {
        $lookup: {
          from: "tools",
          let: { toolId: "$tool_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$toolId"] },
              },
            },
            {
              $project: {
                name: 1,
                image: 1,
              },
            },
          ],
          as: "tools",
        },
      },
      {
        $unwind: {
          path: "$tools",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      },
    ];

    let result = await ToolRequest.aggregate(condition);

    let toolRequests = result[0]?.data || [];
    let totalRecords = result[0]?.totalRecords[0]?.count || 0;

    let totalPages = Math.ceil(totalRecords / limit);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: toolRequests,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching tool requests:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getAssignedTools = async (req, res) => {
  const { technicianId } = req;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
      // 1️⃣ Match technician
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(technicianId),
        },
      },

      // 2️⃣ Lookup tool master
      {
        $lookup: {
          from: "tools",
          localField: "tool_id",
          foreignField: "_id",
          as: "tool",
        },
      },

      {
        $unwind: "$tool",
      },

      // 3️⃣ Group by tool_id
      {
        $group: {
          _id: "$tool_id",
          name: { $first: "$tool.name" },
          image: { $first: "$tool.image" },

          total_qty: {
            $sum: { $ifNull: ["$quantity", 1] },
          },

          assigned_tools: {
            $push: {
              _id: "$_id",
              identifier: "$identifier",
              status: "$status",
            },
          },
        },
      },

      // 4️⃣ Sort + Pagination
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit },

      // 5️⃣ Final shape
      {
        $project: {
          _id: 0,
          tool_id: "$_id",
          name: 1,
          image: 1,
          total_qty: 1,
          assigned_tools: 1,
        },
      },
    ];

    const data = await AssignedTool.aggregate(pipeline);

    if (!data.length) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "No assigned tools found for this technician",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data,
    });
  } catch (error) {
    console.error("Error fetching assigned tools:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

const getLeaveData = async (technicianId, technicianData) => {
  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    let technician = technicianData;
    if (!technician) {
      technician = await Technician.findById(technicianId);
    }

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    const totalLeavesAllowed = technician.totalLeaves || 12; // Default to 12 if not set
    const leavesTaken = await Leave.countDocuments({
      technicianId,
      status: { $in: ["APPROVED", "PENDING"] },
    });

    const leavesRemaining = totalLeavesAllowed - leavesTaken;

    return {
      leavesRemaining,
      totalLeavesAllowed,
      leavesTaken,
    };
  } catch (error) {
    console.error("Error fetching remaining leaves:", error);
    throw new Error(error);
  }
};

exports.getToolList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";

    const query = {
      active: true,
      ...(search ? { name: { $regex: search, $options: "i" } } : {}),
    };

    const total = await Tool.countDocuments(query);

    const tools = await Tool.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: tools,
      count: total,
    });
  } catch (error) {
    console.error("Error fetching tool list:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the tool list.",
      error: error.message,
    });
  }
};

exports.reportToolIssue = async (req, res) => {
  try {
    const { assignedToolId, reason, comment, image } = req.body;
    const { technicianId } = req;

    if (!technicianId) {
      return res.status(400).json({
        status: "FAIL",
        message: "Technician ID required",
      });
    }

    if (!assignedToolId || !reason) {
      return res.status(400).json({
        status: "FAIL",
        message: "assignedToolId and reason are required",
      });
    }

    if (!["BROKEN", "LOST"].includes(reason)) {
      return res.status(400).json({
        status: "FAIL",
        message: "Reason must be either BROKEN or LOST",
      });
    }

    const assignedTool = await AssignedTool.findOne({
      _id: assignedToolId,
      assignedTo: technicianId,
    });

    if (!assignedTool) {
      return res.status(404).json({
        status: "FAIL",
        message: "Assigned tool not found for this technician",
      });
    }

    if (assignedTool.status == "DAMAGED" || assignedTool.status == "LOST") {
      return res.status(404).json({
        status: "FAIL",
        message: "Issue is already reported",
      });
    }

    assignedTool.status = reason === "BROKEN" ? "DAMAGED" : "LOST";
    if (image) assignedTool.image = image;
    if (comment) assignedTool.comment = comment;
    await assignedTool.save();

    const reportTool = new ReportTool({
      name: assignedTool.name,
      assignedToolId: assignedToolId,
      identifier: assignedTool.identifier,
      technicianId,
      reason,
      description: `Reported as ${reason}`,
      comment: comment || "",
    });

    await reportTool.save();

    return res.status(200).json({
      status: "SUCCESS",
      message: `Tool reported as ${reason} successfully`,
      data: {
        assignedTool,
        reportTool,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "FAIL",
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getNotificationList = async (req, res) => {
  try {
    const userId = req.technicianId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                text: 1,
                isChecked: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
      {
        $addFields: {
          total: {
            $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          data: 1,
          total: 1,
        },
      },
    ];

    const result = await Notification.aggregate(pipeline);

    const notifications = result[0]?.data || [];
    const total = result[0]?.total || 0;

    const notificationIds = notifications.map((n) => n._id);

    if (notificationIds.length) {
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { isChecked: 1 } },
      );
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Notifications fetched successfully",
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getUncheckedNotificationCount = async (req, res) => {
  const result = await Notification.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.technicianId),
        isChecked: 0,
      },
    },
    {
      $count: "count",
    },
  ]);

  return res.json({
    status: STATUS.SUCCESS,
    data: {
      uncheckedCount: result[0]?.count || 0,
    },
  });
};

exports.getMaterialList = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const material = await MaterialModel.findById(id);

      if (!material) {
        return res.status(CODES.NOT_FOUND).json({
          success: false,
          message: "Material not found.",
        });
      }

      return res.status(CODES.SUCCESS).json({
        success: true,
        data: material,
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";

    const query = {
      status: "ACTIVE",
      ...(search ? { name: { $regex: search, $options: "i" } } : {}),
    };

    const total = await MaterialModel.countDocuments(query);

    const materials = await MaterialModel.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(CODES.SUCCESS).json({
      success: true,
      data: materials,
      count: total,
    });
  } catch (error) {
    console.error("Error fetching material list:", error);
    return res.status(CODES.SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching the material list.",
      error: error.message,
    });
  }
};

exports.createServiceReport = async (req, res) => {
  try {
    const { bookingId, acs, customer, paidAmount, paymentStatus } = req.body;
    const { technicianId } = req;

    if (
      !bookingId ||
      !technicianId ||
      !Array.isArray(acs) ||
      acs.length === 0
    ) {
      await cleanupServiceReportPhotos(acs);

      return res.status(400).json({
        status: "fail",
        message: "bookingId, technicianId and non-empty acs array are required",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      await cleanupServiceReportPhotos(acs);
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
      });
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      await cleanupServiceReportPhotos(acs);

      return res.status(400).json({
        status: "fail",
        message: "Invalid technician",
      });
    }

    const { acs: validatedAcs } = await validateAndPrepareACs(acs, booking);

    if (!validatedAcs.length) {
      return res.status(200).json({
        status: "success",
        message: "All provided ACs already completed. Nothing to update",
      });
    }

    for (const ac of validatedAcs) {
      if (ac.jobStatus === "COMPLETED") {
        ac.completedBy = technicianId;
        ac.completedAt = new Date();
      }
    }

    let centralReport = await serviceReportModel.findOne({ job: bookingId });

    if (!centralReport) {
      const customerData = customer || booking.customer;

      // check if all ACs are already completed
      if (centralReport) {
        const serviceDetailCountMap = {};

        booking.serviceDetails.forEach((sd) => {
          serviceDetailCountMap[sd._id.toString()] = Number(sd.quantity) || 1;
        });

        for (const ac of centralReport.acs) {
          if (ac.jobStatus === "COMPLETED") {
            const sdId = ac.serviceDetailId.toString();
            serviceDetailCountMap[sdId]--;
          }
        }

        const allCompleted = Object.values(serviceDetailCountMap).every(
          (count) => count <= 0,
        );

        if (allCompleted) {
          await cleanupServiceReportPhotos(acs);

          return res.status(400).json({
            status: "fail",
            message: "All AC service reports are already completed",
          });
        }
      }

      if (!customerData?.name || !customerData?.contactNumber) {
        await cleanupServiceReportPhotos(acs);
        return res.status(400).json({
          status: "fail",
          message: "Customer name and contactNumber are required",
        });
      }

      centralReport = await serviceReportModel.create({
        job: bookingId,
        technician: technicianId,
        createdByRole: "TECHNICIAN",
        customer: {
          name: customerData.name,
          contactNumber: customerData.contactNumber,
          email: customerData.email || "",
        },
        acs: validatedAcs,
        updatedBy: technicianId,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
      });

      await technicianServiceReport.create({
        job: bookingId,
        technician: technicianId,
        createdByRole: "TECHNICIAN",
        customer: {
          name: customerData.name,
          contactNumber: customerData.contactNumber,
          email: customerData.email || "",
        },
        acs: validatedAcs,
        updatedBy: technicianId,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,

      });
    } else {
      const filteredAcs = [];

      for (const newAc of validatedAcs) {
        const completedCount = centralReport.acs.filter(
          (ac) =>
            ac.serviceDetailId.toString() ===
              newAc.serviceDetailId.toString() && ac.jobStatus === "COMPLETED",
        ).length;

        const allowedQuantity =
          booking.serviceDetails.find(
            (sd) => sd._id.toString() === newAc.serviceDetailId.toString(),
          )?.quantity || 1;

        if (completedCount >= allowedQuantity) {
          continue;
        }

        const existingPending = centralReport.acs.find(
          (ac) =>
            ac.serviceDetailId.toString() ===
              newAc.serviceDetailId.toString() && ac.jobStatus !== "COMPLETED",
        );

        if (existingPending) {
          existingPending.jobStatus = newAc.jobStatus;
          existingPending.beforePhotos = newAc.beforePhotos;
          existingPending.afterPhotos = newAc.afterPhotos;
          existingPending.updatedAt = new Date();
        } else {
          filteredAcs.push(newAc, "This is my new AC");
        }
      }

      centralReport.acs.push(...filteredAcs);
      centralReport.updatedAt = new Date();
      centralReport.updatedBy = technicianId;
      centralReport.paidAmount += +paidAmount;
      centralReport.paymentStatus= paymentStatus;

      const lastReport = await technicianServiceReport
        .findOne({
          job: bookingId,
          technician: technicianId,
        })
        .sort({ version: -1 });

      const nextVersion = lastReport ? lastReport.version + 1 : 1;

      await technicianServiceReport.create({
        job: bookingId,
        technician: technicianId,
        createdByRole: "TECHNICIAN",
        customer: {
          name: centralReport.customer.name,
          contactNumber: centralReport.customer.contactNumber,
          email: centralReport.customer.email || "",
        },
        acs: filteredAcs,
        updatedBy: technicianId,
        version: nextVersion,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
      });

      await centralReport.save();

      // await creditPointsForCompletedACs(booking._id);
    }

    const serviceDetailCountMap = {};

    booking.serviceDetails.forEach((sd) => {
      serviceDetailCountMap[sd._id.toString()] = Number(sd.quantity) || 1;
    });

    let hasPending = false;

    for (const ac of centralReport.acs) {
      const sdId = ac.serviceDetailId.toString();

      if (ac.jobStatus === "COMPLETED") {
        serviceDetailCountMap[sdId]--;
      }

      if (ac.jobStatus === "PENDING") {
        hasPending = true;
      }
    }

    const allCompleted = Object.values(serviceDetailCountMap).every(
      (count) => count <= 0,
    );

    if (allCompleted && !hasPending) {
      booking.status = "COMPLETE";
      centralReport.isFinal = true;
    } else {
      booking.status = "JOB_PENDING";
      centralReport.isFinal = false;
    }

    await booking.save();
    await centralReport.save();

    return res.status(201).json({
      status: "success",
      message: "Service report updated successfully",
      data: {
        bookingStatus: booking.status,
        isFinal: centralReport.isFinal,
      },
    });
  } catch (error) {
    await cleanupServiceReportPhotos(req.body.acs);
    console.error("Create service report error:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message || "Server error occurred",
    });
  }
};

exports.getTechnicianToolReports = async (req, res) => {
  let { technicianId } = req;

  if (!technicianId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.TECHNICIAN_ID_REQUIRED,
    });
  }

  try {
    let condition = [
      {
        $match: {
          technicianId: new mongoose.Types.ObjectId(technicianId),
        },
      },

      // {
      //   $lookup: {
      //     from: "technicians",
      //     localField: "technicianId",
      //     foreignField: "_id",
      //     as: "technician",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$technician",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },

      {
        $lookup: {
          from: "assignedtools",
          localField: "assignedToolId",
          foreignField: "_id",
          as: "assignedTool",
        },
      },
      {
        $unwind: {
          path: "$assignedTool",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    let reports = await ReportTool.aggregate(condition);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getTechnicianHolidayCalendar = async (req, res) => {
  try {
    let { month, year } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!month || !year) {
      month = today.getMonth() + 1;
      year = today.getFullYear();
    }

    month = parseInt(month);
    year = parseInt(year);

    if (month < 1 || month > 12) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Invalid month. Month must be between 1 and 12",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const monthHolidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .select("date type description")
      .sort({ date: 1 });

    const upcomingHolidays = await Holiday.find({
      date: { $gte: today },
    })
      .select("date type description")
      .sort({ date: 1 });

    const monthName = startDate.toLocaleString("en-US", { month: "long" });

    const formatHoliday = (holiday) => {
      const d = new Date(holiday.date);

      return {
        _id: holiday._id,
        date: holiday.date,
        type: holiday.type,
        description: holiday.description,
        day: d.getDate(),
        dayName: d.toLocaleString("en-US", { weekday: "long" }),
        formattedDate: d.toLocaleString("en-US", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      };
    };

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Holiday data fetched successfully",
      data: {
        month,
        year,
        monthName,

        calendar: monthHolidays.map((h) => ({
          day: new Date(h.date).getDate(),
          fullDate: new Date(h.date).toISOString().split("T")[0],
          type: h.type,
          description: h.description,
        })),

        upcomingHolidays: upcomingHolidays.map(formatHoliday),

        holidays: monthHolidays.map(formatHoliday),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getCentralizedServiceReport = async (req, res) => {
  try {
    let { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        status: "fail",
        message: "bookingId is required",
      });
    }

    jobId = new mongoose.Types.ObjectId(jobId);

    const report = await serviceReportModel.aggregate([
      {
        $match: { job: jobId },
      },
      {
        $lookup: {
          from: "bookings",
          localField: "job",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      {
        $lookup: {
          from: "technicians",
          localField: "updatedBy",
          foreignField: "_id",
          as: "technician",
        },
      },
      {
        $unwind: {
          path: "$technician",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicianservicereports",
          let: { jobId: "$job" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$job", "$$jobId"] },
              },
            },
            {
              $lookup: {
                from: "technicians",
                localField: "technicianId",
                foreignField: "_id",
                as: "technician",
              },
            },
            {
              $unwind: {
                path: "$technician",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                paidAmount: 1,
                technicianId: "$technician._id",
                technicianName: "$technician.name",
              },
            },
          ],
          as: "technicianServiceReport",
        },
      },
      {
        $unwind: {
          path: "$acs",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$acs.materials",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            reportId: "$_id",
            acIndex: "$acs._id",
          },
          job: { $first: "$job" },
          booking: { $first: "$booking" },
          customer: { $first: "$customer" },
          technician: { $first: "$technician" },
          isFinal: { $first: "$isFinal" },
          updatedAt: { $first: "$updatedAt" },
          ac: { $first: "$acs" },
          amount: { $push: {} },

          materials: {
            $push: {
              $cond: [
                { $ifNull: ["$acs.materials.material", false] },
                {
                  material: "$acs.materials.material",
                  name: "$acs.materials.name",
                  unit: "$acs.materials.unit",
                  qty: "$acs.materials.qty",
                  rate: "$acs.materials.rate",
                  amount: "$acs.materials.amount",
                },
                "$$REMOVE",
              ],
            },
          },

          materialTotal: {
            $sum: { $ifNull: ["$acs.materials.amount", 0] },
          },
        },
      },
      {
        $group: {
          _id: "$_id.reportId",
          job: { $first: "$job" },
          booking: { $first: "$booking" },
          customer: { $first: "$customer" },
          technician: { $first: "$technician" },
          isFinal: { $first: "$isFinal" },
          updatedAt: { $first: "$updatedAt" },
          payment_history: {
            $first: "$technicianServiceReport",
          },
          acs: {
            $push: {
              serviceDetailId: "$ac.serviceDetailId",
              acType: "$ac.acType",
              brandName: "$ac.brandName",
              yom: "$ac.yom",
              tr: "$ac.tr",
              inverter: "$ac.inverter",
              serviceType: "$ac.serviceType",
              jobStatus: "$ac.jobStatus",
              remark: "$ac.remark",
              materials: "$materials",
              materialTotal: "$materialTotal",
            },
          },

          totalMaterialAmount: { $sum: "$materialTotal" },
        },
      },
      {
        $project: {
          _id: 0,
          booking: {
            _id: "$booking._id",
            bookingId: "$booking.bookingId",
            status: "$booking.status",
            date: "$booking.date",
            slot: "$booking.slot",
          },
          payment_history: 1,
          customer: 1,
          technician: {
            _id: "$technician._id",
            name: "$technician.name",
            phoneNumber: "$technician.phoneNumber",
            email: "$technician.email",
          },
          acs: 1,
          totals: {
            materialAmount: "$totalMaterialAmount",
          },
          isFinal: 1,
          updatedAt: 1,
          paidAmount: 1,
        },
      },
    ]);

    console.log(
      report,
      "reportreportreportreportreportreportreportreportreportreport",
    );

    if (!report.length) {
      return res.status(404).json({
        status: "fail",
        message: "Centralized service report not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: report[0],
    });
  } catch (error) {
    console.error("Centralized service report aggregation error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
      error: error.message,
    });
  }
};

exports.getCentralizedServiceReportHistory = async (req, res) => {
  try {
    let { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        status: "fail",
        message: "bookingId is required",
      });
    }

    jobId = new mongoose.Types.ObjectId(jobId);

    const reports = await technicianServiceReport.aggregate([
      {
        $match: {
          job: new mongoose.Types.ObjectId(jobId),
          technician: new mongoose.Types.ObjectId(req.technicianId),
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "technician",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: "$technician" },
      { $sort: { version: -1 } },
      {
        $project: {
          _id: 1,
          version: 1,
          createdAt: 1,
          paidAmount: 1,

          technician: {
            _id: "$technician._id",
            name: "$technician.name",
            phoneNumber: "$technician.phoneNumber",
          },
          acs: {
            $map: {
              input: "$acs",
              as: "ac",
              in: {
                acType: "$$ac.acType",
                brandName: "$$ac.brandName",
                jobStatus: "$$ac.jobStatus",
                remark: "$$ac.remark",
                materials: "$$ac.materials",
              },
            },
          },
        },
      },
    ]);

    if (!reports.length) {
      return res.status(404).json({
        status: "fail",
        message: "No service report history found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: reports,
    });
  } catch (error) {
    console.error("Service report history aggregation error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
      error: error.message,
    });
  }
};

exports.getTechnicianScoreDashboard = async (req, res) => {
  try {
    const { month, year } = req.query;

    let technicianId = req.technicianId;

    if (!technicianId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "technicianId is required",
      });
    }

    const currentDate = new Date();
    const selectedMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const selectedYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(
      Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0),
    );

    let endDate;

    if (
      selectedYear === currentDate.getFullYear() &&
      selectedMonth === currentDate.getMonth()
    ) {
      endDate = new Date();
    } else {
      endDate = new Date(
        Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59),
      );
    }

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const holidaySet = new Set(
      holidays.map((h) => new Date(h.date).toISOString().split("T")[0]),
    );

    let workingDays = 0;
    let sundayCount = 0;
    let holidayCount = 0;

    const loopDate = new Date(startDate);

    while (loopDate <= endDate) {
      const day = loopDate.getUTCDay();
      const dateStr = loopDate.toISOString().split("T")[0];

      if (day === 0) {
        sundayCount++;
      } else if (holidaySet.has(dateStr)) {
        holidayCount++;
      } else {
        workingDays++;
      }

      loopDate.setUTCDate(loopDate.getUTCDate() + 1);
    }

    const totalDays = workingDays;

    const attendanceList = await Attendance.find({
      technicianId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    let presentDays = 0;
    let lateComeDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    for (let att of attendanceList) {
      if (att.type === "PRESENT") {
        presentDays++;

        if (att.checkInTime) {
          const checkIn = new Date(att.checkInTime);

          const indiaHour = new Date(
            checkIn.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          ).getHours();

          if (indiaHour >= 12) {
            lateComeDays++;
          }
        }
      }

      if (att.type === "ABSENT") absentDays++;
      if (att.type === "LEAVE") leaveDays++;
    }

    const activities = await ActivityPoint.find({
      isActive: true,
      category: { $in: ["ATTENDANCE", "JOB", "CUSTOMER"] },
    }).lean();

    const activityMap = {};
    activities.forEach((a) => {
      activityMap[a.activityKey] = a;
    });

    const presentPoint = activityMap["PRESENT_DAY"]?.points || 0;
    const latePoint = activityMap["LATE_COME_OFFICE"]?.points || 0;
    const absentPoint = activityMap["ABSENT_WP"]?.points || 0;
    const leavePoint = activityMap["LEAVE"]?.points || 0;

    const attendanceScore = [
      {
        activityKey: "PRESENT_DAY",
        activityName: activityMap["PRESENT_DAY"]?.activityName || "Present Day",
        day: presentDays,
        totalDay: totalDays,
        point: presentPoint,
        totalPoints: presentDays * presentPoint,
      },
      {
        activityKey: "LATE_COME_OFFICE",
        activityName:
          activityMap["LATE_COME_OFFICE"]?.activityName || "Late Come Office",
        day: lateComeDays,
        totalDay: totalDays,
        point: latePoint,
        totalPoints: lateComeDays * latePoint,
      },
      {
        activityKey: "ABSENT_WP",
        activityName: activityMap["ABSENT_WP"]?.activityName || "Absent (WP)",
        day: absentDays,
        totalDay: totalDays,
        point: absentPoint,
        totalPoints: absentDays * absentPoint,
      },
      {
        activityKey: "LEAVE",
        activityName: activityMap["LEAVE"]?.activityName || "Leave",
        day: leaveDays,
        totalDay: totalDays,
        point: leavePoint,
        totalPoints: leaveDays * leavePoint,
      },
    ];

    const attendanceTotalPoints = attendanceScore.reduce(
      (sum, item) => sum + item.totalPoints,
      0,
    );

    const totalJobAssigned = await Booking.countDocuments({
      assigned_to: technicianId,
      date: { $gte: startDate, $lte: endDate },
    });

    const jobCompletedCount = await Booking.countDocuments({
      assigned_to: technicianId,
      status: "COMPLETE",
      date: { $gte: startDate, $lte: endDate },
    });

    const jobScore = [
      {
        activityKey: "JOB_ASSIGNED",
        activityName: "Total Job Assigned",
        point: 0,
        totalJob: totalJobAssigned,
        totalPoints: 0,
      },
      {
        activityKey: "JOB_COMPLETED",
        activityName:
          activityMap["JOB_COMPLETED"]?.activityName || "Job Completed",
        point: activityMap["JOB_COMPLETED"]?.points || 0,
        totalJob: jobCompletedCount,
        totalPoints:
          jobCompletedCount * (activityMap["JOB_COMPLETED"]?.points || 0),
      },
    ];

    const jobTotalPoints = jobScore.reduce(
      (sum, item) => sum + item.totalPoints,
      0,
    );

    // ==========================
    // CUSTOMER PERFORMANCE
    // ==========================
    // Example logic:
    // Suppose Booking has field "customerRating" (0 to 5)
    // If you don't have this field, tell me I will adjust.

    const customerReviewData = await Booking.aggregate([
      {
        $match: {
          assigned_to: new mongoose.Types.ObjectId(technicianId),
          date: { $gte: startDate, $lte: endDate },
          customerRating: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$customerRating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    let avgCustomerRating = 0;
    let totalCustomerReviews = 0;

    if (customerReviewData.length > 0) {
      avgCustomerRating = customerReviewData[0].avgRating || 0;
      totalCustomerReviews = customerReviewData[0].totalReviews || 0;
    }

    const customerPercentage =
      avgCustomerRating > 0 ? (avgCustomerRating / 5) * 100 : 0;

    const customerTotalPoints =
      totalCustomerReviews * (activityMap["CUSTOMER_REVIEW"]?.points || 0);

    const totalPoints =
      attendanceTotalPoints + jobTotalPoints + customerTotalPoints;

    const attendancePercentage =
      totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    const jobPercentage =
      totalJobAssigned > 0 ? (jobCompletedCount / totalJobAssigned) * 100 : 0;

    const attendanceBase = totalDays;
    const jobBase = totalJobAssigned;
    const customerBase = totalJobAssigned;

    const totalBase = attendanceBase + jobBase + customerBase;

    let attendanceWeight = 0;
    let jobWeight = 0;
    let customerWeight = 0;

    if (totalBase > 0) {
      attendanceWeight = (attendanceBase / totalBase) * 100;
      jobWeight = (jobBase / totalBase) * 100;

      customerWeight = 100 - (attendanceWeight + jobWeight);

      attendanceWeight = Number(attendanceWeight.toFixed(2));
      jobWeight = Number(jobWeight.toFixed(2));
      customerWeight = Number(customerWeight.toFixed(2));
    }

    const attendanceContribution =
      (attendancePercentage * attendanceWeight) / 100;

    const jobContribution = (jobPercentage * jobWeight) / 100;

    const customerContribution = (customerPercentage * customerWeight) / 100;

    const overallPerformance =
      attendanceContribution + jobContribution + customerContribution;

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: {
        attendanceScore,
        jobScore,
      },
      summary: {
        month: selectedMonth + 1,
        year: selectedYear,

        totalDays,
        sundayCount,
        holidayCount,

        presentDays,
        absentDays,
        leaveDays,
        lateComeDays,

        totalJobAssigned,
        jobCompletedCount,

        avgCustomerRating: Number(avgCustomerRating.toFixed(2)),
        totalCustomerReviews,

        attendanceTotalPoints,
        jobTotalPoints,
        customerTotalPoints,
        totalPoints,

        performance: {
          totalScore: Number(overallPerformance.toFixed(2)),

          attendance: {
            percentage: Number(attendancePercentage.toFixed(2)),
            weight: attendanceWeight,
            contribution: Number(attendanceContribution.toFixed(2)),
          },

          jobPerformance: {
            percentage: Number(jobPercentage.toFixed(2)),
            weight: jobWeight,
            contribution: Number(jobContribution.toFixed(2)),
          },

          customerRating: {
            percentage: Number(customerPercentage.toFixed(2)),
            weight: customerWeight,
            contribution: Number(customerContribution.toFixed(2)),
          },
        },
      },
    });
  } catch (error) {
    console.log("Error in getTechnicianScoreDashboard:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// Helper pairing

exports.pairHelper = async (req, res) => {
  try {
    const { helperId, technicianId } = req.body;

    const helper = await Technician.findById(helperId);
    const technician = await Technician.findById(technicianId);

    if (!helper || !technician) {
      return res.status(404).json({
        status: false,
        message: "Technician not found",
      });
    }

    if (helper.position !== "HELPER") {
      return res.status(400).json({
        status: false,
        message: "Selected technician is not a helper",
      });
    }

    if (technician.position === "HELPER") {
      return res.status(400).json({
        status: false,
        message: "Cannot pair helper with another helper",
      });
    }

    if (helper.isPaired) {
      return res.status(400).json({
        status: false,
        message: "Helper already paired",
      });
    }

    helper.pairedWith = technician._id;
    helper.isPaired = true;
    helper.pairedAt = new Date();

    await helper.save();

    return res.status(200).json({
      status: true,
      message: "Helper paired successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getUnpairedTechnicians = async (req, res) => {
  try {
    let { search, position, page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Base match
    let matchStage = {
      position: { $ne: "HELPER" },
      status: { $nin: ["DISABLED", "TERMINATED", "RESIGNED"] },
    };

    // Search filter
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Position filter
    if (position) {
      matchStage.position = position;
    }

    const aggregation = await Technician.aggregate([
      { $match: matchStage },

      // Check if any helper is paired with this technician
      {
        $lookup: {
          from: "technicians",
          let: { techId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$pairedWith", "$$techId"] },
                    { $eq: ["$position", "HELPER"] },
                    { $eq: ["$isPaired", true] },
                  ],
                },
              },
            },
          ],
          as: "helpers",
        },
      },

      // Keep only those without helpers
      {
        $match: {
          helpers: { $size: 0 },
        },
      },

      {
        $project: {
          // technicianId: "$_id",
          name: 1,
          position: 1,
          phoneNumber: 1,
          status: 1,
          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const total = aggregation[0].totalCount[0]?.count || 0;

    return res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: aggregation[0].data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.unpairHelper = async (req, res) => {
  try {
    const { helperId } = req.params;

    const helper = await Technician.findById(helperId);

    if (!helper || helper.position !== "HELPER") {
      return res.status(400).json({
        status: false,
        message: "Invalid helper",
      });
    }

    if (!helper.isPaired) {
      return res.status(400).json({
        status: false,
        message: "Helper is not paired",
      });
    }

    helper.pairedWith = null;
    helper.isPaired = false;
    helper.pairedAt = null;

    await helper.save();

    return res.status(200).json({
      status: true,
      message: "Helper unpaired successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getPairing = async (req, res) => {
  try {
    const technician = await Technician.findById(req.technicianId).select(
      "name profilePhoto position phoneNumber",
    );

    if (!technician) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let pairedTechnician = null;
    let pairedAt = null;

    // If technician is HELPER
    if (technician.position === "HELPER") {
      const helper = await Technician.findById(req.technicianId).populate({
        path: "pairedWith",
        select: "name profilePhoto position phoneNumber",
      });

      if (helper.isPaired && helper.pairedWith) {
        pairedTechnician = helper.pairedWith;
        pairedAt = helper.pairedAt;
      }
    } else {
      // If technician is TECHNICIAN
      const helper = await Technician.findOne({
        position: "HELPER",
        pairedWith: technician._id,
        isPaired: true,
      }).select("name profilePhoto position phoneNumber pairedAt");

      if (helper) {
        pairedTechnician = helper;
        pairedAt = helper.pairedAt;
      }
    }

    return res.status(200).json({
      status: true,
      data: {
        id: technician._id,
        name: technician.name,
        profilePhoto: technician.profilePhoto,
        position: technician.position,
        phoneNumber: technician.phoneNumber,
        isPaired: !!pairedTechnician,
        pairedAt,
        pairedWith: pairedTechnician,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getTechnicianPointHistory = async (req, res) => {
  try {
    const contractorId = req.technicianId;
    const { filter, startDate, endDate } = req.query;

    if (!contractorId) {
      return res.status(400).json({
        status: false,
        message: "Technician ID not found",
      });
    }

    const objectId = new mongoose.Types.ObjectId(contractorId);

    let dateFilter = {};
    const now = new Date();

    switch (filter) {
      case "today":
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );

        dateFilter = {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
        };
        break;

      case "week":
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);

        dateFilter = {
          createdAt: { $gte: firstDayOfWeek, $lt: lastDayOfWeek },
        };
        break;

      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        dateFilter = {
          createdAt: { $gte: startOfMonth, $lt: endOfMonth },
        };
        break;

      case "year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

        dateFilter = {
          createdAt: { $gte: startOfYear, $lt: endOfYear },
        };
        break;

      case "custom":
        if (startDate && endDate) {
          dateFilter = {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          };
        }
        break;

      default:
        dateFilter = {};
    }

    const summary = await ContractorPointLedger.aggregate([
      { $match: { contractor: objectId, ...dateFilter } },
      {
        $group: {
          _id: null,
          pendingPoints: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$totalPoints", 0],
            },
          },
          approvedPoints: {
            $sum: {
              $cond: [{ $eq: ["$status", "APPROVED"] }, "$totalPoints", 0],
            },
          },
          redeemedPoints: {
            $sum: {
              $cond: [{ $eq: ["$type", "REDEEM_APPROVED"] }, "$totalPoints", 0],
            },
          },
          holdPoints: {
            $sum: {
              $cond: [{ $eq: ["$type", "REDEEM_HOLD"] }, "$totalPoints", 0],
            },
          },
        },
      },
    ]);

    const approvedPoints = summary[0]?.approvedPoints || 0;
    const pendingPoints = summary[0]?.pendingPoints || 0;
    const redeemedPoints = summary[0]?.redeemedPoints || 0;
    const holdPoints = summary[0]?.holdPoints || 0;

    const walletPoints = approvedPoints - redeemedPoints - holdPoints;

    const totalTransactions = await ContractorPointLedger.countDocuments({
      contractor: objectId,
      ...dateFilter,
    });

    const serviceWise = await ContractorPointLedger.aggregate([
      {
        $match: {
          contractor: objectId,
          type: "CREDIT",
          ...dateFilter,
        },
      },

      {
        $group: {
          _id: {
            acType: "$acType",
            service: "$service",
          },
          pendingPoints: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$totalPoints", 0],
            },
          },
          approvedPoints: {
            $sum: {
              $cond: [{ $eq: ["$status", "APPROVED"] }, "$totalPoints", 0],
            },
          },
        },
      },

      {
        $lookup: {
          from: "services",
          localField: "_id.service",
          foreignField: "_id",
          as: "service",
        },
      },

      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "actypes",
          localField: "_id.acType",
          foreignField: "_id",
          as: "acType",
        },
      },

      {
        $unwind: {
          path: "$acType",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: "$acType._id",
          acTypeName: { $first: "$acType.name" },
          services: {
            $push: {
              serviceId: { $ifNull: ["$service._id", "$_id.service"] },
              serviceName: { $ifNull: ["$service.name", "Unknown Service"] },
              pendingPoints: "$pendingPoints",
              approvedPoints: "$approvedPoints",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          acTypeId: "$_id",
          acTypeName: 1,
          services: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Technician point history fetched successfully",
      data: {
        filterApplied: filter || "all",

        pendingPoints,
        holdPoints,
        walletPoints,
        redeemedPoints,

        totalTransactions,

        serviceWisePoints: serviceWise,
      },
    });
  } catch (error) {
    console.error("Point History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.createRedemptionRequest = async (req, res) => {
  try {
    const contractorId = req.technicianId;
    const { points, upiId } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid points",
      });
    }

    const technician = await Technician.findById(contractorId);

    if (!technician || technician.totalPoints < points) {
      return res.status(400).json({
        status: false,
        message: "Insufficient points",
      });
    }

    const existingRequest = await redeemptionRequest.findOne({
      contractor: contractorId,
      status: "PENDING",
    });

    if (existingRequest) {
      return res.status(400).json({
        status: false,
        message:
          "You already have a pending redemption request. Please wait until it is approved or rejected.",
      });
    }

    const amount = points * 1;

    await ContractorPointLedger.create({
      contractor: contractorId,
      totalPoints: points,
      remainingPoints: 0,
      type: "REDEEM_HOLD",
      status: "PENDING",
      description: "Redemption request hold",
    });

    const request = await redeemptionRequest.create({
      contractor: contractorId,
      pointsRequested: points,
      conversionRate: 1,
      amount,
      upiId,
      status: "PENDING",
    });

    return res.status(200).json({
      status: true,
      message: "Redemption request submitted successfully",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getMultiplePresignedUrlsForTechnician = async (req, res) => {
  const { technicianId } = req;
  const { files, type } = req.body;

  try {
    const technician = await Technician.findById(technicianId);

    if (!technician) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TECHNICIAN_NOT_FOUND,
      });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Files array is required",
      });
    }

    const urls = await getMultiplePresignedUrls(files, type || 4);

    const uploadUrls = urls.map((item) => item.uploadUrl);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: uploadUrls,
    });
  } catch (error) {
    console.error(
      "Error getting multiple presigned URLs for technician:",
      error,
    );

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getPendingJobsBookings = async (req, res) => {
  try {
    let { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        status: "fail",
        message: "jobId is required",
      });
    }

    jobId = new mongoose.Types.ObjectId(jobId);

    const report = await serviceReportModel.aggregate([
      {
        $match: { job: jobId },
      },

      {
        $lookup: {
          from: "bookings",
          localField: "job",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },

      {
        $lookup: {
          from: "technicians",
          localField: "updatedBy",
          foreignField: "_id",
          as: "technician",
        },
      },
      {
        $unwind: {
          path: "$technician",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $unwind: {
          path: "$acs",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $match: {
          "acs.jobStatus": "PENDING",
        },
      },

      {
        $group: {
          _id: "$_id",
          job: { $first: "$job" },
          booking: { $first: "$booking" },
          customer: { $first: "$customer" },
          technician: { $first: "$technician" },
          isFinal: { $first: "$isFinal" },
          updatedAt: { $first: "$updatedAt" },

          acs: {
            $push: {
              serviceDetailId: "$acs.serviceDetailId",
              acType: "$acs.acType",
              brandName: "$acs.brandName",
              yom: "$acs.yom",
              tr: "$acs.tr",
              inverter: "$acs.inverter",
              serviceType: "$acs.serviceType",
              jobStatus: "$acs.jobStatus",
              remark: "$acs.remark",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          booking: {
            _id: "$booking._id",
            bookingId: "$booking.bookingId",
            status: "$booking.status",
            date: "$booking.date",
            slot: "$booking.slot",
          },
          customer: 1,
          technician: {
            _id: "$technician._id",
            name: "$technician.name",
            phoneNumber: "$technician.phoneNumber",
            email: "$technician.email",
          },
          acs: 1,
          isFinal: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!report.length) {
      return res.status(404).json({
        status: "fail",
        message: "No pending jobs found for completed booking",
      });
    }

    return res.status(200).json({
      status: "success",
      data: report[0],
    });
  } catch (error) {
    console.error("Pending jobs error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
      error: error.message,
    });
  }
};

exports.getTechniciansTodayPresentAttendance = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const type = req.query.type || "";
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;
  const offset = (page - 1) * limit;

  try {
    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const matchConditions = [
      {
        date: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      },
      { type: "PRESENT" },
    ];

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "technicianId",
          foreignField: "_id",
          as: "technicianInfo",
        },
      },
      {
        $unwind: {
          path: "$technicianInfo",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    // Add type filter if provided
    if (type) {
      pipeline.push({
        $match: {
          "technicianInfo.type": type,
        },
      });
    }

    // Lookup for paired helper name
    pipeline.push({
      $lookup: {
        from: "technicians",
        localField: "technicianInfo.pairedWith",
        foreignField: "_id",
        as: "pairedHelperInfo",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$pairedHelperInfo",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Add sort, skip, and limit
    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          technicianId: "$technicianInfo._id",
          technicianName: "$technicianInfo.name",
          technicianType: "$technicianInfo.type",
          technicianStatus: "$technicianInfo.status",
          checkInTime: "$checkInTime",
          checkOutTime: "$checkOutTime",
          pairedHelperName: {
            $cond: [
              { $ne: ["$pairedHelperInfo", null] },
              "$pairedHelperInfo.name",
              null,
            ],
          },
          isPaired: "$technicianInfo.isPaired",
          status: "$type",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    );

    const technicians = await Attendance.aggregate(pipeline);

    // Get total count
    const countPipeline = [
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "technicianId",
          foreignField: "_id",
          as: "technicianInfo",
        },
      },
      {
        $unwind: {
          path: "$technicianInfo",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    if (type) {
      countPipeline.push({
        $match: {
          "technicianInfo.type": type,
        },
      });
    }

    countPipeline.push({
      $count: "total",
    });

    const countResult = await Attendance.aggregate(countPipeline);
    const totalTechnicians = countResult.length > 0 ? countResult[0].total : 0;

    if (technicians.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: technicians,
        count: totalTechnicians,
        pagination: {
          totalTechnicians,
          page,
          limit,
          totalPages: Math.ceil(totalTechnicians / limit),
        },
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
        data: [],
        count: 0,
        pagination: {
          totalTechnicians: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching technicians with today's attendance:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};