const { required } = require("joi");
const mongoose = require("mongoose");

const technicianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    joiningDate: {
      type: Date,
    },
    type: {
      type: String,
      enum: ["ACD", "FC"],
      required: true,
    },
    position: {
      type: String,
      enum: [
        "TBA",
        "HELPER",
        "TECHNICIAN",
        "SENIOR TECHNICIAN",
        "SUPERVISOR",
        "MANAGER",
      ],
      default: "TBA",
    },
    kycStatus: {
      type: String,
      enum: [
        "TBU",
        "PENDING",
        "REVIEW_REQUESTED",
        "IN_REVIEW",
        "VERIFIED",
        "REJECTED",
        "REQUESTED",
      ],
      default: "PENDING",
      required: true,
    },
    kycDocs: [
      {
        type: {
          type: String,
          enum: [
            "PAN",
            "AADHAR_FRONT",
            "AADHAR_BACK",
            "DRIVING_LICENSE",
            "VOTER_ID",
            "PASSPORT",
          ],
        },
        url: { type: String },
        comment: { type: String },
      },
    ],
    professionalSkills: [
      {
        acType: { type: String, required: true }, // e.g., "Window AC", "Split AC", etc.
        service: { type: Boolean, default: false },
        repair: { type: Boolean, default: false },
        install: { type: Boolean, default: false },
      },
    ],
    experience: {
      type: String,
      default: "",
    },
    profilePhoto: { type: String, default: "" },
    countryCode: {
      type: String,
      default: "+91",
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      index: true,
      length: 10,
    },
    status: {
      type: String,
      enum: [
        "SIGNED_UP",
        "PROFILE_CREATED",
        "KYC_PENDING",
        "ON_BOARDING",
        "ON_JOB",
        "AVAILABLE",
        "ON_LEAVE",
        "ON_BREAK",
        "ON_TRAINING",
        "DISABLED",
        "TERMINATED",
        "RESIGNED",
      ],
      default: "AVAILABLE",
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: null,
      required: false,
    },
    dob: {
      type: Date,
      default: null,
    },
    secondaryContactNumber: {
      type: String,
      default: "",
    },
    registered: {
      type: Boolean,
      default: false,
    },
    totalLeaves: {
      type: Number,
      default: 0,
    },
    pairedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
    },
    isPaired: {
      type: Boolean,
      default: false,
      index: true,
    },
    pairedAt: {
      type: Date,
      default: null,
    },

    deviceToken: {
      type: String,
      default: null,
    },

    pendingPoints: {
      type: Number,
      default: 0,
    },

    totalPoints: {
      type: Number,
      default: 0,
    },

    deletionRequest: {
  requested: { type: Boolean, default: false },
  requestedAt: { type: Date, default: null },
  reason: { type: String, default: "" },
  status: {
    type: String,
    enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
    default: "NONE",
  },
},

isDeleted: {
  type: Boolean,
  default: false,
  index: true,
},

deletedAt: {
  type: Date,
  default: null,
},

  },
  { timestamps: true },
);

const Technician = mongoose.model("Technician", technicianSchema);

module.exports = Technician;
