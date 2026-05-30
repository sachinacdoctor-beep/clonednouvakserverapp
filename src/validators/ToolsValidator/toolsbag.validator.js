const Joi = require('joi');

// Define the validation schema for the Toolbag model
const createToolBagSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.base': '"name" should be a type of text',
        'string.empty': '"name" cannot be an empty field',
        'any.required': '"name" is a required field',
    }),
    description: Joi.string().optional().allow(null, '').messages({
        'string.base': '"description" should be a type of text',
    }),
    tools: Joi.array().items(
        Joi.object({
            toolId: Joi.string().required().messages({
                'string.base': '"toolId" should be a type of text',
                'string.empty': '"toolId" cannot be an empty field',
                'any.required': '"toolId" is a required field',
            }),
            name: Joi.string().required().messages({
                'string.base': '"name" should be a type of text',
                'string.empty': '"name" cannot be an empty field',
                'any.required': '"name" is a required field',
            }),
            quantity: Joi.number().required().messages({
                'number.base': '"quantity" should be a type of number',
                'any.required': '"quantity" is a required field',
            }),
            description: Joi.string().optional().allow(null, '').messages({
                'string.base': '"description" should be a type of text',
            }),
        })
    ).required().messages({
        'array.base': '"tools" should be an array of objects',
        'any.required': '"tools" is a required field',
    }),
    image: Joi.string().optional().default('').messages({
        'string.base': '"image" should be a type of text',
    }),
});

const createToolBagSchemaValidator = (req, res, next) => {
    const { error } = createToolBagSchema.validate(req.body);
    console.log('error', error);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};

module.exports = {
    createToolBagSchemaValidator,
};