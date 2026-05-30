const Joi = require('joi');

const kycValidationSchema = Joi.object({
    type: Joi
            .string()
            .valid("PAN", "AADHAR_FRONT", "AADHAR_BACK", "DRIVING_LICENSE", "VOTER_ID", "PASSPORT")
            .required()
            .messages({
                'string.base': 'KYC document type must be a string.',
                'any.only': 'KYC document type must be one of ["PAN", "AADHAR_FRONT", "AADHAR_BACK", "DRIVING_LICENSE", "VOTER_ID", "PASSPORT"].',
                'any.required': 'KYC document type is required.'
            }),
    comment: Joi.string().allow("").optional().default(""),
    docUrl: Joi
        .string()
        .uri()
        .required()
        .messages({
            'string.base': 'KYC document URL must be a string.',
            'string.empty': 'KYC document URL cannot be empty.',
            'string.uri': 'KYC document URL must be a valid URI.',
            'any.required': 'KYC document URL is required.'
        }),
});

const kycValidator = (req, res, next) => {
    const { error } = kycValidationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};

module.exports = { kycValidator };
