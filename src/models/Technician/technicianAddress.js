const mongoose = require('mongoose');

const technicianAddressSchema = new mongoose.Schema(
  {
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
    },
    house: {
      type: String,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipcode: {
      type: String,
      required: true,
    },
    // saveAs: {
    //   type: String,
    //   trim: true,
    //   default: "",
    // },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

technicianAddressSchema.index(
//   { technicianId: 1, isDefault: 1 },
  { technicianId: 1},
//   { unique: true, partialFilterExpression: { isDefault: true } },
  { unique: true},
);

const TechnicianAddress = mongoose.model('TechnicianAddress', technicianAddressSchema);

module.exports = TechnicianAddress;
