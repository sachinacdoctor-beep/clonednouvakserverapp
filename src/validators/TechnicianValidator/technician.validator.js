const Joi = require("joi");

const createTechnicianSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name cannot be empty.",
    "any.required": "Name is required.",
  }),
  type: Joi.string().valid("ACD", "FC").required(),
  countryCode: Joi.string()
    .pattern(/^\+?\d{2,3}$/)
    .required()
    .messages({
      "string.base": "CountryCode must be a string.",
      "string.empty": "CountryCode cannot be empty.",
      "string.pattern.base": "CountryCode must be a number with 2 or 3 digits.",
      "any.required": "CountryCode is required.",
    }),
  phoneNumber: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.base": "Phone number must be a string.",
      "string.empty": "Phone number cannot be empty.",
      "string.length": "Phone number must be exactly 10 digits long.",
      "string.pattern.base": "Phone number must only contain digits.",
      "any.required": "Phone number is required.",
    }),
  joiningDate: Joi.date().optional().messages({
    "date.base": "Joining date must be a valid date.",
  }),
  id: Joi.string().optional().allow("").messages({
    "string.base": "Id must be a valid Object Id.",
  }),
  profilePhoto: Joi.string().optional().allow("").messages({
    "string.base": "profilePhoto must be a valid URL.",
  }),
  position: Joi.string()
    .valid("HELPER", "TECHNICIAN", "SENIOR TECHNICIAN", "SUPERVISOR", "MANAGER")
    .default("HELPER")
    .optional(),
  experience: Joi.string().optional().allow(""),
  status: Joi.string()
    .valid(
      "KYC_PENDING",
      "ON_JOB",
      "AVAILABLE",
      "ON_LEAVE",
      "ON_BREAK",
      "ON_TRAINING",
      "DISABLED",
      "TERMINATED",
      "RESIGNED",
    )
    .optional()
    .messages({
      "string.base": "Status must be a string.",
      "any.only":
        'Status must be either "ON_JOB", "AVAILABLE", "ON_LEAVE", "ON_BREAK" or "ON_TRAINING".',
      "any.required": "Status is required.",
    }),
  secondaryContactNumber: Joi.string()
    .optional()
    .length(10)
    .pattern(/^[0-9]+$/),
  email: Joi.string().optional().email().messages({
    "string.base": "Email must be a string.",
    "string.email": "Email must be a valid email.",
  }),
  professionalSkills: Joi.array()
    .items(
      Joi.object({
        acType: Joi.string().required().messages({
          "string.base": "AC Type must be a string.",
          "string.empty": "AC Type cannot be empty.",
          "any.required": "AC Type is required.",
        }),
        service: Joi.boolean().optional(),
        repair: Joi.boolean().optional(),
        install: Joi.boolean().optional(),
      }),
    )
    .optional(),
  dob: Joi.date().optional().messages({
    "date.base": "Date of birth must be a valid date.",
  }),
  technicianId: Joi.string().optional(),
  kycStatus: Joi.string().optional(),
  gender: Joi.string()
    .optional()
    .valid("MALE", "FEMALE", "OTHER")
    .allow("", null)
    .messages({
      "string.base": "Gender must be a string.",
      "any.only": 'Status must be either "male", "female", "other"',
    }),
  // Address fields
  street: Joi.string().optional().allow("", null).messages({
    "string.base": "Street must be a string.",
  }),
  city: Joi.string().optional().allow("", null).messages({
    "string.base": "City must be a string.",
  }),
  state: Joi.string().optional().allow("", null).messages({
    "string.base": "State must be a string.",
  }),
  zipcode: Joi.string()
    .optional()
    .allow("", null)
    .pattern(/^[0-9]{5,6}$/)
    .messages({
      "string.base": "Zipcode must be a string.",
      "string.pattern.base": "Zipcode must be 5-6 digits.",
    }),
  house: Joi.string().optional().allow("", null).messages({
    "string.base": "House must be a string.",
  }),
  landmark: Joi.string().optional().allow("", null).messages({
    "string.base": "Landmark must be a string.",
  }),
});

const createValidateTechnician = (req, res, next) => {
  const { error } = createTechnicianSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: false,
      message: error.details[0].message,
    });
  }
  next();
};

const createTechnicianProfileSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name cannot be empty.",
    "any.required": "Name is required.",
  }),
  secondaryContactNumber: Joi.string()
    .optional()
    .length(10)
    .pattern(/^[0-9]+$/).allow("", null),
  email: Joi.string().optional().email().allow("", null).messages({
    "string.base": "Email must be a string.",
    "string.email": "Email must be a valid email.",
  }),
  dob: Joi.date().required().messages({
    "date.base": "Date of birth must be a valid date.",
  }),
  profilePhoto: Joi.string().optional().allow("").messages({
    "string.base": "profilePhoto must be a valid URL.",
  }),
  gender: Joi.string()
    .optional()
    .valid("MALE", "FEMALE", "OTHER")
    .allow("", null)
    .messages({
      "string.base": "Gender must be a string.",
      "any.only": 'Status must be either "male", "female", "other"',
    }),
  // Address fields
  street: Joi.string().optional().allow("", null).messages({
    "string.base": "Street must be a string.",
  }),
  city: Joi.string().optional().allow("", null).messages({
    "string.base": "City must be a string.",
  }),
  state: Joi.string().optional().allow("", null).messages({
    "string.base": "State must be a string.",
  }),
  zipcode: Joi.string()
    .optional()
    .allow("", null)
    .pattern(/^[0-9]{5,6}$/)
    .messages({
      "string.base": "Zipcode must be a string.",
      "string.pattern.base": "Zipcode must be 5-6 digits.",
    }),
  house: Joi.string().optional().allow("", null).messages({
    "string.base": "House must be a string.",
  }),
  landmark: Joi.string().optional().allow("", null).messages({
    "string.base": "Landmark must be a string.",
  }),
});

const createValidateTechnicianProfile = (req, res, next) => {
  const { error } = createTechnicianProfileSchema.validate(req.body);
  if (error) {
    console.log(error);
    return res.status(400).json({
      status: false,
      message: error.details[0].message,
    });
  }
  next();
};

const technicianLoginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a 10-digit numeric value",
      "string.empty": "Phone number is required",
    }),
  countryCode: Joi.string().required().messages({
    "string.empty": "Country code is required",
  }),
  type: Joi.string().optional().allow(null).messages({
    "string.base": "Type must be a string.",
  }),
  deviceToken: Joi.string().optional().allow(null).messages({
    "string.base": "Type must be a string.",
  }),
});

const technicianLoginVerifySchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a 10-digit numeric value',
      'string.empty': 'Phone number is required'
    }),
  otp: Joi.string()
    .required()
    .length(4)
    .messages({
      'string.empty': 'Country code is required'
    }),
});


const validateTechnicianLogin = (req, res, next) => {
  const { error } = technicianLoginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: false, message: error.details[0].message });
  }
  next();
};

const validateTechnicianLoginVerifyPayload = (req, res, next) => {
  const { error } = technicianLoginVerifySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: false, message: error.details[0].message });
  }
  next();
};

const updateTechnicianSchema = Joi.object({
  name: Joi.string().optional().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name cannot be empty.",
  }),
  secondaryContactNumber: Joi.string()
    .optional()
    .length(10)
    .pattern(/^[0-9]+$/),
  email: Joi.string().optional().email().messages({
    "string.base": "Email must be a string.",
    "string.email": "Email must be a valid email.",
  }),
  dob: Joi.date().required().messages({
    "date.base": "Date of birth must be a valid date.",
  }),
  gender: Joi.string().optional()
    .valid(
      "MALE",
      "FEMALE",
      "OTHER"
    ).messages({
      "string.base": "Gender must be a string.",
      "any.only":
        'Status must be either "male", "female", "other"',
    }),
  profilePhoto: Joi.string().optional().allow("").messages({
    "string.base": "profilePhoto must be a valid URL.",
  }),
  street: Joi.string().optional().allow("", null).messages({
    "string.base": "Street must be a string.",
  }),
  city: Joi.string().optional().allow("", null).messages({
    "string.base": "City must be a string.",
  }),
  state: Joi.string().optional().allow("", null).messages({
    "string.base": "State must be a string.",
  }),
  zipcode: Joi.string()
    .optional()
    .allow("", null)
    .pattern(/^[0-9]{5,6}$/)
    .messages({
      "string.base": "Zipcode must be a string.",
      "string.pattern.base": "Zipcode must be 5-6 digits.",
    }),
  house: Joi.string().optional().allow("", null).messages({
    "string.base": "House must be a string.",
  }),
  landmark: Joi.string().optional().allow("", null).messages({
    "string.base": "Landmark must be a string.",
  }),
});

const updateValidateTechnician = (req, res, next) => {
  const { error } = updateTechnicianSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: false,
      message: error.details[0].message,
    });
  }
  next();
}

const createTechnicianAddressSchema = Joi.object({
  street: Joi.string().required().messages({
    "string.base": "Street must be a string.",
    "string.empty": "Street cannot be empty.",
    "any.required": "Street is required.",
  }),
  city: Joi.string().required().messages({
    "string.base": "City must be a string.",
    "string.empty": "City cannot be empty.",
    "any.required": "City is required.",
  }),
  state: Joi.string().required().messages({
    "string.base": "State must be a string.",
    "string.empty": "State cannot be empty.",
    "any.required": "State is required.",
  }),
  zipcode: Joi.string()
    .required()
    .pattern(/^[0-9]{5,6}$/)
    .messages({
      "string.base": "Zipcode must be a string.",
      "string.empty": "Zipcode cannot be empty.",
      "any.required": "Zipcode is required.",
      "string.pattern.base": "Zipcode must be 5-6 digits.",
    }),
  house: Joi.string().optional().allow("", null).messages({
    "string.base": "House must be a string.",
  }),
  landmark: Joi.string().optional().allow("", null).messages({
    "string.base": "Landmark must be a string.",
  }),
});

const createValidateTechnicianAddress = (req, res, next) => {
  const { error } = createTechnicianAddressSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: false,
      message: error.details[0].message,
    });
  }
  next();
};

module.exports = {
  createValidateTechnician,
  validateTechnicianLogin,
  validateTechnicianLoginVerifyPayload,
  createValidateTechnicianProfile,
  updateValidateTechnician,
  createValidateTechnicianAddress,
};
