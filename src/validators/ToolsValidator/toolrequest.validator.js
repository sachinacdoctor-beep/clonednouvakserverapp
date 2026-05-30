const Joi = require('joi');
// const ToolRequest = require('../../models/Tools/ToolRequest.model'); // Adjust the path as necessary

const toolRequestValidatorSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Name must be a string',
        'any.required': 'Name is required',
        'string.empty': 'Name cannot be empty'
    }),
    identifier: Joi.string().required().messages({
        'string.base': 'Identifier must be a valid Tool/ Toolbag ID string',
        'any.required': 'A valid Tool/ Toolbag ID string is required',
        'string.empty': 'Identifier cannot be empty'
    }),
    technicianId: Joi.string().required().messages({
        'string.base': 'Technician ID must be a string',
        'any.required': 'Technician ID is required',
        'string.empty': 'Technician ID cannot be empty'
    }),
    quantity: Joi.number().required().messages({
        'any.required': 'Quantity is required',
        'number.base': 'Quantity must be a number'
    }),
    status: Joi.string().valid('REQUESTED', 'ASSIGNED', 'APPROVED', 'DENIED').default('REQUESTED').required().messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of REQUESTED, ASSIGNED, DENIED, UNASSIGNED'
    }),
    type: Joi.string().valid('TOOL', 'TOOL_BAG').default('TOOL').required().messages({
        'string.base': 'Type must be a string',
        'any.required': 'Type is required',
        'any.only': 'Type must be either TOOL or TOOL_BAG'
    }),
    reason: Joi.string().valid('BROKEN', 'LOST', 'OTHER', 'NEW_ASSIGNMENT').default('OTHER').required().messages({
        'string.base': 'Reason must be a string',
        'any.required': 'Reason is required',
        'any.only': 'Reason must be one of BROKEN, LOST, OTHER, NEW_ASSIGNMENT'
    }),
    description: Joi.string().allow('').default('').messages({
        'string.base': 'Description must be a string'
    }),
    comment: Joi.string().optional().allow('').default('').messages({
        'string.base': 'Comment must be a string'
    })
});  

const toolRequestValidator = (data, req,res,next) => {
    const { error } = toolRequestValidatorSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ errors: error.details.map(detail => detail.message) });
    }
    next();
};

module.exports = toolRequestValidator;