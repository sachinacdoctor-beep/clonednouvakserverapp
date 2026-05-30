require('dotenv').config();
const { STATUS, MESSAGES, CODES } = require('../../Config/responseConstants');
const { Types } = require('mongoose');
const Brand = require('../../models/Brand/brand.model');
const xlsx = require("xlsx");
const path = require("path");
const { default: mongoose } = require('mongoose');


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX 
exports.adminCreateEditErrorCode = async (req, res) => {
    // try {
    const {
        brandId,
        errorCodeId,
        acType,
        models,
        code,
        solution,
        description,
        category } = req.body;

    const errorCode = {
        code: code || '',
        acType: acType,
        models: models,
        solution: solution || [],
        description: description || '',
        category: category || 'NON_INVERTOR',
    };

    if (errorCodeId) {
        const result = await Brand.updateOne(
            {
                _id: brandId,
                'globalErrorCodes._id': errorCodeId
            },
            {
                $set: {
                    'globalErrorCodes.$.code': errorCode.code,
                    'globalErrorCodes.$.solution': errorCode.solution,
                    'globalErrorCodes.$.acType': errorCode.acType,
                    'globalErrorCodes.$.models': errorCode.models,
                    'globalErrorCodes.$.category': errorCode.category,
                    'globalErrorCodes.$.description': errorCode.description
                }
            }
        );

        if (result.nModified === 0) {
            return res.status(404).json({ status: false, message: 'Error code not found to update' });
        } else {
            return res.status(200).json({ status: true, message: 'Error code updated successfully' });
        }
    } else {
        await Brand.updateOne(
            { _id: brandId },
            { $push: { globalErrorCodes: errorCode } }
        );
        return res.status(200).json({ status: true, message: 'Error code saved successfully' });
    }


};

exports.errorCodeList = async (req, res) => {
  const { brandId, errorCode, acType, category } = req.body;

  try {
    const result = await Brand.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(brandId),
        },
      },
      { $unwind: "$globalErrorCodes" },
      {
        $match: {
          "globalErrorCodes.code": errorCode,
          "globalErrorCodes.acType": acType,
          "globalErrorCodes.category": category,
        },
      },
      {
        $group: {
          _id: "$_id",
          brandLogoUrl: { $first: "$brandLogoUrl" },
          brand: { $first: "$name" },
          errorCode: { $first: "$globalErrorCodes.code" },
          acType: { $first: "$globalErrorCodes.acType" },
          category: { $first: "$globalErrorCodes.category" },
          errors: {
            $push: {
              description: "$globalErrorCodes.description",
              solution: "$globalErrorCodes.solution",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          brand: 1,
          brandLogoUrl: 1,
          errorCode: 1,
          acType: 1,
          category: 1,
          errors: 1,
        },
      },
    ]);

    if (!result.length) {
      return res.status(404).json({
        status: false,
        message: "No matching data found",
      });
    }

    return res.status(200).json({
      status: true,
      data: result[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

exports.adminErrorCodeList = async (req, res) => {
    const { brandId } = req.params;

    if (!brandId) {
        return res.json({ status: false, message: "Brand ID is required" })
    }
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || '';
    const category = req.query.category?.trim() || null;
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;

    const matchConditions = { $and: [{ _id: new Types.ObjectId(brandId) }] };

    if (search) {
        matchConditions.$and.push({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { "globalErrorCodes.code": { $regex: search, $options: "i" } },
                { "globalErrorCodes.models": { $regex: search, $options: "i" } },
                { "globalErrorCodes.acType": { $regex: search, $options: "i" } }
            ]
        });
    }

    if (category) {
        matchConditions.$and.push({
            "globalErrorCodes.category": category
        });
    }

    try {
        const errorCodeList = await Brand.aggregate([
            { $unwind: "$globalErrorCodes" },
            { $match: matchConditions },
            {
                $project: {
                    _id: { $ifNull: ["$globalErrorCodes._id", ""] },
                    code: { $ifNull: ["$globalErrorCodes.code", ""] },
                    acType: { $ifNull: ["$globalErrorCodes.acType", ""] },
                    models: { $ifNull: ["$globalErrorCodes.models", ""] },
                    createdAt: { $ifNull: ["$globalErrorCodes.createdAt", ""] },
                    solution: { $ifNull: ["$globalErrorCodes.solution", ""] },
                    category: { $ifNull: ["$globalErrorCodes.category", ""] },
                    description: { $ifNull: ["$globalErrorCodes.description", ""] }
                }
            },
            { $sort: { [sortField]: sortOrder } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);

        const totalRecords = await Brand.aggregate([
            { $match: { _id: new Types.ObjectId(brandId) } },
            { $unwind: "$globalErrorCodes" },
            { $match: matchConditions },
            { $count: "count" }
        ]);

        const totalItems = totalRecords.length ? totalRecords[0].count : 0;

        return res.status(200).json({
            status: true,
            data: errorCodeList,
            count: totalItems
        });
    } catch (error) {
        console.log("------", error);
        return res.status(500).json({
            status: false,
            message: "Failed to retrieve error code list",
            error: error.message
        });
    }
};

exports.adminExcelErrorCodeUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

        const sheetNames = workbook.SheetNames;
        const sheet = workbook.Sheets[sheetNames[0]];


        const data = xlsx.utils.sheet_to_json(sheet);
        const expectedColumns = ['brandname', 'modelname', 'acType', 'error code', 'description', 'solution', 'category'];

        const getData = data[0]

        const actualColumns = [getData].every(item =>
            expectedColumns.every(key => key in item)
        );
        if (!actualColumns) {
            const missingColumns = expectedColumns.filter(
                col => ![getData].some(item => col in item)
            );

            return res.status(400).json({
                message: "Invalid column names",
                missingColumns: missingColumns,
            });
        }


        for (const element of data) {
            const brandName = element.brandname
            const solution = element.solution
            const modelname = element.modelname
            const acType = element.acType
            const errorCode = element['error code']
            const description = element.description
            const category = element.category

            const errorCodeObj = {
                code: errorCode || '',
                models: modelname || '',
                acType: acType || '',
                solution: solution.split(",").map(item => item.trim()) || [],
                description: description,
                category: category || 'NON_INVERTOR'
            };

            const findBrandOnly = await Brand.findOne({ name: brandName })

            if (findBrandOnly) {
                // const findBrand = await Brand.findOne({
                //     name: brandName,
                //     globalErrorCodes: {
                //         $elemMatch: {
                //             code: errorCode,
                //             models: modelname,
                //         },
                //     },
                // });

                const findBrandWithMatchedData = await Brand.aggregate([
                    {
                        $match: {
                            name: brandName,
                            globalErrorCodes: {
                                $elemMatch: {
                                    code: errorCode,
                                    models: modelname,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            matchedErrorCode: {
                                $filter: {
                                    input: "$globalErrorCodes",
                                    as: "errorCode",
                                    cond: {
                                        $and: [
                                            { $eq: ["$$errorCode.code", errorCode] },
                                            { $eq: ["$$errorCode.models", modelname] },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ]);
                if (findBrandWithMatchedData.length > 0) {
                    const errorCodeData = findBrandWithMatchedData[0]?.matchedErrorCode[0]
                    const result = await Brand.updateOne(
                        {
                            name: brandName,
                            globalErrorCodes: {
                                $elemMatch: { code: errorCode, models: modelname, },
                            },
                        },
                        {
                            $set: {
                                'globalErrorCodes.$.code': errorCodeObj.code || errorCodeData?.code,
                                'globalErrorCodes.$.solution': solution ? solution.split(",").map(item => item.trim()) : errorCodeData?.solution || [],
                                'globalErrorCodes.$.acType': errorCodeObj.acType || errorCodeData?.acType,
                                'globalErrorCodes.$.models': errorCodeObj.models || errorCodeData?.models,
                                'globalErrorCodes.$.category': errorCodeObj.category || errorCodeData?.category,
                                'globalErrorCodes.$.description': errorCodeObj.description || errorCodeData?.description
                            }
                        },
                        {
                            upsert: false
                        }
                    );
                } else {
                    await Brand.updateOne(
                        { name: brandName },
                        {
                            $push: {
                                globalErrorCodes: errorCodeObj
                            }
                        },
                    );
                }
            } else {
                const createBrand = await Brand.create({ name: brandName });
                await Brand.updateOne(
                    { name: brandName },
                    {
                        $push: {
                            globalErrorCodes: errorCodeObj
                        }
                    },
                );
            }
        }
        res.status(200).json({ message: "File processed successfully" });
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
};

exports.dummyExcelFileDownload = async (req, res) => {

    const url = "https://acdoctor-service-booking-system.s3.ap-south-1.amazonaws.com/DummyExcel/ErrorCodes.xlsx"
    // const data = [
    //   { brandname: 'Brand XYZ', solution: 'Comma separate', modelname: 'Model 123', errorCode: 'E001' }
    // ];

    // const worksheet = xlsx.utils.json_to_sheet(data, { header: ['brandname', 'solution', 'modelname', 'errorCode'] });

    // const workbook = xlsx.utils.book_new();
    // xlsx.utils.book_append_sheet(workbook, worksheet, 'Error Codes');

    // const filePath = './ErrorCodes.xlsx';
    // xlsx.writeFile(workbook, filePath);

    // console.log(`Excel file generated: ${filePath}`);

    return res.send({
        status: true,
        data: url
    })
};

