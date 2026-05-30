const Joi = require('joi');

// Define the Joi schema for admin login
const adminLoginSchema = Joi.object({
    email: Joi.string()
        .email()  // Ensure the email is in a valid format
        .required()
        .messages({
            'any.required': 'Email is required',
            'string.empty': 'Email cannot be empty',
            'string.email': 'Please provide a valid email address'
        }),
    password: Joi.string()
        .min(6)  // Ensure password is at least 6 characters
        .required()
        .messages({
            'any.required': 'Password is required',
            'string.empty': 'Password cannot be empty',
            'string.min': 'Password must be at least 6 characters long'
        })
});

// Middleware function to validate login request
const loginValidate = (req, res, next) => {
    const { error } = adminLoginSchema.validate(req.body);  // Validate request body against the schema
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });  // Send validation error message
    }
    next();  // If no errors, move to the next middleware or controller function
};

module.exports = { loginValidate };
