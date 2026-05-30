const mongoose = require("mongoose");

const acQuotationSchema = new mongoose.Schema({
  oldAcDetailId: {
    type: mongoose.Types.ObjectId,
    required: true
  },

  brand: String,
  model: String,
  acType: String,
  tonnage: String,

  age: String,
  condition: String,
  inspectionRemarks: String,
  offeredAmount: Number,

  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },

  rejectionReason: {
    type: String,
    default: "",
  },
});


const copperPipingSchema = new mongoose.Schema({
  propertyType: {
    type: String,
    required: true,
  },
  acTypes: [
    {
      type: String, 
    },
  ],
  inspectionRemarks: {
    type: String,
    default: "",
  },
  offeredAmount: {
    type: Number,
    required: true,
  },
   status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },

  rejectionReason: {
    type: String,
    default: "",
  },
});

const inspectionSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Types.ObjectId,
      ref: "Enquiry",
      required: true,
    },

    technicianId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subType: {
      type: String,
      enum: ["OLD_AC", "COPPER_PIPING"],
      required: true,
    },

    acQuotations: [acQuotationSchema],

    copperPipingDetails: copperPipingSchema,

    totalOfferAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["QUOTE_SHARED", "ACCEPTED", "REJECTED","INSPECTED"],
      default: "QUOTE_SHARED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inspection", inspectionSchema);
