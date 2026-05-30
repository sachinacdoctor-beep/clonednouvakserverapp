const mongoose = require("mongoose");

const materialUsedSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    unit: {
      type: String,
      enum: ["FT", "KG", "METER", "PIECE"],
      required: true,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      min: 0,
    },
  },
  { _id: false },
);

materialUsedSchema.pre("validate", function (next) {
  this.amount = this.qty * this.rate;
  next();
});

const acSchema = new mongoose.Schema(
  {
    serviceDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    acType: {
      type: String,
      required: true,
    },

    brandName: {
      type: String,
      required: true,
    },

    yom: {
      type: Number,
      required: true,
    },

    tr: {
      type: Number,
      required: true,
    },

    inverter: {
      type: Boolean,
      default: false,
    },

    serviceType: {
      type: String,
      required: true,
    },

    materials: {
      type: [materialUsedSchema],
      default: [],
    },

    jobStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
    },

    remark: {
      type: String,
      trim: true,
    },

    beforePhotos: {
      type: [String],
      default: [],
    },

    afterPhotos: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const technicianServiceReportSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    acs: {
      type: [acSchema],
      required: true,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["COMPLETE", "PARTIAL", "PENDING"],
      default: "PENDING",
    },

    version: {
      type: Number,
      required: true,
      default: 1,
    },

    copiedToCentral: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

technicianServiceReportSchema.pre("save", function (next) {
  let total = 0;
  this.acs.forEach((ac) =>
    ac.materials.forEach((m) => {
      total += m.amount || 0;
    }),
  );
  this.totalAmount = total;
  next();
});

technicianServiceReportSchema.index(
  { job: 1, technician: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "TechnicianServiceReport",
  technicianServiceReportSchema,
);
