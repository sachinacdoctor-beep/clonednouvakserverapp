const mongoose = require("mongoose");

const acTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "SPLIT_AC",
        "WINDOW_AC",
        "CASSETTE_AC",
        "VRV_VRF_AC",
        "DUCTED_AC",
        "TOWER_AC",
        "CHILLER_AC",
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const copperPipingSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
    },

    propertyType: {
      type: String,
      enum: ["RESIDENTIAL", "COMMERCIAL"],
      required: true,
    },

    acTypes: [acTypeSchema],

    outdoorUnitLocation: {
      type: String,
      enum: ["WALL_LOW", "WALL_HIGH", "FLOOR"],
      required: true,
    },

    pipeLength: {
      type: Number, 
      required: true,
    },

    additionalNotes: {
      type: String,
    },

    images: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true ,versionKey:false }
);

module.exports = mongoose.model(
  "CopperPipingEnquiry",
  copperPipingSchema
);
