const mongoose = require('mongoose');

const oldAcSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Types.ObjectId,
      ref: "Enquiry",
      required: true,
    },

    oldAcDetails: [
      {
        brand: String,
        model: String,
        acType: String,
        tonnage: String,
        age: String,
        condition: String,
        technology: String,
        photos: [String],
      },
    ],

    // Bulk mode
    totalNoOfAC: {
      type: Number,
      default: null,
    },

    brand: {
      type: String,
    },

    propertyType: {
      type: String,
      enum: ["RESIDENTIAL", "COMMERCIAL"],
    },
    
    alternateNumber: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OldAcEnquiryDetail", oldAcSchema);
