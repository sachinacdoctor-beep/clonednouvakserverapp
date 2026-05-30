const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);  // Extending Joi with objectId support

const mongoose = require('mongoose');

const userLoginSchema = Joi.object({
    phoneNumber: Joi.string()
        .pattern(/^\d{10}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone number must be a 10-digit numeric value',
            'string.empty': 'Phone number is required'
        }),
    countryCode: Joi.string()
        .required()
        .messages({
            'string.empty': 'Country code is required'
        }),
    deviceToken: Joi.string().optional().allow("").messages({
        'string.base': 'Device Token must be a string',
    }),
});


const loginUser = (req, res, next) => {
    const { error } = userLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }
    next();
};

const userVerifyOTPSchema = Joi.object({
    userId: Joi.objectId().required().messages({
        'any.required': 'User ID is required',
        'string.pattern.name': 'Please provide a valid MongoDB ObjectId'
    }),
    otp: Joi.number().min(4).required().messages({
        'any.required': 'OTP is required',
        'number.base': 'OTP must be a number',
        'number.min': 'OTP must be at least 3 digits long'
    })
});

const verifyOTPUser = (req, res, next) => {
    const { error } = userVerifyOTPSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }
    next();
};


const userResendOTPSchema = Joi.object({
    phoneNumber: Joi.string().required().messages({
        'string.phoneNumber': 'Please provide a valid phoneNumber',
        'string.empty': 'Phone number is required'
    }),
    countryCode: Joi.string().required().messages({
        'string.empty': 'Country code is required'
    })
});

const resendOTPUser = (req, res, next) => {
    const { error } = userResendOTPSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }
    next();
};

const userProfileSchema = Joi.object({
  userName: Joi.string().required().messages({
    "string.base": "User name must be a string.",
    "string.empty": "User name cannot be empty.",
    "any.required": "User name is required.",
  }),
  userId: Joi.string().required().messages({
    "string.base": "User ID must be a string.",
    "string.empty": "User ID cannot be empty.",
    "any.required": "User ID is required.",
  }),
  email: Joi.string().email().optional().allow("", null).messages({
    "string.email": "Email must be a valid email address.",
  }),

  gender: Joi.string().optional().allow(null).messages({
    "string.base": "Gender must be a string.",
  }),

  profilePhotoUrl: Joi.string().uri().optional().allow("", null).messages({
    "string.uri": "Profile photo must be a valid URL.",
  }),
});

const profileUpdate = (req, res, next) => {
    const { error } = userProfileSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }
    next();
};


const addressSchema = Joi.object({
    userId: Joi.string().required().label('User ID'),
    house: Joi.string().required().label('House'),
    street: Joi.string().required().label('Street'),
    state: Joi.string().required().label('State'),
    city: Joi.string().required().label('City'),
    zipcode: Joi.string()
        .pattern(/^\d{5}$/)
        .required()
        .label('Zipcode')
        .messages({
            'string.pattern.base': 'Zipcode must be a 5-digit number',
        }),
});

const addressValidation = (req, res, next) => {
    const { error } = addressSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }
    next();
};

module.exports = { addressValidation, loginUser, verifyOTPUser, resendOTPUser, profileUpdate }
