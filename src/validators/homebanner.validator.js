const Joi = require('joi');


const bannerValidatorSchema = Joi.object({
  appType: Joi.string()
    .valid("USER", "TECHNICIAN")
    .required()
    .messages({
      "any.only": "appType must be USER_APP or TECHNICIAN_APP",
      "any.required": "appType is required",
    }),

  mediaType: Joi.string().valid("IMAGE", "VIDEO").required().messages({
    "any.only": "mediaType must be IMAGE or VIDEO",
    "any.required": "mediaType is required",
  }),

  mediaUrl: Joi.string().uri().required().messages({
    "string.uri": "mediaUrl must be a valid URL",
    "any.required": "mediaUrl is required",
  }),

  thumbnailUrl: Joi.string().uri().allow("", null).messages({
    "string.uri": "thumbnailUrl must be a valid URL",
  }),

  destination: Joi.string()
    .valid("COUPON", "AD", "HOME", "PARTNER", "HOW_IT_WORK")
    .required()
    .messages({
      "any.only":
        "destination must be one of [HOME, SELL_OLD_AC, PARTNER, HOW_IT_WORK]",
      "any.required": "destination is required",
    }),

  position: Joi.number().integer().min(1).required().messages({
    "number.base": "position must be a number",
    "number.integer": "position must be an integer",
    "number.min": "position must be greater than 0",
    "any.required": "position is required",
  }),

  data: Joi.string().allow("", null).messages({
    "string.base": "data must be a string",
  }),

  id: Joi.string().optional(),
});

const bannerValidator = (req, res, next) => {
    const { error } = bannerValidatorSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }
    next();
};

module.exports = { bannerValidator };