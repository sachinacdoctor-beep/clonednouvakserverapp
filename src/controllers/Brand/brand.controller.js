require('dotenv').config();
const { STATUS, MESSAGES, CODES } = require('../../Config/responseConstants');
const { Types } = require('mongoose');
const Brand = require('../../models/Brand/brand.model');
const { safeDelete } = require('../../Utils/s3');


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX 
// exports.adminCreateEditBrand = async (req, res) => {
//     try {
//         const { brandId, name } = req.body;

//         if (!name) {
//             return res.status(CODES.BAD_REQUEST).json({
//                 status: STATUS.FAIL,
//                 message: 'Brand name must be provided',
//             });
//         }

//         if (brandId) {
//             const existingBrand = await Brand.findOne({ name: name });
//             if (existingBrand && existingBrand._id.toString() !== brandId) {
//                 return res.status(CODES.BAD_REQUEST).json({
//                     status: STATUS.FAIL,
//                     message: 'Brand name already exists',
//                 });
//             }

//             await Brand.updateOne({ _id: brandId }, { name });
//             return res.status(CODES.SUCCESS).json({
//                 status: STATUS.SUCCESS,
//                 message: 'Brand updated successfully',
//             });
//         } else {
//             const existingBrand = await Brand.findOne({ name });
//             if (existingBrand) {
//                 return res.status(CODES.BAD_REQUEST).json({
//                     status: STATUS.FAIL,
//                     message: 'Brand already exists',
//                 });
//             }

//             await Brand.create({ name });
//             return res.status(CODES.SUCCESS).json({
//                 status: STATUS.SUCCESS,
//                 message: 'Brand created successfully',
//             });
//         }
//     } catch (error) {
//         return res.status(CODES.SERVER_ERROR).json({
//             status: STATUS.FAIL,
//             message: MESSAGES.SERVER_ERROR,
//             error: error.message,
//         });
//     }
// };

exports.adminCreateEditBrand = async (req, res) => {
  let brandLogoUrl;

  try {
    const { brandId, name } = req.body;

    brandLogoUrl = req.body.brandLogoUrl;

    // Validation
    if (!name) {
      if (brandLogoUrl) await safeDelete(brandLogoUrl);

      return res.status(CODES.BAD_REQUEST).json({
        status: STATUS.FAIL,
        message: "Brand name must be provided",
      });
    }

    if (brandId) {
      const existingBrand = await Brand.findOne({ name });

      if (existingBrand && existingBrand._id.toString() !== brandId) {
        if (brandLogoUrl) await safeDelete(brandLogoUrl);

        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Brand name already exists",
        });
      }

      const brand = await Brand.findById(brandId);

      if (!brand) {
        if (brandLogoUrl) await safeDelete(brandLogoUrl);

        return res.status(CODES.NOT_FOUND).json({
          status: STATUS.FAIL,
          message: "Brand not found",
        });
      }

      // Delete old logo if new one is provided
      if (
        brandLogoUrl &&
        brand.brandLogoUrl &&
        brand.brandLogoUrl !== brandLogoUrl
      ) {
        await safeDelete(brand.brandLogoUrl);
      }

      await Brand.updateOne(
        { _id: brandId },
        {
          name,
          ...(brandLogoUrl && { brandLogoUrl }),
        },
      );

      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: "Brand updated successfully",
      });
    } else {
      const existingBrand = await Brand.findOne({ name });

      if (existingBrand) {
        if (brandLogoUrl) await safeDelete(brandLogoUrl);

        return res.status(CODES.BAD_REQUEST).json({
          status: STATUS.FAIL,
          message: "Brand already exists",
        });
      }

      const newBrand = await Brand.create({
        name,
        brandLogoUrl,
      });

      return res.status(CODES.SUCCESS).json({
        status: STATUS.SUCCESS,
        message: "Brand created successfully",
        data: newBrand,
      });
    }
  } catch (error) {
    if (brandLogoUrl) await safeDelete(brandLogoUrl);

    return res.status(CODES.SERVER_ERROR).json({
      status: STATUS.FAIL,
      message: MESSAGES.SERVER_ERROR,
      error: error.message,
    });
  }
};


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.adminBrandActiveInactive = async (req, res) => {

    const { brandId } = req.params;

    const brand = await Brand.findOne({ _id: brandId })

    if (!brand) {
        return res.status(400).json({
            status: false,
            message: 'No data found'
        });
    } else {
        if (brand.isActive == 1) {

            await Brand.updateOne({ _id: brandId }, { isActive: 0 })
            return res.status(200).json({
                status: true,
                message: 'Brand inactivated'
            });
        } else {
            await Brand.updateOne({ _id: brandId }, { isActive: 1 })
            return res.status(200).json({
                status: true,
                message: 'Brand activated'
            });
        }
    }
}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.adminBrandList = async (req, res) => {

    const pageNumber = parseInt(req.query?.page, 10) || 1;
    const pageSize = parseInt(req.query?.limit, 10) || 10;
    const search = req.query.search || '';
    const skip = (pageNumber - 1) * pageSize;
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;
   

    const list = await Brand.aggregate([
        { $unwind: { path: "$globalErrorCodes", preserveNullAndEmptyArrays: true } },  {
            $match: {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { "globalErrorCodes.code": { $regex: search, $options: "i" } }
                ]
            }
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                isActive: { $first: "$isActive" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                expiryDate: { $first: "$expiryDate" },
                registeredDate: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } },
                globalErrorCodes: { $push: "$globalErrorCodes" } // Collect globalErrorCodes back into an array
            }
        },
        {
            $project: {
                _id: 1,
                name: { $ifNull: ["$name", ""] },
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                expiryDate: 1,
                globalErrorCodes: 1,
                registeredDate: 1,
                errorCodeCount: { $size: { $ifNull: ["$globalErrorCodes", []] } } 
            }
        },
        {
            $sort: { [sortField]: sortOrder }
        },
        { $skip: skip },
        { $limit: pageSize }
    ]);

    
    const totalCount = await Brand.aggregate([
        {
            $match: {
                $or: [
                    { 'name': { $regex: search, $options: 'i' } }
                ]
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
}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.userBrandList = async (req, res) => {

    const pageNumber = parseInt(req.query?.page, 10) || 1;
    const pageSize = parseInt(req.query?.limit, 10) || 999;
    const search = req.query.search || '';
    const skip = (pageNumber - 1) * pageSize;


    const list = await Brand.aggregate([
        {
            $match: {
                $and: [
                    { isActive: 1 },
                    { 'name': { $regex: search, $options: 'i' } }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                name: { $ifNull: ["$name", ""] },
                brandLogoUrl: 1,
                isActive: 1,
                createdAt: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        // { $skip: skip },
        // { $limit: pageSize },
    ]);

    const totalCount = await Brand.aggregate([
        {
            $match: {
                $and: [
                    { isActive: 1 },
                    { 'name': { $regex: search, $options: 'i' } }
                ]
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
}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
