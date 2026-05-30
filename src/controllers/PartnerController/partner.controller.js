const Partner = require('../../models/Partners/partner.model');
const { Types } = require('mongoose');


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.addEditPartner = async (req, res) => {
    try {
        const { name, partnerId, partnerLogo } = req.body;

        // Basic validation to check if required fields are provided
        if (!name || !partnerLogo) {
            return res.status(400).json({
                status: false,
                message: "Name and PartnerLogo are required"
            });
        }

        if (!partnerId) {
            // Create new partner if no partnerId is provided
            const existingPartner = await Partner.findOne({ name });

            if (existingPartner) {
                return res.status(400).json({
                    status: false,
                    message: "Partner with this name already exists"
                });
            }

            const newPartner = await Partner.create({
                name,
                logo: partnerLogo
            });

            return res.status(201).json({
                status: true,
                message: "Partner added successfully",
            });

        } else {
            // Update existing partner
            const existingPartner = await Partner.findById(partnerId);

            if (!existingPartner) {
                return res.status(200).json({
                    status: false,
                    message: "Partner not found"
                });
            }

            const updatePartner = await Partner.updateOne(
                { _id: partnerId },
                {
                    name,
                    logo: partnerLogo || existingPartner.logo
                }
            );

            return res.status(200).json({
                status: true,
                message: "Partner updated successfully",
            });
        }
    } catch (error) {
        console.error("Error adding/updating partner:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.partnerList = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const page = parseInt(req.query.page, 10) || 1;
        const search = req.query.search || '';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        const offset = (page - 1) * limit;

        const partners = await Partner.find({
            name: { $regex: search, $options: 'i' }
        })
            .skip(offset)
            .limit(limit)
            .sort({ name: sortOrder });

        const totalPartners = await Partner.countDocuments({
            name: { $regex: search, $options: 'i' }
        });

        if (partners.length > 0) {
            return res.status(200).json({
                status: true,
                data: partners,
                count: totalPartners,
                pagination: {
                    totalPartners,
                    page,
                    limit,
                    totalPages: Math.ceil(totalPartners / limit)
                }
            });
        } else {
            return res.status(200).json({
                status: false,
                message: 'No data found',
                data: [],
                count: 0,
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.partnerGetById = async (req, res) => {

    const { partnerId } = req.params;

    const partner = await Partner.findOne({ _id: partnerId })

    if (partner) {
        return res.status(200).json({
            status: true,
            data: partner
        });
    } else {
        return res.status(400).json({
            status: false,
            message: 'No data found'
        });
    }
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.mobilePartnerList = async (req, res) => {

    const partner = await Partner.find({ isActive: 1 })

    return res.send({
        status: true,
        data: partner
    })
}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

exports.partnerActiveInactive = async (req, res) => {

    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (partner) {

        if (partner.isActive == 1) {

            await Partner.updateOne(
                { _id: new Types.ObjectId(partnerId) },
                {
                    isActive: 0
                });
            return res.status(200).json({
                status: true,
                message: 'Partner De-activated'
            });
        } else {
            await Partner.findOneAndUpdate(
                { _id: new Types.ObjectId(partnerId) },
                {
                    isActive: 1
                });
            return res.status(200).json({
                status: true,
                message: 'Partner activated'
            });
        }
    } else {
        return res.status(200).json({
            status: false,
            message: 'Partner not found'
        });
    }
}