require("dotenv").config();
const bcrypt = require("bcryptjs"); // Import bcrypt for hashing passwords
const Admin = require("../../models/Admin/admin.model");
const Address = require("../../models/User/address.model");
const jwt = require("jsonwebtoken");
const { STATUS, MESSAGES, CODES } = require("../../Config/responseConstants");
const {
  ADMIN_ROLES,
  TRAINEE_DEPARTMENTS,
  normalizeRole,
  normalizeDepartment,
  buildPermissionPayload,
  resolvePermissions,
  ALL_MODULES,
} = require("../../Config/adminRoles");
const User = require("../../models/User/user.model");
const { Types } = require("mongoose");
const { getFolderPath } = require("../../Utils/common");
const axios = require("axios");
const fs = require("fs").promises;
const AWS = require("aws-sdk");
const PromotionalNotification = require("../../models/Admin/promotional.model");
const { sendPushNotification } = require("../../Utils/notification");
const Notification = require("../../models/Notifications/notification.model");
const HomeBanner = require("../../models/HomeBanner/homebanner.model");
const Tool = require("../../models/Tools/tools.model");
const TaxConfig = require("../../models/Taxation/TaxConfig.model");
const ToolBag = require("../../models/Tools/ToolBag.model");
const ToolRequest = require("../../models/Tools/ToolRequest.model");
const AssignedTool = require("../../models/Tools/AssignedTool.model");
const { generateToolIdentifier } = require("../../middlewares/Technician/custom");
const MaterialModel = require("../../models/Material/Material.model");
const mongoose = require("mongoose");
const serviceReportModel = require("../../models/ServiceReport/serviceReport.model");
const Booking = require("../../models/Bookings/booking.model");
const ReportTool = require("../../models/Tools/ReportTool");
const Technician = require("../../models/Technician/technician.model");
const Leave = require("../../models/Attendance/Leave.model");
const Attendance = require("../../models/Attendance/Attendance.model");
const Holiday = require("../../models/Attendance/Holiday.model");
const technicianServiceReport = require("../../models/ServiceReport/technicainServiceReport");
const ActivityPoint = require("../../models/Performance/performance");
const ContractorPointLedger = require("../../models/Technician/contractorLedger");
const redeemptionRequest = require("../../models/Technician/redeemptionRequest");
const AppReview = require("../../models/Reviews/reviews.model");

const { s3Storage, safeDelete, getPresignedUrl } = require("../../Utils/s3");
const moment = require("moment");


// const s3 = new AWS.S3({
//   region: process.env.AWS_REGION,
//   signatureVersion: "v4",
// });

// Create a new user
exports.adminRegistration = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email already exists in the database
    // const existingAdmin = await Admin.findOne({ email });
    // if (existingAdmin) {
    //     return res.status(400).json({
    //         status: STATUS.FAIL,
    //         message: 'Email is already registered'
    //     });
    // }

    // const mainArray = ['', '', '', '', '', '']
    // Hash the password using bcrypt before storing it
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create a new admin user and store the hashed password
    const newAdmin = new Admin({
      email: email,
      password: hashedPassword,
      name: "Admin",
      type: 5,
      role: "Admin",
    });

    // Save the new admin to the database
    await newAdmin.save();

    return res.status(201).json({
      status: STATUS.SUCCESS,
      message: "Admin registered successfully",
      data: {
        email: newAdmin.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: "Server error",
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: { $regex: new RegExp(email, "i") },
    });

    if (!admin) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    const assessToken = jwt.sign(
      { id: admin._id, isAdmin: true },
      process.env.Admin_SECRET,
      { expiresIn: process.env.AdminExpiry },
    );

    const refreshToken = jwt.sign(
      { id: admin._id, isAdmin: true },
      process.env.Admin_SECRET,
    );

    await Admin.findOneAndUpdate(admin._id, { refreshToken, refreshToken });
    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      assessToken,
      refreshToken,
      message: MESSAGES.LOGIN_SUCCESS,
      type: admin.type,
      role: admin.role,
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.generateRefreshToken = async (req, res) => {
  const refreshToken = req.body.refreshToken;

  // Check if the refresh token is provided
  if (!refreshToken) {
    return res
      .status(400)
      .json({ status: 400, message: "Refresh token is required" });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.Admin_SECRET);

    console.log(":::::::", decoded);
    const adminId = decoded.admin._id;
    // Check if the user exists and the refresh token is valid
    const checkRefreshToken = await Admin.findOne({
      _id: adminId,
      refreshToken: refreshToken,
    });

    if (!checkRefreshToken) {
      return res.status(401).json({
        status: 401,
        message: "Invalid refresh token or user logged in on another device",
      });
    }

    const adminData = decoded.admin;
    // Generate a new access token
    const accessToken = jwt.sign(
      { adminData },
      process.env.Admin_SECRET,
      { expiresIn: "1d" }, // 1 day expiration for access token
    );
    const refreshToken = jwt.sign({ adminData }, process.env.Admin_SECRET);
    await Admin.findOneAndUpdate(adminData._id, { refreshToken, refreshToken });

    return res.status(CODES.SUCCESS).json({
      status: 200,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    // console.error("Error decoding refresh token:", error);

    // Handle specific token errors (expired token, etc.)
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ status: 401, message: "Refresh token expired" });
    }

    return res.status(500).json({
      status: 500,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createEditUserAccount = async (req, res) => {
  try {
    const { userId, phoneNumber, countryCode, userName, type, email } =
      req.body;

    // Validate input
    if (!phoneNumber || !countryCode || !userName) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.REQUIRED_FIELDS,
      });
    }

    const user = await User.findOne({ phoneNumber, countryCode });

    // If userId is empty, create a new user
    if (!userId) {
      if (user) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: MESSAGES.ACCOUNT_EXISTS,
        });
      }

      const refreshToken = jwt.sign({ phoneNumber }, process.env.USER_SECRET);
      const newUser = await User.create({
        phoneNumber,
        countryCode,
        name: userName,
        otp: 1234,
        isOtpVerify: true,
        refreshToken,
        type: type || "RETAIL",
        email: email || "",
      });

      return res.status(CODES.CREATED).json({
        status: STATUS.SUCCESS,
        message: MESSAGES.ACCOUNT_CREATED,
        data: newUser,
      });
    } else {
      if (!user) {
        return res.status(CODES.NOT_FOUND).json({
          status: STATUS.FAIL,
          message: MESSAGES.USER_NOT_FOUND,
        });
      }

      // Update user profile
      user.name = userName;
      user.type = type;
      user.email = email || "";

      await user.save();

      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: MESSAGES.PROFILE_UPDATED,
        data: user,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userDetails = async (req, res) => {
  const { userId } = req.params;
  console.log("User ID:", userId);

  const user = await User.findOne({ _id: userId }).select(
    "createdAt countryCode isActive phoneNumber name email type",
  );

  if (user) {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: user,
    });
  } else {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.NOT_FOUND,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.activeInactiveAccount = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(CODES.BAD_REQUEST).json({
      status: STATUS.FAIL,
      message: MESSAGES.USER_ID,
    });
  }

  const user = await User.findById(userId);

  if (user) {
    if (user.isActive == 1) {
      await User.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          isActive: 0,
        },
      );
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: MESSAGES.USER_DEACTIVATED,
      });
    } else {
      await User.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          isActive: 1,
        },
      );
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: MESSAGES.USER_ACTIVATED,
      });
    }
  } else {
    return res.status(CODES.SUCCESS).json({
      status: STATUS.FAIL,
      message: MESSAGES.NOT_FOUND,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const sortField = req?.query?.sortby || "createdAt";
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortOrder = req?.query?.orderby
      ? req.query.orderby === "desc"
        ? -1
        : 1
      : -1;

    const matchConditions = {};

    if (search) {
      matchConditions.$or = [
        { phoneNumber: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (startDate) {
      matchConditions.createdAt = {
        $gte: startDate,
      };
    } else if (endDate) {
      matchConditions.createdAt = {
        $lte: endDate,
      };
    }

    const offset = (page - 1) * limit;

    const userList = await User.aggregate([
      {
        $match: matchConditions,
      },
      {
        $project: {
          name: { $ifNull: ["$name", ""] },
          phoneNumber: { $ifNull: ["$phoneNumber", ""] },
          countryCode: { $ifNull: ["$countryCode", ""] },
          isActive: { $ifNull: ["$isActive", false] },
          isOtpVerify: { $ifNull: ["$isOtpVerify", false] },
          createdAt: { $ifNull: ["$createdAt", ""] },
          type: { $ifNull: ["$type", "NA"] },
          email: { $ifNull: ["$email", ""] },
        },
      },
      {
        // $sort: { createdAt: -1 }
        $sort: { [sortField]: sortOrder },
      },
      {
        $skip: offset,
      },
      {
        $limit: limit,
      },
    ]);

    const totalUsers = await User.countDocuments(matchConditions);

    if (userList.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: userList,
        count: totalUsers,
        pagination: {
          totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
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
    console.error(error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userAddressList = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_ID_REQUIRED,
      });
    }
    const address = await Address.find({ _id: userId });

    if (address.length > 0) {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: address,
      });
    } else {
      return res.status(CODES.SUCCESS).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
        data: [],
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.generatePresignedUrl = async (req, res) => {
  // const bucketName = process.env.BUCKET_NAME;

  const { fileName, fileType, type } = req.query;
  if (!fileName && !fileType && type) {
    return res
      .status(400)
      .json({ message: "fileName and fileType are required" });
  }
  // const folderPath = getFolderPath(type);

  // const fullPath = `${folderPath}/${fileName}`;

  // console.log('fullPathfullPathfullPath', fullPath);

  // const params = {
  //   Bucket: bucketName,
  //   Key: fullPath,
  //   Expires: 600,
  //   ContentType: fileType,
  //   // ACL: 'public-read'
  // };

  // const url = await s3Storage.getSignedUrlPromise("putObject", params);
  const url = await getPresignedUrl(fileName, fileType, type);

  // const file = './public/AMC.png'

  // try {
  //     const image = await fs.readFile(file);

  //     const response = await axios.put(url, image, {
  //         headers: {
  //             'Content-Type': 'image/png',
  //         },
  //     });

  //     console.log('Upload success:', response.status);
  // } catch (error) {
  //     console.error('Upload error:', error);
  //     throw error;
  // }
  return res.send({ status: true, presignedUrl: url });
};

exports.sendPromoNotification = async (req, res) => {
  const { title, body } = req.body;

  const user = await User.find({ isActive: 0 });

  if (user.length > 0) {
    for (const element of user) {
      if (element.deviceToken) {
        if (element.deviceToken != "") {
          // registrationToken, title, body
          await sendPushNotification(element.deviceToken, title, body);

          await Notification.create({
            userId: element._id,
            text: body,
          });
        }
      }
    }
  }

  await PromotionalNotification.create({
    title: title,
    body: body,
  });
  return res.send({ status: true, message: "Notification send successfully" });
};

exports.adminPromoNotificationList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby
      ? req.query.orderby === "desc"
        ? -1
        : 1
      : -1;

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { message: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await PromotionalNotification.countDocuments(query);

    const notifications = await PromotionalNotification.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: notifications,
      count: total,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the notifications.",
      error: error.message,
    });
  }
};

//
exports.saveHomeBanner = async (req, res) => {
  let mediaUrl;
  let thumbnailUrl;

  try {
    const { appType, mediaType, destination, position, data } = req.body;

    mediaUrl = req.body.mediaUrl;
    thumbnailUrl = req.body.thumbnailUrl;

    if (
      !appType ||
      !mediaType ||
      !mediaUrl ||
      !destination ||
      position === undefined
    ) {
      if (mediaUrl) await safeDelete(mediaUrl);
      if (thumbnailUrl) await safeDelete(thumbnailUrl);

      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.REQUIRED_FIELDS,
      });
    }

    const existingBanner = await HomeBanner.findOne({
      appType,
      destination,
      position,
    });

    if (existingBanner) {
      if (mediaUrl && existingBanner.mediaUrl !== mediaUrl) {
        await safeDelete(mediaUrl);
      }

      if (thumbnailUrl && existingBanner.thumbnailUrl !== thumbnailUrl) {
        await safeDelete(thumbnailUrl);
      }

      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Banner already exists for this appType, destination and position",
      });
    }

    const newHomeBanner = new HomeBanner({
      appType,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      destination,
      position,
      data,
    });

    await newHomeBanner.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "Home banner saved successfully",
      data: newHomeBanner,
    });
  } catch (error) {
    if (mediaUrl) await safeDelete(mediaUrl);
    if (thumbnailUrl) await safeDelete(thumbnailUrl);

    if (error.code === 11000) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Banner already exists for this appType, destination and position",
      });
    }

    console.error(error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getHomeBannerList = async (req, res) => {
  try {
    const sortField = req?.query?.sortby || "position";
    const sortOrder = req?.query?.orderby
      ? req.query.orderby === "desc"
        ? -1
        : 1
      : 1;

    const homeBanners = await HomeBanner.find().sort({
      [sortField]: sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: homeBanners,
    });
  } catch (error) {
    console.error("Error fetching home banner list:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the home banner list.",
      error: error.message,
    });
  }
};

exports.editHomeBanner = async (req, res) => {

  let mediaUrl;
  let thumbnailUrl;

  try {
    const {
      id,
      appType,
      mediaType,
      // mediaUrl,
      // thumbnailUrl,
      destination,
      position,
      data,
    } = req.body;

    mediaUrl = req.body.mediaUrl;
    thumbnailUrl = req.body.thumbnailUrl

    // Validate input
    if (
      !id ||
      !appType ||
      !mediaType ||
      !mediaUrl ||
      !destination ||
      !position
    ) {
      if (mediaUrl) await safeDelete(mediaUrl);
      if (thumbnailUrl) await safeDelete(thumbnailUrl);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Please send required fields.",
      });
    }

    let findOldBanner = await HomeBanner.findById(id);

    if (findOldBanner?.mediaUrl && findOldBanner.mediaUrl !== mediaUrl) {
      await safeDelete(findOldBanner.mediaUrl);
    }

    if (
      findOldBanner?.thumbnailUrl &&
      findOldBanner.thumbnailUrl !== thumbnailUrl
    ) {
      await safeDelete(findOldBanner.thumbnailUrl);
    }

    // Find the home banner by id and update it
    const updatedHomeBanner = await HomeBanner.findByIdAndUpdate(
      id,
      {
        appType,
        mediaType,
        mediaUrl,
        thumbnailUrl,
        destination,
        position,
        data,
      },
      { new: true },
    );

    if (!updatedHomeBanner) {
      await safeDelete(mediaUrl);
      await safeDelete(thumbnailUrl);
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Home banner updated successfully",
      data: updatedHomeBanner,
    });
  } catch (error) {
    await safeDelete(mediaUrl);
    await safeDelete(thumbnailUrl);
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.toggleBannerStatus = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await HomeBanner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({
        status: false,
        message: "Banner not found",
      });
    }

    const updatedBanner = await HomeBanner.findByIdAndUpdate(
      bannerId,
      { isActive: !banner.isActive },
      { new: true },
    );

    return res.status(200).json({
      status: true,
      message: "Banner status updated successfully",
      data: updatedBanner,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.deleteHomeBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    // Validate input
    if (!bannerId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Banner ID is required",
      });
    }

    // Find the home banner by id and delete it
    const deletedHomeBanner = await HomeBanner.findByIdAndDelete(bannerId);

    if (!deletedHomeBanner) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
      });
    }

    await safeDelete(deletedHomeBanner.imageUrl);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Home banner deleted successfully",
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

exports.addTool = async (req, res) => {
  try {
    const { name, description, image, code } = req.body;

    if (!name || !description) {
      await safeDelete(image);

      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.REQUIRED_FIELDS_MISSING_TOOLS,
      });
    }

    // Generate code from name if not provided
    const toolCode =
      code && code.trim() !== ""
        ? code.toUpperCase().trim()
        : name.toUpperCase().trim(); // 👈 MAIN LOGIC

    // Optional: prevent duplicate code
    const existingTool = await Tool.findOne({ code: toolCode });
    if (existingTool) {
      await safeDelete(image);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Tool code already exists",
      });
    }

    const newTool = new Tool({
      name,
      description,
      image: image || "",
      code: toolCode,
    });

    await newTool.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TOOL_CREATED,
      data: newTool,
    });
  } catch (error) {
    console.error(error);
    await safeDelete(image);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.removeTool = async (req, res) => {
  try {
    const { toolId } = req.params;

    // Validate input
    if (!toolId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.TOOL_ID_REQUIRED,
      });
    }

    // Find the tool by id and delete it
    const deletedTool = await Tool.findByIdAndUpdate(
      toolId,
      { active: false },
      { new: true },
    );

    if (!deletedTool) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.NOT_FOUND,
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TOOL_REMOVED,
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

exports.updateTool = async (req, res) => {
  try {
    const { toolId, name, description, image } = req.body;

    // Validate input
    if (!toolId) {
      await safeDelete(image);
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.TOOL_ID_REQUIRED,
      });
    }

    // Check if the tool exists
    const existingTool = await Tool.findById(toolId);
    if (!existingTool) {
      await safeDelete(image);
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TOOL_NOT_FOUND,
      });
    }
    let oldImage = existingTool.image;

    // Find the tool by id and update it
    const updatedTool = await Tool.findByIdAndUpdate(
      toolId,
      {
        name: name || existingTool.name,
        description: description || existingTool.description,
        image: image || existingTool.image,
      },
      { new: true },
    );
    await safeDelete(oldImage);

    if (!updatedTool) {
      await safeDelete(image);
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.TOOL_NOT_FOUND,
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.TOOL_UPDATED,
      data: updatedTool,
    });
  } catch (error) {
    console.error(error);
    await safeDelete(image);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
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

    const totalRecords = await Tool.countDocuments(query);

    const tools = await Tool.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: tools,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
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

// Create a new ToolBag
exports.addToolBag = async (req, res) => {
  try {
    const { name, description, tools } = req.body;

    const newToolBag = new ToolBag({
      name,
      description: description || "",
      tools: Array.isArray(tools) ? tools : [],
    });

    await newToolBag.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "ToolBag created successfully",
      data: newToolBag,
    });
  } catch (error) {
    console.error("error --- ", error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

// Get ToolBag list with pagination and search
exports.getToolBagList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";

    const query = {
      active: true,
      ...(search ? { name: { $regex: search, $options: "i" } } : {}),
    };

    const total = await ToolBag.countDocuments(query);

    const toolBags = await ToolBag.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: toolBags,
      count: total,
    });
  } catch (error) {
    console.error("Error fetching ToolBag list:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the ToolBag list.",
      error: error.message,
    });
  }
};

// Get ToolBag details by ID
exports.getToolBagById = async (req, res) => {
  try {
    const { toolBagId } = req.params;

    if (!toolBagId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "ToolBag ID is required",
      });
    }

    const toolBag = await ToolBag.findById(toolBagId).populate("tools");

    if (!toolBag) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "ToolBag not found",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: toolBag,
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

// Update ToolBag
exports.updateToolBag = async (req, res) => {
  try {
    const { toolBagId, name, description, tools } = req.body;

    if (!toolBagId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "ToolBag ID is required",
      });
    }

    // Only update 'tools' if it's provided and is an array
    const updateFields = {
      name,
      description: description || "",
    };
    if (Array.isArray(tools)) {
      updateFields.tools = tools;
    }

    const updatedToolBag = await ToolBag.findByIdAndUpdate(
      toolBagId,
      updateFields,
      { new: true },
    );

    if (!updatedToolBag) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "ToolBag not found",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "ToolBag updated successfully",
      data: updatedToolBag,
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

// Delete ToolBag
exports.deleteToolBag = async (req, res) => {
  try {
    const { toolBagId } = req.params;

    if (!toolBagId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "ToolBag ID is required",
      });
    }

    const deletedToolBag = await ToolBag.findByIdAndUpdate(
      toolBagId,
      { active: false },
      { new: true },
    );

    if (!deletedToolBag) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "ToolBag not found",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "ToolBag deleted successfully",
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

/**
 * Add or remove a tool from a ToolBag's tools array.
 * Expects: toolBagId (string), toolId (string), action ("add" or "remove")
 * Assumes: ToolBag.tools is an array of objects, each with a 'toolId' property
 */
exports.modifyToolInToolBag = async (req, res) => {
  try {
    const { toolBagId, toolId, name, quantity, description, action } = req.body;

    if (!toolBagId || !toolId || !["add", "remove"].includes(action)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "toolBagId, toolId, and valid action ('add' or 'remove') are required",
      });
    }

    if (action === "add" && (!name || !quantity)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "name and quantity are required when adding a tool",
      });
    }

    const toolBag = await ToolBag.findById(toolBagId);
    if (!toolBag) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "ToolBag not found",
      });
    }

    if (action === "add") {
      // Only add if not already present
      const exists = toolBag.tools.some((t) => t.toolId?.toString() === toolId);
      if (exists) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Tool already exists in ToolBag",
        });
      }

      if (!exists) {
        toolBag.tools.push({
          toolId,
          name,
          quantity,
          description: description || "",
        });
      }
    } else if (action === "remove") {
      toolBag.tools = toolBag.tools.filter(
        (t) => t.toolId?.toString() !== toolId,
      );
    }

    await toolBag.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: `Tool ${action === "add" ? "added to" : "removed from"} ToolBag successfully`,
      data: toolBag,
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

// exports.createToolRequest = async (req, res) => {
//   try {
//     const { technicianId, tool_id, identifier, name, type, quantity, comment, reason } =
//       req.body;

//     let formattedDate = moment().format("DDMMYYYY");
//     const countTotalRequest = await ToolRequest.countDocuments();
//     const toolRequestId = `ACDOCTR${formattedDate}-${countTotalRequest + 1}`;

//     const newRequest = new ToolRequest({
//       technicianId,
//       tool_id,
//       identifier,
//       name,
//       type: type || "TOOL",
//       quantity,
//       status: "REQUESTED", // Default status
//       comment: comment || "",
//       description: comment || "",
//       toolRequestId,
//       reason,
//     });

//     await newRequest.save();

//     return res.status(CODES.CREATED).json({
//       status: STATUS.SUCCESS,
//       message: "Tool request submitted successfully",
//       data: newRequest,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(CODES.SERVER_ERROR).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.SERVER_ERROR,
//       error: error.message,
//     });
//   }
// };

exports.createToolRequest = async (req, res) => {
  // const { technicianId } = req;
  const {
    technicianId,
    tools,
  } = req.body;

  let formattedDate = moment().format("DDMMYYYY");
  const countTotalRequest = await ToolRequest.countDocuments();

  const toolRequestId = `ACDOCTR${formattedDate}-${countTotalRequest + 1}`;

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
          type: tool.type || "TOOL",
          status: "REQUESTED",
          reason: tool.reason || "OTHER",
          comment: tool.comment || "",
          description: tool.comment || "",
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

exports.getToolRequestList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";
    const sortField = req?.query?.sortby || "createdAt";

    const query = search
      ? {
          $or: [
            { identifier: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await ToolRequest.countDocuments(query);

    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $match: query,
      },
      {
        $lookup: {
          from: "tools",
          localField: "tool_id",
          foreignField: "_id",
          as: "tools",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$tools",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "technicians",
          localField: "technicianId",
          foreignField: "_id",
          as: "technician",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                email: 1,
                type: 1,
                phoneNumber: 1,
                experience: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$technician",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          [sortField]: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          name: 1,
          identifier: 1,
          quantity: 1,
          status: 1,
          type: 1,
          reason: 1,
          description: 1,
          comment: 1,
          toolRequestId: 1,
          tool_id: 1,
          technicianId: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
          tools: 1,
          technician: 1,
        },
      },
    ];

    const data = await ToolRequest.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      data,
      count: total,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tool request list:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the tool request list.",
      error: error.message,
    });
  }
};

const assignToolsToTechnician = async ({
  toolId,
  technicianId,
  quantity,
  identifiers = [],
}) => {
  const requestedIdentifiers = Array.isArray(identifiers) ? identifiers : [];
  const providedIdentifierCount = requestedIdentifiers.filter(Boolean).length;

  const tool = await Tool.findById(toolId);
  if (!tool) {
    const error = new Error("Tool not found");
    error.statusCode = CODES.NOT_FOUND;
    throw error;
  }

  const technician = await Technician.findById(technicianId);
  if (!technician) {
    const error = new Error("Technician not found");
    error.statusCode = CODES.NOT_FOUND;
    throw error;
  }

  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    const error = new Error("Quantity must be a positive integer");
    error.statusCode = CODES.BAD_REQUEST;
    throw error;
  }

  if (providedIdentifierCount > parsedQuantity) {
    const error = new Error("Identifiers cannot be more than requested quantity");
    error.statusCode = CODES.BAD_REQUEST;
    throw error;
  }

  const assignedTools = [];
  const usedIdentifiers = new Set();

  for (let i = 0; i < parsedQuantity; i++) {
    const identifier =
      requestedIdentifiers[i] || (await generateToolIdentifier(toolId));

    if (usedIdentifiers.has(identifier)) {
      const error = new Error(`Duplicate identifier "${identifier}" provided`);
      error.statusCode = CODES.BAD_REQUEST;
      throw error;
    }

    usedIdentifiers.add(identifier);

    const exists = await AssignedTool.findOne({ identifier });
    if (exists) {
      const error = new Error(
        `Identifier "${identifier}" already exists. Please provide a unique identifier.`,
      );
      error.statusCode = CODES.BAD_REQUEST;
      throw error;
    }

    assignedTools.push({
      tool_id: toolId,
      assignedTo: technicianId,
      identifier,
      status: "IN_USE",
      name: tool.name,
    });
  }

  return AssignedTool.insertMany(assignedTools);
};

exports.updateToolRequestStatus = async (req, res) => {
  try {
    const { requestId, status, comment, identifiers } = req.body;

    if (!requestId || !status) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "requestId and status are required",
      });
    }

    const validStatuses = ["REQUESTED", "APPROVED", "DENIED", "ASSIGNED"];
    if (!validStatuses.includes(status)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Invalid status provided",
      });
    }

    const toolRequest = await ToolRequest.findById(requestId);

    if (!toolRequest) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "Tool request not found",
      });
    }

    if (toolRequest.status === status) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Request already in this status",
      });
    }

    let assignedTools = [];
    if (status === "ASSIGNED") {
      assignedTools = await assignToolsToTechnician({
        toolId: toolRequest.tool_id,
        technicianId: toolRequest.technicianId,
        quantity: toolRequest.quantity,
        identifiers,
      });
    }

    toolRequest.status = status;
    if (comment) toolRequest.comment = comment;
    await toolRequest.save();

    if (!["BROKEN", "LOST"].includes(toolRequest.reason)) {
      let findTool = await Tool.findById(toolRequest.tool_id);
      let notificationText = "";

      if (toolRequest.status === "APPROVED") {
        notificationText = `Your tool request for ${findTool.name} tool has been approved by the admin.`;
      }

      if (toolRequest.status === "DENIED") {
        notificationText = `Your tool request for ${findTool.name} tool has been denied by the admin${
          toolRequest.comment
            ? ` due to the following reason: ${toolRequest.comment}`
            : "."
        }`;
      }

      if (toolRequest.status === "ASSIGNED") {
        notificationText = `Your tool request for ${findTool.name} tool has been accepted by the admin`;
      }

      if (notificationText) {
        await Notification.create({
          userId: toolRequest.technicianId,
          text: notificationText,
        });
      }

      // send push notification
      const userToken = await Technician.findOne({
        _id: toolRequest.technicianId,
      }).select("deviceToken");

      if (userToken) {
        if (userToken.deviceToken) {
          if (userToken.deviceToken != "") {
            const title = "Tool request status updated";
            const body = MESSAGES.TOOLS_STATUS_UPDATE;
            await sendPushNotification(userToken.deviceToken, title, body);
          }
        }
      }
    }

    if (
      status === "APPROVED" &&
      ["BROKEN", "LOST"].includes(toolRequest.reason)
    ) {
      if (!toolRequest.assignedToolId) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "assignedToolId missing for damage/lost request",
        });
      }

      await AssignedTool.findByIdAndUpdate(toolRequest.assignedToolId, {
        status: toolRequest.reason === "BROKEN" ? "DAMAGED" : "LOST",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Tool request status updated successfully",
      data: toolRequest,
      assignedTools,
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: error.statusCode ? error.message : MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { name, unit, rate, status } = req.body;

    if (!name || !unit || rate === undefined) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "name, unit and rate are required",
      });
    }

    const existingMaterial = await MaterialModel.findOne({
      name: new RegExp(`^${name}$`, "i"),
      active: true,
    });

    if (existingMaterial) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Material name already exists",
      });
    }

    const material = new MaterialModel({
      name: name.trim(),
      unit,
      rate,
      status: status || "ACTIVE",
    });

    await material.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "Material added successfully",
      data: material,
    });
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Material name already exists",
      });
    }

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
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

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;

    page = page < 1 ? 1 : page;
    limit = limit < 1 ? 10 : limit;

    const search = req.query.search?.trim() || "";

    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const totalRecords = await MaterialModel.countDocuments(query);

    const materials = await MaterialModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(CODES.SUCCESS).json({
      success: true,
      data: materials,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
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

exports.updateMaterial = async (req, res) => {
  try {
    const { materialId, name, unit, rate, status } = req.body;

    if (!materialId) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: MESSAGES.MATERIAL_ID_REQUIRED,
      });
    }

    const material = await MaterialModel.findById(materialId);
    if (!material) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.MATERIAL_NOT_FOUND,
      });
    }

    if (name) {
      const duplicate = await MaterialModel.findOne({
        _id: { $ne: materialId },
        name: new RegExp(`^${name}$`, "i"),
        active: true,
      });

      if (duplicate) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Material name already exists",
        });
      }
    }

    const updatedMaterial = await MaterialModel.findByIdAndUpdate(
      materialId,
      {
        name: name ?? material.name,
        unit: unit ?? material.unit,
        rate: rate ?? material.rate,
        status: status ?? material.status,
      },
      { new: true },
    );

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: MESSAGES.MATERIAL_UPDATED,
      data: updatedMaterial,
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

exports.adminGetJobServiceReports = async (req, res) => {
  try {
    const { jobId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid bookingId",
      });
    }

    const report = await serviceReportModel.aggregate([
      {
        $match: {
          job: new mongoose.Types.ObjectId(jobId),
        },
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
                localField: "technician",
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
        $project: {
          _id: 1,
          isFinal: 1,
          updatedAt: 1,
          paidAmount:1,
          booking: {
            _id: "$booking._id",
            bookingId: "$booking.bookingId",
            status: "$booking.status",
            date: "$booking.date",
            slot: "$booking.slot",
          },
          customer: 1,
          paymentHistory:"$technicianServiceReport",
          technician: {
            _id: "$technician._id",
            name: "$technician.name",
            phoneNumber: "$technician.phoneNumber",
            email: "$technician.email",
          },
          acs: {
            $map: {
              input: "$acs",
              as: "ac",
              in: {
                serviceDetailId: "$$ac.serviceDetailId",
                acType: "$$ac.acType",
                brandName: "$$ac.brandName",
                yom: "$$ac.yom",
                tr: "$$ac.tr",
                inverter: "$$ac.inverter",
                serviceType: "$$ac.serviceType",
                jobStatus: "$$ac.jobStatus",
                remark: "$$ac.remark",
                materials: "$$ac.materials",
                materialTotal: {
                  $sum: {
                    $map: {
                      input: "$$ac.materials",
                      as: "m",
                      in: "$$m.amount",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);

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
    console.error("Admin centralized report error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
    });
  }
};

exports.getToolReports = async (req, res) => {
  try {
    let condition = [
      {
        $lookup: {
          from: "technicians",
          let: { technicianId: "$technicianId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$technicianId"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                phoneNumber: 1,
                email: 1,
              },
            },
          ],
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
      {
        $project: {
          "technician.password": 0,
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

exports.assignToolToTechnician = async (req, res) => {
  try {
    const {
      toolId,
      technicianId,
      quantity,
      identifiers = [],
    } = req.body;

    if (!toolId || !technicianId || !quantity) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "toolId, technicianId and quantity are required",
      });
    }

    const assignedTools = await assignToolsToTechnician({
      toolId,
      technicianId,
      quantity,
      identifiers,
    });

    await Notification.create({
      userId: technicianId,
      text: `${quantity} ${assignedTools[0].name} tool(s) have been assigned to you by admin.`,
    });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Tool assigned to technician successfully",
      data: assignedTools,
    });
  } catch (error) {
    console.error("Assign tool error:", error);
    return res.status(error.statusCode || CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: error.statusCode ? error.message : MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getAssignedToolsToTechnician = async (req, res) => {
  const { technicianId, search = "" } = req.query;

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

    const matchStage = {
      assignedTo: new mongoose.Types.ObjectId(technicianId),
    };

    const pipeline = [
      // 1️⃣ Match technician
      { $match: matchStage },

      // 2️⃣ Lookup tool master
      {
        $lookup: {
          from: "tools",
          localField: "tool_id",
          foreignField: "_id",
          as: "tool",
        },
      },
      { $unwind: "$tool" },

      // 3️⃣ Search (name or identifier)
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "tool.name": { $regex: search, $options: "i" } },
                  { identifier: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      // 4️⃣ Group by tool_id
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

      // 5️⃣ Sort
      { $sort: { name: 1 } },

      // 6️⃣ Facet for pagination + count
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await AssignedTool.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    if (!data.length) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "No assigned tools found for this technician",
      });
    }

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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

exports.approveLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.body;
    const { status, comment } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status. Use APPROVED or REJECTED",
      });
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        status: false,
        message: "Leave request not found",
      });
    }

    if (leave.status === "APPROVED") {
      return res.status(400).json({
        status: false,
        message: "Leave already approved",
      });
    }

    if (leave.status === "REJECTED") {
      return res.status(400).json({
        status: false,
        message: "Leave already rejected",
      });
    }

    leave.status = status;
    leave.adminComment = comment || "";
    leave.approvedAt = new Date();
    await leave.save();

    if (status === "APPROVED") {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const attendanceOps = [];

      for (
        let d = new Date(start);
        d <= end;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const utcDate = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        );

        attendanceOps.push({
          updateOne: {
            filter: {
              technicianId: leave.technicianId,
              date: utcDate,
            },
            update: {
              $set: {
                technicianId: leave.technicianId,
                date: utcDate,
                type: "LEAVE",
                description: leave.reason,
                autoMarked: true,
              },
            },
            upsert: true,
          },
        });
      }

      if (attendanceOps.length > 0) {
        await Attendance.bulkWrite(attendanceOps);
      }
    }

    return res.status(200).json({
      status: true,
      message: `Leave ${status.toLowerCase()} successfully`,
    });
  } catch (err) {
    console.error("Leave approval error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to update leave status",
    });
  }
};

exports.getTechnicianAttendanceCalendar = async (req, res) => {
  try {
    const technicianId = new Types.ObjectId(req.params.technicianId);
    const { month, year } = req.query;

    const {
      start,
      end,
      month: resMonth,
      year: resYear,
    } = generateToolIdentifier.getMonthRange(month, year);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const records = await Attendance.find({
      technicianId,
      date: { $gte: start, $lte: end },
    }).lean();

    const recordMap = new Map();
    records.forEach((r) => {
      const d = new Date(r.date);
      d.setUTCHours(0, 0, 0, 0);
      recordMap.set(d.toISOString().slice(0, 10), r);
    });

    const holidays = await Holiday.find({
      date: { $gte: start, $lte: end },
    }).lean();

    const holidayMap = new Map();
    holidays.forEach((h) => {
      const d = new Date(h.date);
      d.setUTCHours(0, 0, 0, 0);
      holidayMap.set(d.toISOString().slice(0, 10), h);
    });

    const calendar = [];

    const summary = {
      PRESENT: 0,
      ABSENT: 0,
      LEAVE: 0,
      SUNDAY: 0,
      HOLIDAY: 0,
      FUTURE: 0,
    };

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const date = new Date(d);
      date.setUTCHours(0, 0, 0, 0);

      const key = date.toISOString().slice(0, 10);
      const record = recordMap.get(key);
      const holiday = holidayMap.get(key);

      let status;

      if (record) {
        status = record.type;
      } else if (date.getUTCDay() === 0) {
        status = "SUNDAY";
      } else if (holiday) {
        status = "HOLIDAY";
      } else if (date > today) {
        status = "FUTURE";
      } else {
        status = "ABSENT";
      }

      summary[status]++;

      calendar.push({
        date: key,
        dayIndex: date.getUTCDay(),
        dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
        status,
        isFuture: date > today,
        holidayType: holiday ? holiday.type : null,
        holidayDescription: holiday ? holiday.description : null,
      });
    }

    return res.status(200).json({
      status: true,
      month: resMonth,
      year: resYear,
      summary,
      data: calendar,
    });
  } catch (err) {
    console.error("Calendar error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch calendar",
    });
  }
};

exports.getLeaveList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const status = req.query.status ? req.query.status.split(",") : [];
    const leaveType = req.query.leaveType ? req.query.leaveType.split(",") : [];
    const sortField = req.query.sortby || "createdAt";
    const sortOrder = req.query.orderby === "asc" ? 1 : -1;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const skip = (page - 1) * limit;

    const matchConditions = [];

    if (search) {
      matchConditions.push({
        $or: [
          { "technician_info.name": { $regex: search, $options: "i" } },
          {
            "technician_info.phoneNumber": {
              $regex: search,
              $options: "i",
            },
          },
        ],
      });
    }

    if (status.length > 0) {
      matchConditions.push({ status: { $in: status } });
    }

    if (leaveType.length > 0) {
      matchConditions.push({ leaveType: { $in: leaveType } });
    }

    if (startDate && endDate) {
      matchConditions.push({
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      });
    } else if (startDate) {
      matchConditions.push({ endDate: { $gte: startDate } });
    } else if (endDate) {
      matchConditions.push({ startDate: { $lte: endDate } });
    }

    const basePipeline = [
      {
        $lookup: {
          from: "technicians",
          localField: "technicianId",
          foreignField: "_id",
          as: "technician_info",
        },
      },
      {
        $unwind: {
          path: "$technician_info",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    if (matchConditions.length > 0) {
      basePipeline.push({ $match: { $and: matchConditions } });
    }

    const countPipeline = [...basePipeline, { $count: "total" }];

    const dataPipeline = [
      ...basePipeline,
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          technician: {
            id: "$technician_info._id",
            name: "$technician_info.name",
            phoneNumber: "$technician_info.phoneNumber",
          },
          startDate: 1,
          endDate: 1,
          leaveType: 1,
          status: 1,
          reason: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const [leaves, totalResult] = await Promise.all([
      Leave.aggregate(dataPipeline),
      Leave.aggregate(countPipeline),
    ]);

    const totalCount = totalResult.length ? totalResult[0].total : 0;

    return res.status(200).json({
      status: "success",
      data: leaves,
      count: totalCount,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leave list:", error);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
      error: error.message,
    });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { date, type, description } = req.body;

    if (!date || !type) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "date and type are required",
      });
    }

    const holidayDate = generateToolIdentifier.normalizeDate(new Date(date));
    const today = generateToolIdentifier.normalizeDate(new Date());

    if (holidayDate < today) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Holiday date must be today or upcoming date",
      });
    }

    const day = holidayDate.getDay();
    if (day === 0) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Holiday cannot be added on Sunday",
      });
    }

    const existingHoliday = await Holiday.findOne({
      date: holidayDate,
    });

    if (existingHoliday) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Holiday already exists for this date",
      });
    }

    const holiday = new Holiday({
      date: holidayDate,
      type,
      description: description || "",
    });

    await holiday.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Holiday already exists for this date",
      });
    }

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      const holiday = await Holiday.findById(id);

      if (!holiday) {
        return res.status(CODES.NOT_FOUND).json({
          status: STATUS.FAIL,
          message: "Holiday not found",
        });
      }

      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: "Holiday fetched successfully",
        data: holiday,
      });
    }

    const holidays = await Holiday.find({}).sort({ date: 1 });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Holiday list fetched successfully",
      data: holidays,
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

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, description } = req.body;

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "Holiday not found",
      });
    }

    if (date) {
      const updatedDate = generateToolIdentifier.normalizeDate(new Date(date));
      const today = generateToolIdentifier.normalizeDate(new Date());

      if (updatedDate < today) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Holiday date must be today or upcoming date",
        });
      }

      if (updatedDate.getDay() === 0) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Holiday cannot be added on Sunday",
        });
      }

      const existingHoliday = await Holiday.findOne({
        date: updatedDate,
        _id: { $ne: id },
      });

      if (existingHoliday) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Holiday already exists for this date",
        });
      }

      holiday.date = updatedDate;
    }

    if (type) holiday.type = type;
    if (description !== undefined) holiday.description = description;

    await holiday.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Holiday updated successfully",
      data: holiday,
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

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "Holiday not found",
      });
    }

    const today = generateToolIdentifier.normalizeDate(new Date());
    const holidayDate = generateToolIdentifier.normalizeDate(
      new Date(holiday.date),
    );

    if (holidayDate < today) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Past holiday cannot be deleted",
      });
    }

    await Holiday.findByIdAndDelete(id);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Holiday deleted successfully",
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

exports.adminGetServiceReportHistory = async (req, res) => {
  try {
    const { jobId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid jobId",
      });
    }

    const reports = await technicianServiceReport.aggregate([
      {
        $match: {
          job: new mongoose.Types.ObjectId(jobId),
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
          paidAmount:1,
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

    return res.status(200).json({
      status: "success",
      count: reports.length,
      data: reports,
    });
  } catch (err) {
    console.error("Service report history error:", err);
    return res.status(500).json({
      status: "fail",
      message: "Server error occurred",
    });
  }
};

exports.createActivityPoint = async (req, res) => {
  try {
    const { activityKey, activityName, category, points, isActive } = req.body;

    if (!activityKey || !activityName || !category || points === undefined) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "activityKey, activityName, category and points are required",
      });
    }

    if (!["ATTENDANCE", "JOB"].includes(category)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Category must be ATTENDANCE or JOB",
      });
    }

    const formattedKey = activityKey.toUpperCase().trim();
    const formattedName = activityName.trim();

    const existingKey = await ActivityPoint.findOne({
      activityKey: formattedKey,
    });

    if (existingKey) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Activity key already exists",
      });
    }

    const existingName = await ActivityPoint.findOne({
      activityName: { $regex: `^${formattedName}$`, $options: "i" },
    });

    if (existingName) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Activity name already exists",
      });
    }

    const activity = new ActivityPoint({
      activityKey: formattedKey,
      activityName: formattedName,
      category,
      points,
      isActive: isActive !== undefined ? isActive : true,
    });

    await activity.save();

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: "Activity point created successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Error creating activity point:", error);

    if (error.code === 11000) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Activity key or name already exists",
      });
    }

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.updateActivityPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { activityKey, activityName, category, points, isActive } = req.body;

    if (!id) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Activity ID is required",
      });
    }

    const activity = await ActivityPoint.findById(id);

    if (!activity) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: "Activity not found",
      });
    }

    if (category && !["ATTENDANCE", "JOB"].includes(category)) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Category must be ATTENDANCE or JOB",
      });
    }

    if (activityKey) {
      const formattedKey = activityKey.toUpperCase().trim();

      const existingKey = await ActivityPoint.findOne({
        activityKey: formattedKey,
        _id: { $ne: id },
      });

      if (existingKey) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Activity key already exists",
        });
      }

      activity.activityKey = formattedKey;
    }

    if (activityName) {
      const formattedName = activityName.trim();

      const existingName = await ActivityPoint.findOne({
        activityName: { $regex: `^${formattedName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existingName) {
        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Activity name already exists",
        });
      }

      activity.activityName = formattedName;
    }

    if (category) activity.category = category;

    if (points !== undefined) activity.points = points;

    if (isActive !== undefined) activity.isActive = isActive;

    await activity.save();

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: "Activity updated successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Error updating activity point:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.getActivityPointList = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;

    page = page < 1 ? 1 : page;
    limit = limit < 1 ? 10 : limit;

    const { search, category, isActive } = req.query;

    let activityPointId = req?.query?.id;

    if (activityPointId) {
      const activity = await ActivityPoint.findById(activityPointId);

      if (!activity) {
        return res.status(CODES.NOT_FOUND).json({
          status: STATUS.FAIL,
          message: "Activity Point not found",
        });
      }

      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        data: activity,
      });
    }

    let query = {};

    if (search) {
      query.activityName = { $regex: search.trim(), $options: "i" };
    }

    if (category && ["ATTENDANCE", "JOB"].includes(category)) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const totalRecords = await ActivityPoint.countDocuments(query);

    const activities = await ActivityPoint.find(query)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: activities,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity points:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createTaxConfig = async (req, res) => {
  try {
    const { name = "GST", gst, effectiveFrom } = req.body;

    if (gst === undefined || gst === null) {
      return res.status(400).json({
        status: false,
        message: "GST value is required",
      });
    }

    if (gst < 0) {
      return res.status(400).json({
        message: "Tax rates cannot be negative",
      });
    }

    const halfGST = Number((gst / 2).toFixed(2));

    // Deactivate existing active config
    await TaxConfig.updateMany(
      { isActive: true },
      { $set: { isActive: false } },
    );

    const taxConfig = await TaxConfig.create({
      name,
      gst, // keep original GST for reference
      cgst: halfGST,
      sgst: halfGST,
      effectiveFrom,
      isActive: true,
    });

    return res.status(201).json({
      status: true,
      message: "Tax configuration created successfully",
      data: taxConfig,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to create tax configuration",
      error: error.message,
    });
  }
};

// Get active tax config (used during invoice generation)
exports.getActiveTaxConfig = async (req, res) => {
  try {
    const taxConfig = await TaxConfig.findOne({ isActive: true });

    if (!taxConfig) {
      return res.status(404).json({
        status: false,
        message: "No active tax configuration found",
      });
    }

    return res.status(200).json({
      status: true,
      data: taxConfig,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch tax configuration",
      error: error.message,
    });
  }
};

// List all tax configs (history)
exports.getAllTaxConfigs = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    // Build search filter
    let filter = {};

    if (search) {
      const searchNumber = Number(search);

      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } }, // search by name (case insensitive)
          ...(isNaN(searchNumber) ? [] : [{ gst: searchNumber }]), // search exact GST if number
        ],
      };
    }

    // Get total count
    const totalRecords = await TaxConfig.countDocuments(filter);

    // Fetch paginated data
    const configs = await TaxConfig.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: true,
      data: configs,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch tax configurations",
      error: error.message,
    });
  }
};

exports.updateRedemptionStatus = async (req, res) => {
  try {
    const { requestId, status, remarks } = req.body;
    const adminId = req.adminId;

    if (!requestId || !status) {
      return res.status(400).json({
        status: false,
        message: "requestId and status are required",
      });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    const request = await redeemptionRequest.findById(requestId);

    if (!request || request.status !== "PENDING") {
      return res.status(400).json({
        status: false,
        message: "Invalid request",
      });
    }

    const contractorId = request.contractor;
    const points = request.pointsRequested;

    request.status = status;
    request.approvedBy = adminId;
    request.approvedAt = new Date();
    request.remarks = remarks || "";
    await request.save();

    if (status === "APPROVED") {
      await Technician.findByIdAndUpdate(contractorId, {
        $inc: { totalPoints: -points },
      });

      await ContractorPointLedger.create({
        contractor: contractorId,
        totalPoints: points,
        remainingPoints: 0,
        type: "REDEEM_APPROVED",
        status: "APPROVED",
        description: "Redemption approved by admin",
      });
    }

    if (status === "REJECTED") {
      await ContractorPointLedger.create({
        contractor: contractorId,
        totalPoints: points,
        remainingPoints: points,
        type: "REDEEM_REJECTED",
        status: "REJECTED",
        description: "Redemption rejected by admin",
      });
    }

    return res.status(200).json({
      status: true,
      message: `Redemption ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.updatePendingPointsStatus = async (req, res) => {
  try {
    const { ledgerId, status, reason } = req.body;
    // const adminId = req.adminId;

    if (!ledgerId || !status) {
      return res.status(400).json({
        status: false,
        message: "ledgerId and status are required",
      });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    const ledger = await ContractorPointLedger.findById(ledgerId);

    if (!ledger || ledger.status !== "PENDING") {
      return res.status(400).json({
        status: false,
        message: "Invalid or already processed ledger entry",
      });
    }

    const technicianId = ledger.contractor;
    const points = ledger.totalPoints || 0;

    ledger.status = status;
    ledger.reviewedAt = new Date();
    ledger.rejectionReason =
      status === "REJECTED" ? reason || "Rejected by admin" : "";

    await ledger.save();

    if (status === "REJECTED") {
      await Technician.findByIdAndUpdate(technicianId, {
        $inc: {
          pendingPoints: -points,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: `Points ${status.toLowerCase()} successfully`,
      data: ledger,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAdminPointLedgerReport = async (req, res) => {
  try {
    const { status, technicianId, fromDate, toDate } = req.query;

    let matchFilter = {};

    if (status) {
      matchFilter.status = status;
    }

    if (technicianId) {
      matchFilter.contractor = new mongoose.Types.ObjectId(technicianId);
    }

    if (fromDate || toDate) {
      matchFilter.createdAt = {};
      if (fromDate) matchFilter.createdAt.$gte = new Date(fromDate);
      if (toDate) matchFilter.createdAt.$lte = new Date(toDate);
    }

    const report = await ContractorPointLedger.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "technicians",
          localField: "contractor",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: "$technician" },
      {
        $lookup: {
          from: "bookings",
          localField: "booking",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicereports",
          let: { bookingId: "$booking._id" },
          pipeline: [{ $match: { $expr: { $eq: ["$job", "$$bookingId"] } } }],
          as: "serviceReport",
        },
      },
      { $unwind: { path: "$serviceReport", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$serviceReport.acs",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "actypes",
          localField: "acType",
          foreignField: "_id",
          as: "acType",
        },
      },
      { $unwind: { path: "$acType", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicemasters",
          localField: "service",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          pendingDays: {
            $cond: [
              { $eq: ["$status", "PENDING"] },
              {
                $floor: {
                  $divide: [
                    { $subtract: [new Date(), "$createdAt"] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
              0,
            ],
          },
        },
      },

      {
        $project: {
          _id: 0,
          ledgerId: "$_id",

          technicianName: "$technician.name",
          technicianPhone: "$technician.phoneNumber",

          bookingId: "$booking.bookingId",

          acType: "$acType.name",
          service: "$service.name",

          serviceType: "$serviceReport.acs.serviceType",
          brand: "$serviceReport.acs.brandName",
          tonnage: "$serviceReport.acs.tr",
          jobStatus: "$serviceReport.acs.jobStatus",
          completedBy: "$serviceReport.acs.completedBy",
          completedAt: "$serviceReport.acs.completedAt",
          materialsUsed: "$serviceReport.acs.materials",

          quantity: 1,
          pointsPerUnit: 1,
          totalPoints: 1,

          status: 1,
          type: 1,

          creditedFrom: {
            $cond: [
              { $ifNull: ["$booking", false] },
              "BOOKING_SERVICE",
              "MANUAL_ADMIN",
            ],
          },

          creditDate: "$createdAt",
          pendingDays: 1,
          description: 1,
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      status: true,
      message: "Admin point ledger report fetched successfully",
      totalRecords: report.length,
      data: report,
    });
  } catch (error) {
    console.error("Admin Ledger Report Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getContractorRedemptionRequests = async (req, res) => {
  try {

    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    const matchFilter = {};

    if (req.query.technicianId) {
      matchFilter.contractor = new mongoose.Types.ObjectId(req.query.technicianId);
    }

    const result = await redeemptionRequest.aggregate([
      {
        $match: matchFilter
      },
      {
        $lookup: {
          from: "technicians",
          localField: "contractor",
          foreignField: "_id",
          as: "technician"
        }
      },
      {
        $unwind: "$technician"
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                pointsRequested: 1,
                conversionRate: 1,
                amount: 1,
                upiId: 1,
                status: 1,
                createdAt: 1,
                technician: {
                  _id: "$technician._id",
                  name: "$technician.name",
                  phone: "$technician.phoneNumber",
                  email: "$technician.email",
                  totalPoints: "$technician.totalPoints",
                  profilePic: "$technician.profilePic"
                }
              }
            }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      status: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

exports.getAppReviews = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      rating,
      minRating,
      maxRating,
      startDate,
      endDate,
      isDeleted,
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const searchValue = search?.trim();
    const isNumberSearch = !isNaN(searchValue);

    const match = {};

    // isDeleted filter
    if (isDeleted !== undefined) {
      match.isDeleted = isDeleted === "true";
    } else {
      match.isDeleted = false;
    }

    // rating filter
    if (rating) {
      match.rating = Number(rating);
    } else if (minRating || maxRating) {
      match.rating = {};
      if (minRating) match.rating.$gte = Number(minRating);
      if (maxRating) match.rating.$lte = Number(maxRating);
    }

    // date filter
    if (startDate || endDate) {
      match.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        match.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const pipeline = [
      { $match: match },

      // Join user
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // Search
      ...(searchValue
        ? [
            {
              $match: {
                $or: [
                  {
                    "user.name": {
                      $regex: searchValue,
                      $options: "i",
                    },
                  },
                  {
                    review: {
                      $regex: searchValue,
                      $options: "i",
                    },
                  },
                  ...(isNumberSearch ? [{ rating: Number(searchValue) }] : []),
                ],
              },
            },
          ]
        : []),

      // Projection
      {
        $project: {
          rating: 1,
          review: 1,
          images: 1,
          createdAt: 1,
          userName: "$user.name",
          profilePhoto: "$user.profilePhoto",
        },
      },

      // Sorting
      {
        $sort: {
          createdAt: sortOrder === "asc" ? 1 : -1,
        },
      },

      // Pagination using facet (optimized)
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await AppReview.aggregate(pipeline);

    const reviews = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      status: true,
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Error fetching reviews",
    });
  }
};

exports.deleteAppReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;

    if (!reviewId) {
      return res.status(400).json({
        status: false,
        message: "Review ID is required",
      });
    }

    const review = await AppReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        status: false,
        message: "Review not found",
      });
    }

    if (review.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Review already deleted",
      });
    }

    review.isDeleted = true;
    await review.save();

    return res.status(200).json({
      status: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Error deleting review",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN STAFF MANAGEMENT
// These endpoints exist in acdoctorserverapp and are added here for parity.
// Only FOUNDER-role admins can create / update / reset staff accounts.
// ─────────────────────────────────────────────────────────────────────────────

const assertFounderAccess = (req, res) => {
  const role = normalizeRole(req.admin?.role, req.admin?.type);
  if (role !== ADMIN_ROLES.FOUNDER) {
    res.status(CODES.FORBIDDEN || 403).json({
      status: STATUS.FAIL,
      message: 'Only founders can manage admin users.',
    });
    return false;
  }
  return true;
};

const sanitizePermissionModules = (modules = {}) => {
  const sanitizeList = (list) => {
    if (!Array.isArray(list)) return [];
    if (list.includes('*')) return ['*'];
    return list.filter((item) => ALL_MODULES.includes(item));
  };
  return {
    view:   sanitizeList(modules.view),
    create: sanitizeList(modules.create),
    edit:   sanitizeList(modules.edit),
    delete: sanitizeList(modules.delete),
  };
};

// GET /api/v1/admin/staff/list
exports.listAdminStaff = async (req, res) => {
  try {
    const staff = await Admin.find()
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    const data = staff.map((member) => {
      const role = normalizeRole(member.role, member.type);
      const department =
        role === ADMIN_ROLES.TRAINEE ? normalizeDepartment(member.department) : null;
      const memberObj = member.toObject();
      return {
        ...memberObj,
        role,
        department,
        resolvedPermissions: resolvePermissions(member),
        defaultPermissions: buildPermissionPayload(role, department),
      };
    });

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

// POST /api/v1/admin/staff/create
exports.createAdminStaff = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: 'Name, email, password and role are required.',
      });
    }

    const normalizedRole = normalizeRole(role);
    const normalizedDepartment =
      normalizedRole === ADMIN_ROLES.TRAINEE
        ? normalizeDepartment(department)
        : null;

    if (
      normalizedRole === ADMIN_ROLES.TRAINEE &&
      !Object.values(TRAINEE_DEPARTMENTS).includes(normalizedDepartment)
    ) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: 'Trainee department is required.',
      });
    }

    const existing = await Admin.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    });
    if (existing) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: 'Email is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      department: normalizedDepartment,
      type: normalizedRole === ADMIN_ROLES.FOUNDER ? 5 : 1,
    });

    return res.status(CODES.CREATED).json({
      status: STATUS.SUCCESS,
      message: 'Admin user created successfully',
      data: {
        _id: created._id,
        name: created.name,
        email: created.email,
        role: created.role,
        department: created.department,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

// PATCH /api/v1/admin/staff/:id
exports.updateAdminStaff = async (req, res) => {
  try {
    if (!assertFounderAccess(req, res)) return;

    const { id } = req.params;
    const { name, role, department } = req.body;

    const adminUser = await Admin.findById(id);
    if (!adminUser) {
      return res.status(CODES.NOT_FOUND || 404).json({
        status: STATUS.FAIL,
        message: 'Admin user not found.',
      });
    }

    if (name?.trim()) adminUser.name = name.trim();

    if (role) {
      const normalizedRole = normalizeRole(role);
      adminUser.role = normalizedRole;
      adminUser.type = normalizedRole === ADMIN_ROLES.FOUNDER ? 5 : 1;
      adminUser.department =
        normalizedRole === ADMIN_ROLES.TRAINEE
          ? normalizeDepartment(department)
          : null;
    }

    await adminUser.save();

    const resolvedRole = normalizeRole(adminUser.role, adminUser.type);
    const resolvedDepartment =
      resolvedRole === ADMIN_ROLES.TRAINEE
        ? normalizeDepartment(adminUser.department)
        : null;

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: 'Admin user updated successfully',
      data: {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: resolvedRole,
        department: resolvedDepartment,
        useCustomPermissions: Boolean(adminUser.useCustomPermissions),
        customPermissions: adminUser.customPermissions,
        resolvedPermissions: resolvePermissions(adminUser),
        defaultPermissions: buildPermissionPayload(resolvedRole, resolvedDepartment),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

// PUT /api/v1/admin/staff/:id/permissions
exports.updateAdminStaffPermissions = async (req, res) => {
  try {
    if (!assertFounderAccess(req, res)) return;

    const { id } = req.params;
    const { modules, useCustomPermissions } = req.body;

    const adminUser = await Admin.findById(id);
    if (!adminUser) {
      return res.status(CODES.NOT_FOUND || 404).json({
        status: STATUS.FAIL,
        message: 'Admin user not found.',
      });
    }

    if (useCustomPermissions === false) {
      adminUser.useCustomPermissions = false;
      adminUser.customPermissions = {
        modules: { view: [], create: [], edit: [], delete: [] },
      };
    } else {
      adminUser.useCustomPermissions = true;
      adminUser.customPermissions = {
        modules: sanitizePermissionModules(modules),
      };
    }

    await adminUser.save();

    const resolvedRole = normalizeRole(adminUser.role, adminUser.type);
    const resolvedDepartment =
      resolvedRole === ADMIN_ROLES.TRAINEE
        ? normalizeDepartment(adminUser.department)
        : null;

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      message: adminUser.useCustomPermissions
        ? 'Custom permissions saved successfully'
        : 'Permissions reset to role default',
      data: {
        _id: adminUser._id,
        useCustomPermissions: Boolean(adminUser.useCustomPermissions),
        customPermissions: adminUser.customPermissions,
        resolvedPermissions: resolvePermissions(adminUser),
        defaultPermissions: buildPermissionPayload(resolvedRole, resolvedDepartment),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

// POST /api/v1/admin/staff/:id/permissions/reset
exports.resetAdminStaffPermissions = async (req, res) => {
  req.body = { useCustomPermissions: false };
  return exports.updateAdminStaffPermissions(req, res);
};
