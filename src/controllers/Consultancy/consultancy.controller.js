require('dotenv').config();
const Address = require('../../models/User/address.model');
const { STATUS, MESSAGES, CODES } = require('../../Config/responseConstants');
const User = require('../../models/User/user.model');
const { Types } = require('mongoose');
const Consultancy = require('../../models/Consultancy/consultancy.model');
const moment = require('moment');
const AWS = require('aws-sdk');
const multer = require('multer');
const { sendPushNotification } = require('../../Utils/notification');
const Notification = require('../../models/Notifications/notification.model');
const Enquiry = require('../../models/Enquiry/enquiry.model');


AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Multer setup for handling file uploads
const upload = multer({ storage: multer.memoryStorage() }).single('file');



// exports.createConsultancy = async (req, res) => {

//     const { user_id, serviceName, brandId, quantity, comment, place, addressId, slot, date } = req.body;

//     if (!brandId) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: 'Brand ID is required'
//         });
//     }

//     if (!user_id) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.USER_ID_REQUIRED
//         });
//     }

//     if (!addressId) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.ADDRESS_ID_REQUIRED
//         });
//     }
//     if (!slot) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL, message: MESSAGES.SLOT_REQUIRED

//         });
//     }
//     if (!date || isNaN(new Date(date).getTime())) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.INVALID_DATE
//         });
//     }

//     const findAddress = await Address.findOne({ _id: addressId })
//     if (!findAddress) {
//         return res.status(CODES.BAD_REQUEST).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.VALID_ADDRESS_ID_REQUIRED
//         });
//     }

//     const countTotalConsultancy = await Consultancy.countDocuments();

//     const sequenceNumber = String(countTotalConsultancy + 1).padStart(5, '0');
//     let formattedDate = moment().format('DDMMYYYY');

//     const consultancyId = `CONS-${formattedDate}-${sequenceNumber}`;

//     const newConsultancy = await Consultancy.create({
//         user_id: user_id,
//         brandId: brandId,
//         consultancyId: consultancyId,
//         serviceName: serviceName || [],
//         addressDetails: findAddress,
//         slot: slot,
//         date: date,
//         quantity: quantity,
//         comment: comment,
//         place: place
//     });

//     return res.status(201).json({
//         status: true,
//         message: 'Request submitted successfully'
//     });
// };


exports.createConsultancy = async (req, res) => {
    const { user_id, serviceName, alternatePhone, brandId, quantity, comment, place, addressId, slot, date } = req.body;
    // console.log(";;;;;;;;;;;user_id, serviceName, brandId;;;",);
    // console.log(";;;;;;;;;;;user_id, serviceName, brandId;;;", typeof serviceName,);


    // return
    if (!brandId) return res.status(400).json({ status: false, message: 'Brand ID is required' });
    if (!user_id) return res.status(400).json({ status: false, message: 'User ID is required' });
    if (!addressId) return res.status(400).json({ status: false, message: 'Address ID is required' });
    if (!slot) return res.status(400).json({ status: false, message: 'Slot is required' });
    if (!date || isNaN(new Date(date).getTime())) {
        return res.status(400).json({ status: false, message: 'Invalid date format' });
    }



    const address = await Address.findOne({ _id: addressId });
    if (!address) {
        return res.status(400).json({ status: false, message: 'Valid Address ID required' });
    }

    const countTotalConsultancy = await Consultancy.countDocuments();
    const sequenceNumber = String(countTotalConsultancy + 1).padStart(5, '0');
    const formattedDate = moment().format('DDMMYYYY');
    const consultancyId = `CONS-${formattedDate}-${sequenceNumber}`;

    let fileUrl = null;
    if (req.file) {
        const params = {
            Bucket: 'acdoctor-service-booking-system',
            Key: `consultancies/image/${consultancyId}/${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const s3Response = await s3.upload(params).promise();

        fileUrl = s3Response.Location;
    }

    const istDate = new Date(date).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

     const enquiryUniqueId = `ACDEQ-${moment().format("DDMM")}-${Date.now()}`;

    const createdEnquiry = await Enquiry.create({
      user_id,
      enquiryId: enquiryUniqueId,
      type: "QUOTE_REQUEST",
      subType: "FREE_CONSULTATION",
      status: "REQUESTED",

      noOfAc: quantity || 1,

      addressDetails: {
        house: address.house || "",
        street: address.street,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
        saveAs: address.saveAs || "",
        landmark: address.landmark || "",
      },

      schedule: {
        slot: slot,
        date: new Date(istDate),
      },
    });

    // Save consultancy to database
    const newConsultancy = await Consultancy.create({
        user_id,
        brandId,
        consultancyId,
        enquiryId:createdEnquiry._id,
        // serviceName: serviceName ? (serviceName).split(",") : [],
        addressDetails: address,
        slot,
        alternatePhone: alternatePhone,
        date: new Date(istDate),
        quantity,
        comment,
        place,
        documentURL: fileUrl,
    });


    const userToken = await User.findOne({ _id: user_id }).select('deviceToken')

    // if (userToken?.deviceToken) {
    //     if (userToken.deviceToken != "") {
    //         const registrationToken = userToken.deviceToken;
    //         const title = '📦 Consultation request recieved';
    //         const body = MESSAGES.FREE_CONSULTANCY;
    //         await sendPushNotification(registrationToken, title, body);

    //         await Notification.create({
    //            title: title,
    //             userId: user_id,
    //             text: MESSAGES.FREE_CONSULTANCY
    //         })
    //     }
    // }

    const title = "📦 Consultation request recieved";
    const body = MESSAGES.FREE_CONSULTANCY;

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
        status: true,
        message: 'Request submitted successfully',
    });
};
exports.adminCreateConsultancy = async (req, res) => {

    const { user_id, brandId,
        alternatePhone, documentURL, serviceName,
        consultancyId, quantity, comment, place, addressId,
        slot, date } = req.body;

    if (!user_id) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: MESSAGES.USER_ID_REQUIRED
        });
    }

    if (!addressId) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: MESSAGES.ADDRESS_ID_REQUIRED
        });
    }
    if (!slot) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL, message: MESSAGES.SLOT_REQUIRED

        });
    }
    if (!date || isNaN(new Date(date).getTime())) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: MESSAGES.INVALID_DATE
        });
    }

    const address = await Address.findOne({ _id: addressId })
    if (!address) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: MESSAGES.VALID_ADDRESS_ID_REQUIRED
        });
    }

    if (consultancyId == "") {

        const countTotalConsultancy = await Consultancy.countDocuments();

        const sequenceNumber = String(countTotalConsultancy + 1).padStart(5, '0');
        let formattedDate = moment().format('DDMMYYYY');

        const consultancyId = `CONS-${formattedDate}-${sequenceNumber}`;

        const newConsultancy = await Consultancy.create({
            brandId: brandId,
            user_id: user_id,
            alternatePhone: alternatePhone,
            documentURL: documentURL,
            consultancyId: consultancyId,
            serviceName: serviceName || [],
            addressDetails: address,
            slot: slot,
            date: date,
            quantity: quantity,
            comment: comment,
            place: place
        });

        return res.status(201).json({
            status: true,
            message: 'Request submitted successfully'
        });
    } else {

        await Consultancy.updateOne({ _id: consultancyId }, {
            serviceName: serviceName || [],
            addressDetails: address,
            brandId: brandId,
            alternatePhone: alternatePhone,
            documentURL: documentURL,
            slot: slot,
            date: date,
            quantity: quantity,
            comment: comment,
            place: place
        });

        return res.status(201).json({
            status: true,
            message: 'Request updated successfully'
        });

    }

};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userConsultancyDetails = async (req, res) => {

    const { consultancyId } = req.params;

    if (!consultancyId) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: 'Id is required'
        });
    }

    const consultancy = await Consultancy.findOne({ _id: new Types.ObjectId(consultancyId) })
        .populate('brandId', 'name');

    return res.status(201).json({
        status: true,
        data: consultancy
    });
};
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.adminConsultancyDetails = async (req, res) => {

    const { consultancyId } = req.params;

    if (!consultancyId) {
        return res.status(CODES.BAD_REQUEST).json({
            status: STATUS.FAIL,
            message: 'Id is required'
        });
    }

    const consultancyDetails = await Consultancy.aggregate([
        {
            $match: { _id: new Types.ObjectId(consultancyId) }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: {
                path: '$userDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'brands',
                localField: 'brandId',
                foreignField: '_id',
                as: 'brandData'
            }
        },
        {
            $unwind: {
                path: '$brandData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                'userDetails.name': { $ifNull: ['$userDetails.name', ''] },
                'userDetails.phoneNumber': { $ifNull: ['$userDetails.phoneNumber', ''] },
                'userDetails.countryCode': { $ifNull: ['$userDetails.countryCode', ''] }
            }
        },
        {
            $project: {
                _id: 1,
                bookingId: 1,
                serviceDetails: 1,
                alternatePhone: { $ifNull: ["$alternatePhone", ""] },
                documentURL: { $ifNull: ["$documentURL", ""] },
                addressDetails: 1,
                slot: 1,
                date: 1,
                brand: { $ifNull: ["$brandData", {}] },
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                'userDetails.name': 1,
                'userDetails.phoneNumber': 1,
                'userDetails.countryCode': 1
            }
        }
    ]);

    if (consultancyDetails.length > 0) {
        return res.status(201).json({
            status: true,
            data: consultancyDetails[0]
        });
    } else {
        return res.status(201).json({
            status: false,
            data: []
        });
    }

};
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userConsultancyList = async (req, res) => {

    const userId = req.params.userId

    if (!userId) {
        return res.send({ status: false, message: MESSAGES.USER_ID_REQUIRED })
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const list = await Consultancy.aggregate([
        {
            $match: { user_id: new Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'brands',
                localField: 'brandId',
                foreignField: '_id',
                as: 'brandData'
            }
        },
        {
            $unwind: {
                path: '$brandData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                place: { $ifNull: ["$place", ""] },
                brandData: { $ifNull: ["$brandData.name", ""] },
                quantity: { $ifNull: ["$quantity", 0] },
                comment: { $ifNull: ["$comment", ""] },
                slot: { $ifNull: ["$slot", ""] },
                alternatePhone: { $ifNull: ["$alternatePhone", ""] },
                documentURL: { $ifNull: ["$documentURL", ""] },
                date: { $ifNull: ["$date", ""] },
                consultancyId: { $ifNull: ["$consultancyId", ""] },
                serviceName: { $ifNull: ["$serviceName", []] },
                addressDetails: { $ifNull: ["$addressDetails", {}] },
                createdAt: 1,
            }
        },
        {
            $sort: { createdAt: -1 }
        },
    ]);

    const totalLeads = await Consultancy.countDocuments({
        user_id: new Types.ObjectId(userId)
    });

    return res.status(200).json({
        status: true,
        data: list,
        count: totalLeads
    });
};
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.adminConsultancyList = async (req, res) => {


    const pageNumber = parseInt(req.query?.page, 10) || 1;
    const pageSize = parseInt(req.query?.limit, 10) || 10;
    const search = req.query.search || '';
    const skip = (pageNumber - 1) * pageSize;
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;

    const list = await Consultancy.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: {
                path: '$userDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'brands',
                localField: 'brandId',
                foreignField: '_id',
                as: 'brandData'
            }
        },
        {
            $unwind: {
                path: '$brandData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                $or: [
                    // { 'place': { $regex: search, $options: 'i' } },
                    // { 'brandData.name': { $regex: search, $options: 'i' } },
                    // { 'consultancyId': { $regex: search, $options: 'i' } },
                    { 'userDetails.name': { $regex: search, $options: 'i' } },
                ]
            }
        },
        {
            $addFields: {
                'userDetails.name': { $ifNull: ['$userDetails.name', ''] },
                'userDetails.phoneNumber': { $ifNull: ['$userDetails.phoneNumber', ''] },
                'userDetails.countryCode': { $ifNull: ['$userDetails.countryCode', ''] }
            }
        },
        {
            $project: {
                _id: 1,
                place: { $ifNull: ["$place", ""] },
                quantity: { $ifNull: ["$quantity", 0] },
                alternatePhone: { $ifNull: ["$alternatePhone", ""] },
                documentURL: { $ifNull: ["$documentURL", ""] },
                comment: { $ifNull: ["$comment", ""] },
                slot: { $ifNull: ["$slot", ""] },
                date: { $ifNull: ["$date", ""] },
                consultancyId: { $ifNull: ["$consultancyId", ""] },
                serviceName: { $ifNull: ["$serviceName", []] },
                brandData: { $ifNull: ["$brandData", ""] },
                createdAt: 1,
                userDetails: {
                    name: 1,
                    phoneNumber: 1,
                    countryCode: 1
                }
            }
        },
        {
            $sort: {
                [sortField]: sortOrder
            }
        },
        { $skip: skip },
        { $limit: pageSize }
    ]);

    const totalCount = await Consultancy.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: {
                path: '$userDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                $or: [
                    // { 'place': { $regex: search, $options: 'i' } },
                    // { 'consultancyId': { $regex: search, $options: 'i' } },
                    { 'userDetails.name': { $regex: search, $options: 'i' } },
                ]
            }
        },
        {
            $addFields: {
                'userDetails.name': { $ifNull: ['$userDetails.name', ''] },
                'userDetails.phoneNumber': { $ifNull: ['$userDetails.phoneNumber', ''] },
                'userDetails.countryCode': { $ifNull: ['$userDetails.countryCode', ''] }
            }
        },
        {
            $project: {
                _id: 1,
                place: { $ifNull: ["$place", ""] },
                quantity: { $ifNull: ["$quantity", 0] },
                comment: { $ifNull: ["$comment", ""] },
                slot: { $ifNull: ["$slot", ""] },
                date: { $ifNull: ["$date", ""] },
                consultancyId: { $ifNull: ["$consultancyId", ""] },
                serviceName: { $ifNull: ["$serviceName", []] },
                createdAt: 1,
                userDetails: {
                    name: 1,
                    phoneNumber: 1,
                    countryCode: 1
                }
            }
        },
        {
            $count: "totalCount"
        }
    ]);

    return res.status(200).json({
        status: true,
        data: list,
        count: totalCount.length > 0 ? totalCount[0].totalCount : 0
    });
};
