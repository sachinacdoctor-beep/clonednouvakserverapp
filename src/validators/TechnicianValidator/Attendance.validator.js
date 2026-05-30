const Joi = require('joi');

const attendanceValidationSchema = Joi.object({
    date: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .required()
    .messages({
      "string.base": "date must be a string.",
      "string.pattern.base": "Invalid date format. Use DD-MM-YYYY",
      "any.required": "date is required."
    }),
    type: Joi.string()
        .valid('PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY',"CHECK_OUT")
        .required()
        .messages({
            'string.base': 'type must be a string.',
            'any.only': 'type must be one of ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"].',
            'any.required': 'type is required.'
        }),
    description: Joi.string()
        .allow('')
        .max(200)
        .optional()
        .messages({
            'string.base': 'description must be a string.',
            'string.max': 'description must be less than or equal to 200 characters.'
        })
});

const attendanceValidator = (req, res, next) => {
    const { error } = attendanceValidationSchema.validate(req.body, { abortEarly: true });
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};

module.exports = { attendanceValidator };
