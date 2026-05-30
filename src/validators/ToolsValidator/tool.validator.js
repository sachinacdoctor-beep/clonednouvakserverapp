const Joi = require('joi');

// Define the ToolValidationSchema
const createToolValidationSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.base': '"name" should be a type of text',
        'string.empty': '"name" cannot be an empty field',
        'any.required': '"name" is a required field',
    }),
    description: Joi.string().required().messages({
        'string.base': '"description" should be a type of text',
        'string.empty': '"description" cannot be an empty field',
        'any.required': '"description" is a required field',
    }),
    image: Joi.string().optional().allow('').messages({
        'string.base': '"image" should be a type of text',
    })
});

const createToolValidationSchemaValidator = (req, res, next) => {
    const { error } = createToolValidationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};


module.exports = {
    createToolValidationSchemaValidator
};