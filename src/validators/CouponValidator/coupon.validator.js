const Joi = require('joi');

// Joi validation schema for coupon data
const couponSchema = Joi.object({
    couponObjectid: Joi.string().optional().allow("").messages({
        'string.base': 'Coupon Object ID must be a string',
    }), 
    couponCode: Joi.string().trim().required().messages({
        'string.empty': 'Coupon code is required',
        'any.required': 'Coupon code is required',
    }),
    image: Joi.string().uri().optional().allow('').messages({
        'string.uri': 'Image must be a valid URI',
    }),
    name: Joi.string().trim().required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required',
    }),
    discount: Joi.number().min(1).required().messages({
        'number.base': 'Discount must be a number',
        'number.min': 'Discount must be at least 1%',
        'any.required': 'Discount is required',
    }),
    minValue: Joi.number().min(0).required().messages({
        'number.base': 'Minimum value must be a number',
        'number.min': 'Minimum value must be at least 0',
        'any.required': 'Minimum value is required',
    }),
    expiryDate: Joi.date().required().greater('now').messages({
        'date.base': 'Expiry time must be a valid date',
        'date.greater': 'Expiry time must be in the future',
        'any.required': 'Expiry time is required',
    }),
    description: Joi.array().items(Joi.string().trim()).required().messages({
        'array.base': 'Description must be an array of strings',
        'string.empty': 'Each description item must be a non-empty string',
        'any.required': 'Description is required',
    }),
    // type: Joi.string().valid('percentage', 'flat').required().messages({
    //     'string.empty': 'Type is required',
    //     'any.only': 'Type must be one of [percentage, flat]',
    //     'any.required': 'Type is required',
    // }),
    // isActive: Joi.boolean().optional().default(true).messages({
    //     'boolean.base': 'IsActive must be a boolean',
    // }),
});

// Middleware for validation
const addEditCouponValidation = (req, res, next) => {
    const { error } = couponSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return res.status(400).json({ status: false, message: errorMessage });
    }
    next();
};

module.exports = { addEditCouponValidation };
