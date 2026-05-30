const { Types } = require("mongoose");
const lead = require("../../models/Leads/lead.model");
const { STATUS, MESSAGES, CODES } = require("../../Config/responseConstants");
const moment = require("moment");
const Enquiry = require("../../models/Enquiry/enquiry.model");
const Address = require("../../models/User/address.model");
const Notification = require("../../models/Notifications/notification.model");
const User = require("../../models/User/user.model");

const ALLOWED_PLACE = ["commercial", "residential"];

exports.createLeads = async (req, res) => {
  try {
    const {
      username,
      phoneNumber,
      place,
      address,
      acDetails,
      quantity,
      userId,
      comment,
    } = req.body;

    if (!place) {
      return res
        .status(400)
        .json({ status: false, message: MESSAGES.PLACE_REQUIRED });
    }
    if (!userId) {
      return res.status(400).json({ status: false, message: MESSAGES.USER_ID });
    }
    if (!quantity) {
      return res
        .status(400)
        .json({ status: false, message: MESSAGES.QUANTITY_REQUIRED });
    }

    if (!ALLOWED_PLACE.includes(place)) {
      return res.status(400).send({
        status: false,
        message: `Invalid place`,
      });
    }

    const count = await lead.countDocuments();

    const userAddress = await Address.findOne({
      userId: userId,
      isActive: 1,
    }).sort({ createdAt: -1 });

    if (!userAddress) {
      return res.status(400).json({
        status: false,
        message: "User address not found",
      });
    }

    let formattedDate = moment().format("DDMMYYYY");

    const countTotalEnquiry = await Enquiry.countDocuments();
    const enquiryId = `ACDEQ${formattedDate}-${countTotalEnquiry + 1}`;

    const createdEnquiry = await Enquiry.create({
      user_id: userId,
      enquiryId,
      type: "QUOTE_REQUEST",
      subType: "AMC",
      status: "REQUESTED",

      noOfAc: quantity,

      addressDetails: {
        house: userAddress.house || "",
        street: userAddress.street,
        city: userAddress.city,
        state: userAddress.state,
        zipcode: userAddress.zipcode,
        saveAs: userAddress.saveAs || "",
        landmark: userAddress.landmark || "",
      },

      schedule: {
        slot: null,
        date: null,
      },
    });

    const lead_id = `AMC${formattedDate}-${count + 1}`;
    const createLead = await lead.create({
      username,
      phoneNumber,
      place: place,
      user_id: userId,
      address: address || "",
      acDetails,
      quantity: quantity || 0,
      comment: comment || "",
      leadId: lead_id || "",
      enquiryId: createdEnquiry._id,
    });

    const userToken = await User.findOne({ _id: userId }).select("deviceToken");

    const title = "📦 AMC request recieved";
    const body = MESSAGES.AMC_REQUEST;

    // Always create notification
    await Notification.create({
      title: title,
      userId: userId,
      text: body,
    });

    // Send push notification only if device token exists
    if (userToken?.deviceToken?.trim()) {
      await sendPushNotification(userToken.deviceToken, title, body);
    }

    return res.status(201).json({
      status: true,
      enquiryId: createLead.enquiryId,
      message: MESSAGES.LEAD_SAVED,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return res.status(500).json({
      status: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.userLeadList = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.send({ status: false, message: MESSAGES.USER_ID_REQUIRED });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const offset = (page - 1) * limit;

  const leads = await lead.aggregate([
    {
      $match: { user_id: new Types.ObjectId(userId) },
    },
    {
      $project: {
        _id: 1,
        place: { $ifNull: ["$place", ""] },
        quantity: { $ifNull: ["$quantity", 0] },
        comment: { $ifNull: ["$comment", ""] },
        leadId: { $ifNull: ["$leadId", ""] },
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: offset,
    },
    {
      $limit: limit,
    },
  ]);

  const totalLeads = await lead.countDocuments({
    user_id: new Types.ObjectId(userId),
  });

  return res.status(200).json({
    status: true,
    data: leads,
    count: totalLeads,
  });
};

exports.adminLeadList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || "";
  const sortField = req?.query?.sortby || "createdAt";
  const sortOrder = req?.query?.orderby
    ? req.query.orderby === "desc"
      ? -1
      : 1
    : -1;

  const offset = (page - 1) * limit;

  const leads = await lead.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { place: { $regex: search, $options: "i" } },
          { "userDetails.name": { $regex: search, $options: "i" } },
          { "userDetails.phoneNumber": { $regex: search, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        place: { $ifNull: ["$place", ""] },
        quantity: { $ifNull: ["$quantity", 0] },
        comment: { $ifNull: ["$comment", ""] },
        leadId: { $ifNull: ["$leadId", ""] },
        createdAt: 1,
        updatedAt: 1,
        userDetails: {
          _id: 1,
          name: 1,
          email: 1,
          phoneNumber: 1,
        },
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

  const totalLeadsResult = await lead.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { place: { $regex: search, $options: "i" } },
          { "userDetails.name": { $regex: search, $options: "i" } },
          { "userDetails.phoneNumber": { $regex: search, $options: "i" } },
        ],
      },
    },
    {
      $count: "totalLeads",
    },
  ]);

  const totalLeads =
    totalLeadsResult.length > 0 ? totalLeadsResult[0].totalLeads : 0;

  return res.status(200).json({
    status: true,
    data: leads,
    count: totalLeads,
  });
};

exports.adminLeadDetails = async (req, res) => {
  const { leadId } = req.params;

  if (!leadId || leadId === "" || leadId == null) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: "Lead id is required",
    });
  }

  try {
    const leadData = await lead.aggregate([
      {
        $match: { _id: new Types.ObjectId(leadId) },
      },
      {
        $project: {
          _id: 1,
          place: { $ifNull: ["$place", ""] },
          quantity: { $ifNull: ["$quantity", ""] },
          comment: { $ifNull: ["$comment", ""] },
          leadId: { $ifNull: ["$leadId", ""] },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (leadData.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: leadData[0],
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: "Lead not found",
        data: {},
      });
    }
  } catch (error) {
    console.error("Error finding lead:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.userLeadDetails = async (req, res) => {
  const { leadId } = req.params;

  if (!leadId || leadId === "" || leadId == null) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: "Lead id is required",
    });
  }

  try {
    const leads = await lead.aggregate([
      {
        $match: { _id: new Types.ObjectId(leadId) },
      },
      {
        $project: {
          _id: 1,
          place: { $ifNull: ["$place", ""] },
          quantity: { $ifNull: ["$quantity", ""] },
          leadId: { $ifNull: ["$leadId", ""] },
          comment: { $ifNull: ["$comment", ""] },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (leads.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: leads[0],
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: "Lead not found",
        data: {},
      });
    }
  } catch (error) {
    console.error("Error finding lead:", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};
