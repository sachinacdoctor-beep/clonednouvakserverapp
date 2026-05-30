const Joi = require('joi');

const adminUserCreationSchema = Joi.object({
    phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            'string.base': 'Phone number must be 10 digits long.',
            'string.empty': 'Phone number must be 10 digits long.',
            'string.pattern.base': 'Phone number must be 10 digits long',
            'any.required': 'Phone number is required',
        }),
    userName: Joi.string().min(1) 
        .required()
        .messages({
            'string.base': 'User name is required.',
            'string.empty': 'User name is required.',            
            'any.required': 'User name is required',
        }),
    userId: Joi.string()
        .optional()
        .allow(''),
    type: Joi.string()
        .valid('RETAIL', 'HNI', 'SME', 'LARGE_SCALE', 'OEM')
        .optional(),
    countryCode: Joi.string()
        .pattern(/^\+[0-9]{1,4}$/)
        .required()
        .messages({
            'string.base': 'Country code is required',
            'string.empty': 'Country code is required',             
            'string.pattern.base': 'Country code must start with a "+" followed by 1 to 4 digits',
            'any.required': 'Country code is required',
        }),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .optional()
        .messages({
            'string.email': 'Email must be a valid email address',
        })
});

const createEditValidateUser = (req, res, next) => {
    const { error } = adminUserCreationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};



module.exports = createEditValidateUser
// module.exports = {adminUserCreationSchema, userQuerySchema}
// const userQuerySchema = Joi.object({
//     limit: Joi.number()
//         .integer()
//         .min(1)
//         .max(100)
//         .default(10)
//         .messages({
//             'number.base': 'Limit must be a number',
//             'number.integer': 'Limit must be an integer',
//             'number.min': 'Limit must be at least 1',
//             'number.max': 'Limit cannot exceed 100',
//         }),

//     offset: Joi.number()
//         .integer()
//         .min(1)
//         .default(1)
//         .messages({
//             'number.base': 'Offset must be a number',
//             'number.integer': 'Offset must be an integer',
//             'number.min': 'Offset must be at least 1',
//         }),

//     search: Joi.string()
//         .allow('', null) // Allows search to be an optional field
//         .optional()
//         .messages({
//             'string.base': 'Search must be a string',
//         }),

//     sortField: Joi.string()
//         .valid('name', 'phoneNumber', 'email', 'createdAt') // Add valid fields based on your model
//         .default('name')
//         .messages({
//             'any.only': 'Sort field must be one of: name, phoneNumber, email, createdAt',
//             'string.base': 'Sort field must be a string',
//         }),

//     sortOrder: Joi.string()
//         .valid('ASC', 'desc')
//         .default('ASC')
//         .messages({
//             'any.only': 'Sort order must be either ASC or desc',
//             'string.base': 'Sort order must be a string',
//         }),
// });

