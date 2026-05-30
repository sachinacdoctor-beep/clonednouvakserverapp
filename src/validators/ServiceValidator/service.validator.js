const Joi = require('joi');


const createServiceSchema = Joi.object({
    name: Joi.string().required()
        .messages({
            'string.base': 'Name must be a string.',
            'string.empty': 'Name cannot be empty.',
            'any.required': 'Name is required.'
        }),
    // banner_image_one: Joi.string().required()
    //     .messages({
    //         'string.base': 'Banner image must be a string.',
    //         'string.empty': 'Banner image cannot be empty.',
    //         'any.required': 'Banner image is required.'
    //     }),
    // banner_image_two: Joi.string().required()
    //     .messages({
    //         'string.base': 'Banner image must be a string.',
    //         'string.empty': 'Banner image cannot be empty.',
    //         'any.required': 'Banner image is required.'
    //     }),
    // icon: Joi.string().required()
    //     .messages({
    //         'string.base': 'Icon must be a string.',
    //         'string.empty': 'Icon cannot be empty.',
    //         'any.required': 'Icon is required.'
    //     }),

    // description: Joi.string().required()
    //     .messages({
    //         'string.base': 'Description must be a string.',
    //         'string.empty': 'Description cannot be empty.',
    //         'any.required': 'Description is required.'
    //     }),

    terms: Joi.string().required()
        .messages({
            'string.base': 'Service terms must be a string.',
            'string.empty': 'Service terms cannot be empty.',
            'any.required': 'Service terms is required.'
        }),

    category: Joi.string().required()
        .messages({
            'string.base': 'Category must be a string.',
            'string.empty': 'Category cannot be empty.',
            'any.required': 'Category is required.'
        }),
});

const createValidateService = (req, res, next) => {
    const { error } = createServiceSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};

module.exports = { createValidateService };