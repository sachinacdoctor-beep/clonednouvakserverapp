const User = require("../../models/User/user.model");
const Address = require("../../models/User/address.model");
const jwt = require("jsonwebtoken");
const { generateRandom4Digit, sendOTPSMS } = require("../../Utils/common");
const { Types } = require("mongoose");
const { MESSAGES, CODES, STATUS } = require("../../Config/responseConstants");
const { sendPushNotification } = require("../../Utils/notification");
const Notification = require("../../models/Notifications/notification.model");
const HomeBanner = require("../../models/HomeBanner/homebanner.model");
const AppReview = require("../../models/Reviews/reviews.model");
const {
  getPresignedUrl,
  deleteFromS3Image,
  deleteMultipleFromS3,
  safeDelete,
  getMultiplePresignedUrls,
} = require("../../Utils/s3");
const {
  generateUserAccessToken,
  generateUserRefreshToken,
} = require("../../middlewares/User/user.auth");
const { default: mongoose } = require("mongoose");
const { generateReferralCode } = require("../../Utils/generateReferralCode");

const ensureUserReferralCode = async (user) => {
  if (!user || user.referralCode) {
    return user;
  }

  const maxRetries = 10;

  for (let retries = 0; retries < maxRetries; retries++) {
    const referralCode = generateReferralCode();
    const exists = await User.exists({ referralCode });

    if (exists) {
      continue;
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { referralCode: { $exists: false } },
            { referralCode: null },
            { referralCode: "" },
          ],
        },
        { $set: { referralCode } },
        { new: true },
      );

      if (updatedUser) {
        return updatedUser;
      }

      const latestUser = await User.findById(user._id);
      if (latestUser?.referralCode) {
        return latestUser;
      }
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate unique referral code");
};

// Create a new user
// exports.login = async (req, res) => {
//   const otp = generateRandom4Digit();
//   const currentTime = new Date().getTime();
//   const generateOtpExpiryTime = new Date(currentTime + 2 * 60 * 1000).getTime();

//   const phoneNumber = req.body.phoneNumber;
//   const countryCode = req.body.countryCode;

//   const user = await User.findOne({
//     phoneNumber: phoneNumber,
//     countryCode: countryCode,
//   });

//   if (user && phoneNumber == `${process.env.PHONE_NUMBER}`) {
//     const staticOtp = process.env.DEMO_OTP;
//     const assessToken = jwt.sign(
//       { _id: user._id, phoneNumber: user.phoneNumber },
//       process.env.USER_SECRET,
//       { expiresIn: "30d" },
//     );

//     const refreshToken = jwt.sign(
//       { _id: user._id, phoneNumber: user.phoneNumber },
//       process.env.USER_SECRET,
//     );

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: user._id },
//       {
//         refreshToken: refreshToken,
//         otp: staticOtp,
//         otpExpiryTime: generateOtpExpiryTime,
//         deviceToken: req.body?.deviceToken,
//       },
//       { new: true },
//     );

//     // await sendOTPSMS(phoneNumber, staticOtp);

//     return res.status(201).json({
//       status: true,
//       otp: staticOtp,
//       data: updatedUser,
//       userId: user._id,
//       assessToken: assessToken,
//       refreshToken: refreshToken,
//     });
//   }

//   if (user) {
//     const assessToken = jwt.sign(
//       { _id: user._id, phoneNumber: user.phoneNumber },
//       process.env.USER_SECRET,
//       { expiresIn: "30d" },
//     );

//     const refreshToken = jwt.sign(
//       { _id: user._id, phoneNumber: user.phoneNumber },
//       process.env.USER_SECRET,
//     );

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: user._id },
//       {
//         otp: otp,
//         refreshToken: refreshToken,
//         otpExpiryTime: generateOtpExpiryTime,
//         deviceToken: req.body?.deviceToken,
//       },
//       { new: true },
//     );
//     console.log("### user", otp, user.phoneNumber);

//     await sendOTPSMS(user.phoneNumber, otp);

//     return res.status(201).json({
//       status: true,
//       otp: otp,
//       data: updatedUser,
//       userId: user._id,
//       assessToken: assessToken,
//       refreshToken: refreshToken,
//     });
//   } else {
//     const newUser = await User.create({
//       phoneNumber: phoneNumber,
//       countryCode: countryCode,
//       otp: otp,
//       otpExpiryTime: generateOtpExpiryTime,
//       deviceToken: req.body?.deviceToken,
//     });

//     const assessToken = jwt.sign(
//       { _id: newUser._id, phoneNumber: newUser.phoneNumber },
//       process.env.USER_SECRET,
//       { expiresIn: "30d" },
//     );

//     const refreshToken = jwt.sign(
//       { _id: newUser._id, phoneNumber: newUser.phoneNumber },
//       process.env.USER_SECRET,
//     );

//     // Update refreshToken after creating user
//     newUser.refreshToken = refreshToken;
//     await newUser.save();

//     await sendOTPSMS(phoneNumber, otp);
//     console.log("### new user", otp, phoneNumber);

//     return res.status(201).json({
//       status: true,
//       otp: otp,
//       data: newUser,
//       userId: newUser?._id,
//       assessToken: assessToken,
//       refreshToken: refreshToken,
//     });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { phoneNumber, countryCode, deviceToken } = req.body;

    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        status: false,
        message: "Phone number and country code are required",
      });
    }

    const isDevelopment = process.env.NODE_ENV === "development";

    const isDemoNumber = phoneNumber === process.env.PHONE_NUMBER;

    const otp =
      isDevelopment || isDemoNumber
        ? process.env.DEMO_OTP || "1111"
        : generateRandom4Digit();

    const otpExpiryTime = Date.now() + 2 * 60 * 1000;

    let user = await User.findOne({ phoneNumber, countryCode });

    if (!user) {
      user = await User.create({
        phoneNumber,
        countryCode,
        deviceToken,
      });
    }

    user = await ensureUserReferralCode(user);

    user.otp = otp;
    user.otpExpiryTime = otpExpiryTime;
    user.deviceToken = deviceToken;

    const accessToken = generateUserAccessToken(user);
    const refreshToken = generateUserRefreshToken(user);

    user.refreshToken = refreshToken;

    await user.save();
    
    // Check if user has any active address
    const hasAddress = !!(await Address.exists({ userId: user._id, isActive: 1 }));

    if (!isDevelopment && !isDemoNumber) {
      await sendOTPSMS(user.phoneNumber, otp);
    }

    // Match production (nouvakserverapp) loginRegisterUser response exactly.
    // User App OTP screen reads res.data.data.userId, so userId must be in data.
    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      data: {
        userId: user._id,
        ...(isDevelopment && { otp }),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const currentTime = new Date().getTime();

  const { userId, otp } = req.body;
  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(400).json({
      status: false,
      message: MESSAGES.NOT_FOUND,
    });
  }

  if (user.otpExpiryTime >= currentTime) {
    if (user.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: MESSAGES.INVALID_OTP,
      });
    }

    await User.updateOne({ _id: userId }, { isOtpVerify: 1 });
    const findAgain = await ensureUserReferralCode(
      await User.findOne({ _id: userId }),
    );

    // Issue fresh tokens
    const accessToken = generateUserAccessToken(findAgain);
    const refreshToken = generateUserRefreshToken(findAgain);

    await User.updateOne({ _id: userId }, { refreshToken });

    // Match production (nouvakserverapp) verifyOtp response exactly:
    // { success, message, accessToken, refreshToken, user }
    // User App reads res.data.accessToken and res.data.refreshToken directly.
    return res.status(200).json({
      success: true,
      message: "OTP verified, user activated",
      accessToken,
      refreshToken,
      user: findAgain,
    });
  } else {
    return res.status(410).json({
      status: false,
      message: MESSAGES.OTP_EXPIRED,
    });
  }
};

// exports.resendOtp = async (req, res) => {
//     const otp = generateRandom4Digit()
//     const currentTime = new Date().getTime();
//     const otpExpiryTime = new Date(currentTime + 2 * 60 * 1000).getTime()

//     const phone_number = req.body.phoneNumber
//     const country_code = req.body.countryCode;

//     const user = await User.findOne({ countryCode: country_code, phoneNumber: phone_number })

//     if (!user) {
//         return res.status(400).json({
//             status: false,
//             message: MESSAGES.NOT_FOUND
//         })
//     }

//     if (req.body.phoneNumber == '9900990099') {

//         return res.status(200).json({
//             status: true,
//             otp: '',
//             data: user
//         })
//     }

//     console.log(";:::::::::");
//     // otp and otp time
//     await User.updateOne({ _id: user._id }, { otpExpiryTime: otpExpiryTime, otp: otp })

//     return res.status(200).json({
//         status: true,
//         otp: otp,
//         data: user
//     })

// };

exports.resendOtp = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "User id is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    const phoneNumber = user.phoneNumber;

    // if (req.body.phoneNumber == "9900990099") {
    //   return res.status(200).json({
    //     status: true,
    //     message: "OTP sent successfully",
    //     data: user,
    //   });
    // }

    const isDevelopment = process.env.NODE_ENV === "development";

    const isDemoNumber = phoneNumber === process.env.PHONE_NUMBER;

    const otp =
      isDevelopment || isDemoNumber
        ? process.env.DEMO_OTP || "1111"
        : generateRandom4Digit();

    const otpExpiryTime = Date.now() + 2 * 60 * 1000;

    if (!isDevelopment && !isDemoNumber) {
      await sendOTPSMS(user.phoneNumber, otp);
    }

    // Update OTP and expiry
    user.otp = otp;
    user.otpExpiryTime = otpExpiryTime;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      data: {
        id: user._id,
        phoneNumber: user.phoneNumber,
      },
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

exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    let user = await User.findById(userId).select(
      "name phoneNumber countryCode email gender profilePhoto referralCode referralEarnings",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await ensureUserReferralCode(user);
    user = await User.findById(userId).select(
      "name phoneNumber countryCode email gender profilePhoto referralCode referralEarnings",
    );

    return res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        referralEarnings: user.referralEarnings || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

exports.updateProfile = async (req, res) => {
  let profilePhotoUrl;
  try {
    const {
      userId,
      userName,
      gender,
      email,
      profilePhotoUrl: newPhoto,
    } = req.body;
    profilePhotoUrl = newPhoto;

    if (!userId) {
      await safeDelete(profilePhotoUrl);
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      await safeDelete(profilePhotoUrl);

      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUNDs,
      });
    }

    /* ---------- UPDATE PAYLOAD ---------- */
    const updateProfile = {};

    if (userName) updateProfile.name = userName;
    if (gender) updateProfile.gender = gender;
    if (email) updateProfile.email = email;
    if (profilePhotoUrl) updateProfile.profilePhoto = profilePhotoUrl;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateProfile },
      { new: true },
    ).select("name email gender profilePhoto");

    if (
      profilePhotoUrl &&
      user.profilePhoto &&
      user.profilePhoto !== profilePhotoUrl
    ) {
      await safeDelete(user.profilePhoto);
    }

    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: {
        userId: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        gender: updatedUser.gender,
        profilePhoto: updatedUser.profilePhoto,
      },
    });
  } catch (error) {
    await safeDelete(profilePhotoUrl);
    console.error("Update profile error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

exports.getPresignedUrlForUser = async (req, res) => {
  const userId = req.user._id;
  const { fileName, fileType } = req.query;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    if (!fileName || !fileType) {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "File name and type are required",
      });
    }

    const url = await getPresignedUrl(fileName, fileType, 3);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: url,
    });
  } catch (error) {
    console.error(
      "Error getting presigned URL for user profile photo upload:",
      error,
    );
    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.addEditAddress = async (req, res) => {
  try {
    const {
      addressId,
      userId,
      houseNumber,
      street,
      state,
      city,
      zipCode,
      landmark,
      saveAs,
      isDefault,
    } = req.body;
    if (!userId || !street || !state || !city || !zipCode) {
      return res.status(200).json({
        status: false,
        message: "All fields are required",
      });
    }

    let finalIsDefault = isDefault;

    // Ensure at least one default exists
    const existingDefault = await Address.findOne({
      userId,
      isDefault: true,
    });

    if (!existingDefault) {
      finalIsDefault = true;
    }

    // If setting this as default → unset others
    if (finalIsDefault === true) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    if (!addressId) {
      // insert a new address
      const createdAddress = await Address.create({
        userId: userId,
        house: houseNumber,
        street: street,
        state: state,
        city: city,
        zipcode: zipCode,
        saveAs: saveAs || "",
        landmark: landmark || "",
        isDefault: finalIsDefault,
      });
      return res.send({
        status: true,
        message: "Address created successfully",
        data: createdAddress,
      });
    } else {
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        {
          userId: userId,
          house: houseNumber,
          street: street,
          state: state,
          city: city,
          zipcode: zipCode,
          saveAs: saveAs || "",
          landmark: landmark || "",
          isDefault: finalIsDefault,
        },
        {
          new: true,
        },
      );

      if (!updatedAddress) {
        return res.status(404).json({
          status: false,
          message: "Address not found",
        });
      }

      return res.send({
        status: true,
        message: "Address updated successfully",
        data: updatedAddress,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
    });
  }
};

exports.userAddressList = async (req, res) => {
  const userId = req.params.userId;

  const user = await User.findOne({ _id: new Types.ObjectId(userId) });

  if (!user) {
    return res.send({
      status: false,
      message: MESSAGES.NOT_FOUND,
    });
  }

  const address = await Address.find({
    userId: userId,
    isActive: 1,
  }).sort({ createdAt: -1 });

  return res.send({
    status: true,
    data: address,
  });
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;

    if (!userId || !addressId) {
      return res.status(400).json({
        status: false,
        message: "userId and addressId are required",
      });
    }

    // Check if address exists
    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    // If already default → no need to update
    if (address.isDefault) {
      return res.send({
        status: true,
        message: "Address is already default",
        data: address,
      });
    }

    // Transaction (recommended with unique index)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Remove default from others
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } },
        { session },
      );

      // Set this one as default
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        { isDefault: true },
        { new: true, session },
      );

      await session.commitTransaction();
      session.endSession();

      return res.send({
        status: true,
        message: "Default address updated successfully",
        data: updatedAddress,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
    });
  }
};

exports.userAddressDelete = async (req, res) => {
  const addressId = req.params.addressId;

  const address = await Address.findOne({
    _id: addressId,
  });

  if (!address) {
    return res.send({
      status: false,
      message: "Address not found",
    });
  }

  await Address.updateOne({ _id: addressId }, { isActive: 0 });

  return res.send({
    status: true,
    message: "Address deleted successfully",
  });
};

// exports.userHomeScreenList = async (req, res) => {
//   const data = [
//     {
//       logo: "https://acdoctor-service-booking-system.s3.ap-south-1.amazonaws.com/prod/homescreen/homebanner.png",
//     },
//   ];
//   return res.send({
//     status: true,
//     data: data,
//   });
// };

// const HomeBanner = require("../models/HomeBanner");

exports.getHomeBanners = async (req, res) => {
  try {
    const {
      appType,
      destination,
      position,
      page = 1,
      limit = 10,
      sortBy = "position",
      orderBy = "asc",
      includeInactive = false,
    } = req.query;

    const query = {};

    if (appType) query.appType = appType;
    if (destination) query.destination = destination;
    if (position) query.position = Number(position);

    // default behaviour → only active banners
    if (includeInactive !== "true") {
      query.isActive = true;
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = orderBy === "desc" ? -1 : 1;

    const [banners, total] = await Promise.all([
      HomeBanner.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      HomeBanner.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: banners,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
    });
  }
};

exports.userLogout = async (req, res) => {
  const userId = req.params.userId;

  const user = await User.findOne({ _id: userId });

  if (!user) {
    return res.send({
      status: false,
      message: "User not found",
    });
  } else {
    // update token as empty from user
    await User.updateOne({ _id: userId }, { deviceToken: "" });
    return res.send({
      status: true,
      message: "Logout successfully",
    });
  }
};

exports.demo = async (req, res) => {
  const token =
    "fI5-a-QuQQScV7neKwAmO1:APA91bEbh5dCd41158npTrJURGZJ8WuiSf-EG27N0f2N_cADGTDD7NNtUPQIvCgF9xlnWwLDFeeiEdPFtr45CcRpVmwVYETpen20uuARqAcVBp9D9Jvn5LU";
  try {
    await sendPushNotification(
      token,
      "Hello khhala",
      "This is a test notification",
    );
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.notificationList = async (req, res) => {
  //   const { page, limit, userId } = req.body;

  const userId = req.user._id;
  const { page, limit } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  try {
    const notifications = await Notification.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId), isDeleted: false },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
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
        $project: {
          "user._id": 1,
          "user.phoneNumber": 1,
          "user.countryCode": 1,
          _id: 1,
          text: 1,
          isChecked: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const totalNotifications = await Notification.countDocuments({
      userId,
      isDeleted: false,
    });

    return res.status(200).json({
      status: true,
      data: notifications,
      count: totalNotifications,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: userId,
        isDeleted: false,
      },
      {
        $set: { isChecked: true },
      },
      {
        new: true,
      },
    ).populate("userId", "_id phoneNumber countryCode");

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: notification,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.softDeleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: userId,
        isDeleted: false,
      },
      {
        $set: { isDeleted: true },
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found or already deleted",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.softDeleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      {
        userId: userId,
        isDeleted: false,
      },
      {
        $set: { isDeleted: true },
      },
    );

    return res.status(200).json({
      status: true,
      message: "All notifications deleted successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.markNotificationAsChecked = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: userId,
        isDeleted: false,
      },
      {
        $set: { isChecked: 1 },
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Notification marked as checked",
      data: notification,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.markAllNotificationsAsChecked = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      {
        userId: userId,
        isDeleted: false,
        isChecked: false,
      },
      {
        $set: { isChecked: true },
      },
    );

    return res.status(200).json({
      status: true,
      message: "All notifications marked as checked",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

// exports.getMultiplePresignedUrlForUser = async (req, res) => {
//   const userId = req.user._id;
//   const { fileName, fileType } = req.query;

//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(CODES.NOT_FOUND).json({
//         status: STATUS.FAIL,
//         message: MESSAGES.USER_NOT_FOUND,
//       });
//     }

//     if (!fileName || !fileType) {
//       return res.status(CODES.BAD_REQUEST).json({
//         status: STATUS.FAIL,
//         message: "File name and type are required",
//       });
//     }

//     const urls = await getMultiplePresignedUrls(files, type || 4);

//     const uploadUrls = urls.map((item) => item.uploadUrl);

//     return res.status(CODES.SUCCESS).json({
//       status: STATUS.SUCCESS,
//       data: uploadUrls,
//     });
//   } catch (error) {
//     console.error(
//       error,
//     );
//     return res.status(CODES.SERVER_ERROR).json({
//       status: STATUS.FAIL,
//       message: MESSAGES.SERVER_ERROR,
//       error: error.message,
//     });
//   }
// };

exports.getMultiplePresignedUrlForUser = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(CODES.NOT_FOUND).json({
        status: STATUS.FAIL,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    let files = [];
    let type;

    // Case 1: Multiple files from body
    if (Array.isArray(req.body.files) && req.body.files.length > 0) {
      files = req.body.files;
      type = req.body.type;
    }

    // Case 2: Single file from query
    else if (req.query.fileName && req.query.fileType) {
      files = [
        {
          fileName: req.query.fileName,
          fileType: req.query.fileType,
        },
      ];
      type = req.query.type;
    }

    // Invalid request
    else {
      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message:
          "Provide either files array in body OR fileName & fileType in query",
      });
    }

    const urls = await getMultiplePresignedUrls(files, type || 4);

    return res.status(CODES.SUCCESS).json({
      status: STATUS.SUCCESS,
      data: urls,
    });
  } catch (error) {
    console.error("Presigned URL Error:", error);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};

exports.createOrUpdateAppReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { rating, review, images = [] } = req.body;

    // validation
    if (!rating) {
      return res.status(400).json({
        status: false,
        message: "Rating is required",
      });
    }

    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        status: false,
        message: "Rating must be between 0 and 5",
      });
    }

    if (!Array.isArray(images)) {
      return res.status(400).json({
        status: false,
        message: "Images must be an array of URLs",
      });
    }

    if (images.length > 5) {
      return res.status(400).json({
        status: false,
        message: "Maximum 5 images allowed",
      });
    }

    // create OR update
    const reviewDoc = await AppReview.findOneAndUpdate(
      { user_id: userId },
      {
        rating,
        review,
        images,
      },
      {
        new: true, // return updated doc
        upsert: true, // create if not exists
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      status: true,
      message:
        reviewDoc.createdAt === reviewDoc.updatedAt
          ? "Review submitted successfully"
          : "Review updated successfully",
      data: reviewDoc,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
    });
  }
};

exports.getActiveAppReviews = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const pipeline = [
      {
        $match: {
          isDeleted: false,
          isActive: true,
        },
      },

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

      // Join address (default address only)
      {
        $lookup: {
          from: "addresses",
          let: { userId: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$isDefault", true] },
                  ],
                },
              },
            },
            {
              $project: {
                house: 1,
                street: 1,
                city: 1,
                state: 1,
                zipcode: 1,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Projection
      {
        $project: {
          rating: 1,
          review: 1,
          images: 1,
          position: 1,
          createdAt: 1,
          userName: "$user.name",
          profilePhoto: "$user.profilePhoto",
          address: 1,
        },
      },

      // Sorting (IMPORTANT)
      {
        $sort: {
          position: 1, // primary
          createdAt: -1, // fallback
        },
      },

      // Pagination
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
      message: "Error fetching active reviews",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY CONTROLLERS
// These match the Nouvak User App's expected API surface.
// They call into existing business logic but via token-based identity instead
// of URL-param userId, and use the production-compatible paths.
// ─────────────────────────────────────────────────────────────────────────────

const {
  verifyUserRefreshToken,
} = require("../../middlewares/User/user.auth");

// POST /api/v1/user/refresh
// Request body: { refreshToken: "..." }
// Response: { accessToken: "..." }
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: false, message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = verifyUserRefreshToken(refreshToken);
    } catch {
      return res.status(403).json({ status: false, message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ status: false, message: "Refresh token revoked" });
    }

    const accessToken = generateUserAccessToken(user);
    // Match production: { success: true, accessToken }
    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/v1/user/resend-otp  (no :id param — production reads userId from body)
// Production response: { success: true, message: "OTP resent successfully" }
exports.resendOtpFromBody = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isDevelopment = process.env.NODE_ENV === "development";
    const isDemoNumber = user.phoneNumber === process.env.PHONE_NUMBER;
    const { generateRandom4Digit, sendOTPSMS } = require("../../Utils/common");

    const otp = isDevelopment || isDemoNumber
      ? process.env.DEMO_OTP || "1111"
      : generateRandom4Digit();

    user.otp = otp;
    user.otpExpiryTime = Date.now() + 2 * 60 * 1000;
    await user.save();

    if (!isDevelopment && !isDemoNumber) {
      await sendOTPSMS(user.phoneNumber, otp);
    }

    return res.status(200).json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("resendOtpFromBody error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/profile
// Match production getUserById: { success: true, data: userObject }
exports.getProfileFromToken = async (req, res) => {
  try {
    const userId = req.user._id;
    let user = await User.findById(userId).select(
      "name phoneNumber countryCode email gender profilePhoto referralCode referralEarnings loyaltyPoints",
    );
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    user = await ensureUserReferralCode(user);
    user = await User.findById(userId).select(
      "name phoneNumber countryCode email gender profilePhoto referralCode referralEarnings loyaltyPoints",
    );
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("getProfileFromToken error:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
};

// PUT /api/v1/user/update
// Match production updateUser: { success: true, message: "User updated", data: user }
exports.updateProfileFromToken = async (req, res) => {
  try {
    const userId = req.user._id;
    // Accept both production field names and existing cloned field names
    const { name, gender, email, profilePhoto, userName } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (userName !== undefined) update.name = userName; // cloned field name
    if (gender !== undefined) update.gender = gender;
    if (email !== undefined) update.email = email;
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true },
    ).select("name email gender profilePhoto");

    if (!updatedUser) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, message: "User updated", data: updatedUser });
  } catch (error) {
    console.error("updateProfileFromToken error:", error);
    return res.status(400).json({ success: false, error: String(error) });
  }
};

// GET /api/v1/user/addresses
// Match production userActiveAddresses response:
//   Success: { success: true, message, data: [...], count, phoneNumber }
//   No addresses: { success: false, message, data: [] }
// Also includes `error` field for User App compatibility
// (useCartScreen.js checks res.data.error === 'No addresses found for this user')
exports.getAddressesFromToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const addresses = await Address.find({ userId, isActive: 1 }).sort({ isDefault: -1, createdAt: -1 });

    if (!addresses.length) {
      return res.status(200).json({
        success: false,
        message: "No addresses found for this user",
        // Keep `error` field so User App (useCartScreen.js) redirects correctly
        error: "No addresses found for this user",
        data: [],
      });
    }

    const user = await User.findById(userId).select("phoneNumber");

    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      data: addresses,
      count: addresses.length,
      phoneNumber: user ? user.phoneNumber : undefined,
    });
  } catch (error) {
    console.error("getAddressesFromToken error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: String(error) });
  }
};

// POST /api/v1/user/address/add-edit
// Accepts production field names (houseNumber, zipCode, ownerName) and maps to
// cloned DB field names (house, zipcode). Reads userId from token.
exports.addEditAddressCompat = async (req, res) => {
  try {
    const userId = req.user._id;
    // Support both production field names and cloned field names
    const {
      addressId,
      houseNumber, house,         // production vs cloned
      street,
      city,
      state,
      zipCode, zipcode,           // production vs cloned
      landmark,
      saveAs,
      ownerName,                  // production only
      isDefault,
    } = req.body;

    const resolvedHouse = houseNumber || house;
    const resolvedZip   = zipCode || zipcode;

    if (!resolvedHouse || !street || !city || !state || !resolvedZip) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Inject userId and normalised fields back into body so the existing
    // addEditAddress controller can handle the DB write unchanged.
    req.body.userId  = userId.toString();
    req.body.house   = resolvedHouse;
    req.body.zipcode = resolvedZip;

    return exports.addEditAddress(req, res);
  } catch (error) {
    console.error("addEditAddressCompat error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/v1/user/address/delete/:addressId
// Soft-deletes an address. Delegates to existing userAddressDelete handler.
exports.deleteAddressAlias = async (req, res) => {
  return exports.userAddressDelete(req, res);
};

// GET /api/v1/user/notifications  (alias for /user/notification-list)
exports.notificationListAlias = async (req, res) => {
  return exports.notificationList(req, res);
};

// GET /api/v1/user/notifications/:id  (alias)
exports.getNotificationByIdAlias = async (req, res) => {
  return exports.getNotificationById(req, res);
};

// DELETE /api/v1/user/notifications/:id  (individual delete alias)
exports.softDeleteNotificationAlias = async (req, res) => {
  return exports.softDeleteNotification(req, res);
};

// DELETE /api/v1/user/notifications  (delete-all alias)
exports.softDeleteAllNotificationsAlias = async (req, res) => {
  return exports.softDeleteAllNotifications(req, res);
};

// PATCH /api/v1/user/notifications/check/:id  (alias — production uses PATCH)
exports.markNotificationAsCheckedAlias = async (req, res) => {
  return exports.markNotificationAsChecked(req, res);
};

// PATCH /api/v1/user/notifications/check-all  (alias — production uses PATCH)
exports.markAllNotificationsAsCheckedAlias = async (req, res) => {
  return exports.markAllNotificationsAsChecked(req, res);
};
