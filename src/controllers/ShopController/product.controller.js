const moment = require("moment");

const Product = require("../../models/Shop/product.model");
const PurchaseLead = require("../../models/Shop/purchaseLead.model");

const mongoose = require("mongoose");
const { safeDelete } = require("../../Utils/s3");
const Enquiry = require("../../models/Enquiry/enquiry.model");
const Address = require("../../models/User/address.model");
const User = require("../../models/User/user.model");
const { MESSAGES } = require("../../Config/responseConstants");
const Notification = require("../../models/Notifications/notification.model");

const leadToEnquiryStatusMap = {
  NEW: "REQUESTED",
  CONTACTED: "FOLLOW_UP_REQUIRED",
  FOLLOW_UP: "FOLLOW_UP_REQUIRED",
  CONVERTED: "QUOTE_ACCEPTED",
  LOST: "QUOTE_REJECTED",
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      pricing,
      specifications = {},
      images = [],
      brand,
      model,
      keyFeatures = [],
      sku
    } = req.body;
    let formattedDate = moment().format("DDMMYYYY");

    if (!name || !category || !pricing?.mrp || !pricing?.contractorPointPrice) {
      await safeDelete(images);
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (category === "AC") {
      await safeDelete(images);
      if (!specifications?.tonnage || specifications?.inverter === undefined) {
        return res.status(400).json({
          message: "AC specifications are incomplete",
        });
      }
    }

    // Auto pricing logic
    const customerPrice = pricing.discountedPrice || pricing.mrp;

    const countTotalProduct = await Product.countDocuments();
    const productId = `ACDOCPR${formattedDate}-${countTotalProduct + 1}`;

    // Clean Specifications Object (only allowed fields)
    const cleanSpecifications = {
      acType: specifications.acType,
      tonnage: specifications.tonnage,
      inverter: specifications.inverter,
      starRating: specifications.starRating,
      compressorType: specifications.compressorType,

      eer: specifications.eer,
      powerConsumption: specifications.powerConsumption,
      powerRequirement: specifications.powerRequirement,
      powerSupply: specifications.powerSupply,

      coolingCapacity: specifications.coolingCapacity,
      refrigerant: specifications.refrigerant,
      ambientTemperature: specifications.ambientTemperature,

      airFlowDirection: specifications.airFlowDirection,
      airFilterType: specifications.airFilterType,
      dustFilter: specifications.dustFilter,
      antiBacteria: specifications.antiBacteria,

      indoorUnitDimensions: specifications.indoorUnitDimensions,
      indoorUnitWeight: specifications.indoorUnitWeight,
      outdoorUnitWeight: specifications.outdoorUnitWeight,
      bodyMaterial: specifications.bodyMaterial,
      color: specifications.color,

      installationKit: specifications.installationKit,
      connectingPipeLength: specifications.connectingPipeLength,
      copperPipe: specifications.copperPipe,

      remoteControl: specifications.remoteControl,
      sleepMode: specifications.sleepMode,
      autoRestart: specifications.autoRestart,
      selfDiagnosis: specifications.selfDiagnosis,
      timer: specifications.timer,
      display: specifications.display,
      wifiConnectivity: specifications.wifiConnectivity,

      noiseLevel: specifications.noiseLevel,

      specialFeatures: specifications.specialFeatures || [],

      warranty: {
        product: specifications?.warranty?.product,
        compressor: specifications?.warranty?.compressor,
      },
    };

    //  Create Product
    const product = await Product.create({
      name,
      category,
      brand,
      model,
      keyFeatures,
      images,
      sku,
      productId,
      specifications: cleanSpecifications,
      pricing: {
        ...pricing,
        customerPrice,
      },
    });

    res.status(201).json({
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    await safeDelete(req.body.images);
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  let newImages = req.body.images;
  try {
    const { pricing, images, specifications, ...rest } = req.body;

    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      await safeDelete(newImages);
      return res.status(404).json({ message: "Product not found" });
    }

    let updatedPricing = existingProduct.pricing;

    if (pricing) {
      updatedPricing = {
        ...existingProduct.pricing.toObject(),
        ...pricing,
      };

      updatedPricing.customerPrice =
        updatedPricing.discountedPrice || updatedPricing.mrp;

      if (updatedPricing.discountedPrice && updatedPricing.mrp) {
        updatedPricing.discountedPercentage = Math.round(
          ((updatedPricing.mrp - updatedPricing.discountedPrice) /
            updatedPricing.mrp) *
            100,
        );
      }
    }

    let updatedSpecifications = existingProduct.specifications;

    if (specifications) {
      updatedSpecifications = {
        ...existingProduct.specifications.toObject(),
        ...specifications,
        warranty: {
          ...existingProduct.specifications?.warranty,
          ...specifications?.warranty,
        },
      };
    }

    let finalImages = existingProduct.images;

    if (images && images.length > 0) {
      finalImages = images;
    }
    const updatePayload = {
      ...rest,
      pricing: updatedPricing,
      specifications: updatedSpecifications,
      images: finalImages,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true },
    );

    if (images && images.length > 0) {
      await safeDelete(existingProduct.images);
    }

    res.json({
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    await safeDelete(newImages);
    res.status(500).json({ message: error.message });
  }
};

exports.productList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const minPrice = Number(req.query.minPrice) || 0;
    const maxPrice = Number(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;

    const skip = (page - 1) * limit;

    /* =========================
       MATCH CONDITIONS
    ========================= */
    const matchStage = {
      active: true,
      "pricing.customerPrice": {
        $gte: minPrice,
        $lte: maxPrice,
      },
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
      ];
    }

    if (req.query.category) {
      matchStage.category = req.query.category;
    }

    if (req.query.productIds) {
      const productIds = Array.isArray(req.query.productIds)
        ? req.query.productIds
        : req.query.productIds.split(",");

      matchStage._id = {
        $in: productIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (req.query.featured !== undefined) {
      matchStage.featured = req.query.featured === "true";
    }

    /* =========================
       AGGREGATION PIPELINE
    ========================= */
    const pipeline = [
      { $match: matchStage },

      {
        $project: {
          _id: 1,
          name: 1,
          brand: 1,
          model: 1,
          featured: 1,
          image: { $arrayElemAt: ["$images", 0] },

          // Specifications (NEW)
          acType: "$specifications.acType",
          tonnage: "$specifications.tonnage",
          inverter: "$specifications.inverter",
          starRating: "$specifications.starRating",
          compressorType: "$specifications.compressorType",
          powerRating: "$specifications.powerRating",
          refrigerant: "$specifications.refrigerant",
          noiseLevel: "$specifications.noiseLevel",

          //  Pricing
          mrp: "$pricing.mrp",
          customerPrice: "$pricing.customerPrice",
          discountedPercentage: "$pricing.discountedPercentage",

          //  Extra
          offerLabel: 1,
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const products = await Product.aggregate(pipeline);

    /* =========================
       COUNT FOR PAGINATION
    ========================= */
    const totalCount = await Product.countDocuments(matchStage);

    res.status(200).json({
      status: true,
      message: "Product list fetched successfully",
      data: products,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      active: true,
    }).select("-__v");

    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    /* =========================
       AGGREGATION PIPELINE
    ========================= */
    const pipeline = [
      {
        $match: {
          featured: true,
          active: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          brand: 1,
          model: 1,
          featured: 1,
          image: { $arrayElemAt: ["$images", 0] },

          // Specifications (NEW)
          acType: "$specifications.acType",
          tonnage: "$specifications.tonnage",
          inverter: "$specifications.inverter",
          starRating: "$specifications.starRating",
          compressorType: "$specifications.compressorType",
          powerRating: "$specifications.powerRating",
          refrigerant: "$specifications.refrigerant",
          noiseLevel: "$specifications.noiseLevel",

          //  Pricing
          mrp: "$pricing.mrp",
          customerPrice: "$pricing.customerPrice",
          discountedPercentage: "$pricing.discountedPercentage",

          //  Extra
          offerLabel: 1,
        },
      },
      {
        $sort: { createdAt: -1 }, // latest on top
      },
      { $skip: skip },
      { $limit: limit },
    ];

    if (req.query.productIds) {
      const productIds = Array.isArray(req.query.productIds)
        ? req.query.productIds
        : req.query.productIds.split(",");

      pipeline.unshift({
        $match: {
          _id: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      });
    }

    if (req.query.brands?.length) {
      const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const brands = Array.isArray(req.query.brands)
        ? req.query.brands
        : req.query.brands
          ? req.query.brands.split(",")
          : [];

      const regexBrands = brands.map(
        (b) => new RegExp(`^${escapeRegex(b.trim())}$`, "i"),
      );

      pipeline.unshift({
        $match: {
          brand: { $in: regexBrands },
        },
      });
    }

    const products = await Product.aggregate(pipeline);

    /* =========================
       TOTAL COUNT
    ========================= */
    const total = await Product.countDocuments({
      featured: true,
      active: true,
    });

    res.status(200).json({
      status: true,
      message: "Featured products fetched successfully",
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const { productIds, brands, featured } = req.query;

    const pipeline = [];

    /* =========================
       MATCH CONDITIONS
    ========================= */
    const matchStage = {
      active: true,
    };

    // dynamic featured filter
    if (featured !== undefined) {
      const value = featured.toLowerCase();

      if (value === "true" || value === "false") {
        matchStage.featured = value === "true";
      }
    }

    // filter by productIds
    if (productIds) {
      const ids = (
        Array.isArray(productIds) ? productIds : productIds.split(",")
      )
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (ids.length === 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid productIds",
        });
      }

      matchStage._id = { $in: ids };
    }

    // filter by brands
    if (brands) {
      const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const brandList = Array.isArray(brands) ? brands : brands.split(",");

      matchStage.brand = {
        $in: brandList.map(
          (b) => new RegExp(`^${escapeRegex(b.trim())}$`, "i"),
        ),
      };
    }

    if (req.query.category) {
      matchStage.category = req.query.category.trim();
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};

      if (req.query.minPrice) {
        priceFilter.$gte = Number(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        priceFilter.$lte = Number(req.query.maxPrice);
      }

      if (Object.keys(priceFilter).length) {
        matchStage["pricing.customerPrice"] = priceFilter;
      }
    }

    let sortQuery = { createdAt: -1 }; // default

    const sortFieldMap = {
      customerPrice: "pricing.customerPrice",
      mrp: "pricing.mrp",
      createdAt: "createdAt",
    };

    if (req.query.sort) {
      const isDesc = req.query.sort.startsWith("-");
      const rawField = isDesc ? req.query.sort.substring(1) : req.query.sort;

      const mappedField = sortFieldMap[rawField];

      if (mappedField) {
        sortQuery = { [mappedField]: isDesc ? -1 : 1 };
      }
    }

    pipeline.push({ $match: matchStage });

    /* =========================
               SORT
    ========================= */
    pipeline.push({ $sort: sortQuery });

    /* =========================
       CONDITIONAL PROJECTION
    ========================= */
    if (!productIds || productIds.length === 0) {
      pipeline.push({
        $project: {
          _id: 1,
          productId: 1,
          name: 1,
          brand: 1,
          model: 1,
          featured: 1,
          image: { $ifNull: [{ $arrayElemAt: ["$images", 0] }, null] },

          // Specifications
          acType: "$specifications.acType",
          tonnage: "$specifications.tonnage",
          inverter: "$specifications.inverter",
          starRating: "$specifications.starRating",
          compressorType: "$specifications.compressorType",
          refrigerant: "$specifications.refrigerant",
          noiseLevel: "$specifications.noiseLevel",

          // Pricing
          mrp: "$pricing.mrp",
          customerPrice: "$pricing.customerPrice",
          discountedPercentage: "$pricing.discountedPercentage",

          // Extra
          offerLabel: 1,
        },
      });
    }

    /* =========================
             PAGINATION
    ========================= */
    if (!productIds) {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    }

    const products = await Product.aggregate(pipeline);

    /* =========================
       TOTAL COUNT (MATCH SAME FILTER)
    ========================= */
    let total = 0;

    if (!productIds) {
      total = await Product.countDocuments(matchStage);
    }

    res.status(200).json({
      status: true,
      message: "Products fetched successfully",
      data: products,
      pagination: productIds
        ? null
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getFeaturedProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      featured: true,
      active: true,
    }).select("-stock -sku -pricing.contractorPointPrice");

    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Featured product not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Featured product details fetched successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.createInterestedLead = async (req, res) => {
  try {
    console.log("this is my /user/featured/product/interested");
    const userId = req.user._id; // from auth middleware
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product is required",
      });
    }

    const product = await Product.findById(productId).select(
      "pricing.customerPrice active",
    );

    if (!product || !product.active) {
      return res.status(404).json({
        message: "Product not available",
      });
    }

    // Generate Lead ID
    const formattedDate = moment().format("DDMMYYYY");
    const totalLeads = await PurchaseLead.countDocuments();
    const purchaseId = `ACDOCLEAD${formattedDate}-${totalLeads + 1}`;

    const enquiryCount = await Enquiry.countDocuments();
    const enquiryIdString = `ENQ${formattedDate}-${enquiryCount + 1}`;

    const address = await Address.findOne({ userId, isActive: 1 });

    const enquiry = await Enquiry.create({
      user_id: userId,
      enquiryId: enquiryIdString,
      type: "QUOTE_REQUEST",
      subType: "PURCHASE_LEAD",
      status: "REQUESTED",
      noOfAc: quantity,
      addressDetails: {
        house: address?.house || "",
        street: address?.street || "NA",
        city: address?.city || "NA",
        state: address?.state || "NA",
        zipcode: address?.zipcode || "000000",
        saveAs: address?.saveAs || "",
        landmark: address?.landmark || "",
      },
      details: {
        serviceDetails: [],
      },
    });

    const lead = await PurchaseLead.create({
      purchaseId,
      userId,
      productId,
      quantity,
      enquiryId: enquiry._id,
      unitPrice: product.pricing.customerPrice,
      status: "NEW",
      source: "APP",
    });

    const userToken = await User.findOne({ _id: userId }).select("deviceToken");

    const title = "📦 Purchase request recieved";
    const body = MESSAGES.PRODUCT_PURCHASE_NOTIFICATION;

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

    res.status(201).json({
      status: true,
      message: "Interest recorded successfully",
      data: {
        purchaseId: lead.purchaseId,
        status: lead.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.createPurchaseLead = async (req, res) => {
  try {
    const { userId, productId, quantity = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const product = await Product.findById(productId).select(
      "pricing.customerPrice",
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const formattedDate = moment().format("DDMMYYYY");
    const totalLeads = await PurchaseLead.countDocuments();

    const purchaseId = `ACDOCLEAD${formattedDate}-${totalLeads + 1}`;
    const address = await Address.findOne({ userId, isActive: 1 });

    const enquiry = await Enquiry.create({
      user_id: userId,
      enquiryId: enquiryIdString,
      type: "QUOTE_REQUEST",
      subType: "PURCHASE_LEAD",
      status: "REQUESTED",
      noOfAc: quantity,
      addressDetails: {
        house: address?.house || "",
        street: address?.street || "NA",
        city: address?.city || "NA",
        state: address?.state || "NA",
        zipcode: address?.zipcode || "000000",
        saveAs: address?.saveAs || "",
        landmark: address?.landmark || "",
      },
      details: {
        serviceDetails: [],
      },
    });

    const lead = await PurchaseLead.create({
      purchaseId,
      userId,
      productId,
      quantity,
      enquiryId: enquiry._id,
      unitPrice: product.pricing.customerPrice,
    });

    res.status(201).json({
      status: true,
      message: "Purchase lead created successfully",
      data: lead,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// function to update purchase lead
exports.updatePurchaseLead = async (req, res) => {
  try {
    const { purchaseLeadId } = req.params;
    const { status, quantity, soldAmount, remarks } = req.body;

    const lead = await PurchaseLead.findOne({ _id: purchaseLeadId });

    if (!lead) {
      return res.status(404).json({
        status: false,
        message: "Purchase lead id not found",
      });
    }

    // Update allowed fields only
    if (status) lead.status = status;
    if (quantity) lead.quantity = quantity;
    if (remarks) lead.remarks = remarks;

    // When deal is converted
    if (status === "CONVERTED") {
      if (!soldAmount) {
        return res.status(400).json({
          status: false,
          message: "Sold amount is required when lead is converted",
        });
      }

      lead.soldAmount = soldAmount;
      // lead.productSold = true;
    }

    await lead.save();

    if (status && lead.enquiryId) {
      const enquiryStatus = leadToEnquiryStatusMap[status];

      if (enquiryStatus) {
        await Enquiry.findByIdAndUpdate(lead.enquiryId, {
          status: enquiryStatus,
        });
      }
    }

    res.status(200).json({
      status: true,
      message: "Purchase lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.log("update purchase lead:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getPurchaseLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      source,
      minUnitPrice,
      maxUnitPrice,
      minSoldAmount,
      maxSoldAmount,
      followUpDate,
    } = req.query;

    const matchStage = {};

    // Status filter
    if (status) matchStage.status = status;

    // Source filter
    if (source) matchStage.source = source;

    // Unit price filter
    if (minUnitPrice || maxUnitPrice) {
      matchStage.unitPrice = {};
      if (minUnitPrice) matchStage.unitPrice.$gte = Number(minUnitPrice);
      if (maxUnitPrice) matchStage.unitPrice.$lte = Number(maxUnitPrice);
    }

    // Sold amount filter
    if (minSoldAmount || maxSoldAmount) {
      matchStage.soldAmount = {};
      if (minSoldAmount) matchStage.soldAmount.$gte = Number(minSoldAmount);
      if (maxSoldAmount) matchStage.soldAmount.$lte = Number(maxSoldAmount);
    }

    // Follow-up date filter (single day)
    if (followUpDate) {
      const start = new Date(followUpDate);
      const end = new Date(followUpDate);
      end.setHours(23, 59, 59, 999);

      matchStage.followUpDate = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchStage },

      // Join user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // Join product
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ];

    // Search by user name / phone
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "user.name": { $regex: search, $options: "i" } },
            { "user.phoneNumber": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Sort, paginate
    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                PurchaseLeadId: 1,
                status: 1,
                quantity: 1,
                unitPrice: 1,
                soldAmount: 1,
                source: 1,
                followUpDate: 1,
                createdAt: 1,

                user: {
                  name: "$user.name",
                  phoneNumber: "$user.phoneNumber",
                },

                product: {
                  name: "$product.name",
                  brand: "$product.brand",
                  model: "$product.model",
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    );

    const result = await PurchaseLead.aggregate(pipeline);

    const leads = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      status: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getPurchaseLeadById = async (req, res) => {
  try {
    const { purchaseLeadId } = req.params;

    if (!purchaseLeadId) {
      return res.status(400).json({
        status: false,
        message: "Purchase lead ID is required",
      });
    }

    const lead = await PurchaseLead.findById(purchaseLeadId)
      .populate({
        path: "userId",
        select: "name phoneNumber countryCode email",
      })
      .populate({
        path: "productId",
        select: "name brand pricing.customerPrice images",
      });

    if (!lead) {
      return res.status(404).json({
        status: false,
        message: "Purchase lead not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Purchase lead fetched successfully",
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
