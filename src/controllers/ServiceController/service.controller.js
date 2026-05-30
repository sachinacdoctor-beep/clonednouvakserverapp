const { Types } = require('mongoose');
const Service = require('../../models/Service/service.model');
const { CODES, MESSAGES, STATUS } = require('../../Config/responseConstants');
const { safeDelete } = require('../../Utils/s3');
const JWT_SECRET = 'Admin@1234';  // Keep this secure and hidden (use process.env.JWT_SECRET in real projects)


exports.createService = async (req, res) => {
    try {
        const { name, description, terms, category, banner_images, icon, key } = req.body;

        const existingService = await Service.findOne({ name, category });

        if (existingService) {
            await safeDelete(banner_images)
            return res.status(409).json({
                status: STATUS.FAIL,
                message: `Service with the name '${name}' already exists in the '${category}' category.`,
            });
        }

        // Create a new service
        const newService = new Service({
            name,
            icon: icon,
            description: description || [],
            terms: terms || [],
            banner_images: banner_images,
            category,
            key: key
        });

        await newService.save();

        return res.status(CODES.CREATED).json({
            status: STATUS.SUCCESS,
            message: MESSAGES.SERVICE_CREATED,
        });

    } catch (error) {
        await safeDelete(banner_images)
        return res.status(CODES.SERVER_ERROR).json({
            status: STATUS.FAIL,
            message: MESSAGES.SERVER_ERROR,
            error: error.message,
        });
    }
};


exports.editService = async (req, res) => {
    // try {
    const { serviceId } = req.params;
    const { name, description, terms, banner_images, icon, category, key } = req.body;

    if (banner_images && !Array.isArray(banner_images)) {
        return res.status(200).json({
            status: STATUS.FAIL,
            message: 'banner_images must be an array of objects.'
        });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
        await safeDelete(banner_images)
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.NOT_FOUND
        });
    }

    const existingService = await Service.findOne({
        _id: { $ne: serviceId },
        name: name,
        category: category,
    });

    let oldBannerImages = existingService.banner_images

    if (existingService) {
        await safeDelete(banner_images)
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: `Another service with the name '${name}' already exists in the '${category}' category.`,
        });
    }

    const updateService = await Service.findByIdAndUpdate(
        serviceId,
        {
            name,
            description: description,
            terms: terms,
            key: key,
            icon: icon || service?.icon,
            banner_images: banner_images || service?.banner_images,
            category
        },
        { new: true }
    );

    if(banner_images){
        await safeDelete(oldBannerImages)
    }

    return res.status(CODES.CREATED).json({
        status: STATUS.SUCCESS,
        message: MESSAGES.SERVICE_UPDATE,
        data: updateService,
    });

};
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.singleServiceGetById = async (req, res) => {
    const { serviceId } = req.params;

    if (!serviceId || serviceId == '' || serviceId == null) {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.SERVICE_ID_REQUIRED
        });
    }
    const service = await Service.findById(serviceId);

    // console.log("ddddddddddd");

    if (service) {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.SUCCESS,
            data: service
        });
    } else {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.NOT_FOUND
        });
    }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.serviceActiveInactive = async (req, res) => {
    const { serviceId } = req.params;

    if (!serviceId || serviceId == '' || serviceId == null) {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.SERVICE_ID_REQUIRED
        });
    }
    const service = await Service.findById(serviceId);


    if (service) {

        if (service.isActive == 1) {

            await Service.findOneAndUpdate(
                { _id: new Types.ObjectId(serviceId) },
                {
                    isActive: 0
                });
            return res.status(CODES.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: MESSAGES.SERVICE_DEACTIVATE
            });
        } else {
            await Service.findOneAndUpdate(
                { _id: new Types.ObjectId(serviceId) },
                {
                    isActive: 1
                });
            return res.status(CODES.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: MESSAGES.SERVICE_ACTIVATE
            });
        }
    } else {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.NOT_FOUND
        });
    }
};

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.serviceList = async (req, res) => {


    // await Service.updateOne({ _id: element._id }, { orderBy: 0 })
    console.log("serviceList called");
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;

    const offset = (page - 1) * limit;

    const services = await Service.find({
        $or: [{ name: { $regex: search, $options: 'i' } }]
    })
        .select('-terms -description')
        .sort({ [sortField]: sortOrder })
        .skip(offset)
        .limit(limit);



    const totalServices = await Service.countDocuments({
        $or: [{ name: { $regex: search, $options: 'i' } }]
    });

    if (services.length > 0) {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.SUCCESS,
            data: services,
            count: totalServices,
            pagination: {
                totalServices,
                page,
                limit,
                totalPages: Math.ceil(totalServices / limit)
            }
        });
    } else {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.NOT_FOUND, data: [],
            count: 0,
        });
    }
};


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.mobileServiceList = async (req, res) => {

    console.log("mobileServiceList called");
    const service = await Service.find({ isActive: 1 })
        .sort({ orderBy: 1 })
        .lean();
    for (const element of service) {
        // console.log(req.protocol);
        // console.log(req.get('host'));

        if (element.key === 'STERILIZATION') {
            const images = {
                icon: `http://137.59.53.70:8080/public/sterlization.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images
        }
        else if (element.name === 'REPAIR') {
            const images = {
                icon: `http://137.59.53.70:8080/public/repair.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images

        } else if (element.name === 'INSTALLATION') {
            const images = {
                icon: `http://137.59.53.70:8080/public/installation.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images

        } else if (element.name === 'COMPRESSOR') {
            const images = {
                icon: `http://137.59.53.70:8080/public/compressor.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images

        } else if (element.name === 'GAS_CHARGING') {
            const images = {
                icon: `http://137.59.53.70:8080/public/gasscharging.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images

        } else if (element.name === 'COPPER_PIPING') {
            const images = {
                icon: `http://137.59.53.70:8080/public/Cpiping.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images

        } else {
            const images = {
                icon: `http://137.59.53.70:8080/public/AMC.png`,
                banner1: `http://137.59.53.70:8080/public/banner1.png`,
                banner2: `http://137.59.53.70:8080/public/banner2.png`,
            }
            element.images = images
        }
    }
    if (service.length > 0) {

        return res.status(CODES.SUCCESS).json({
            status: STATUS.SUCCESS,
            data: service
        });
    } else {
        return res.status(CODES.SUCCESS).json({
            status: STATUS.FAIL,
            message: MESSAGES.NOT_FOUND
        });
    }
};

