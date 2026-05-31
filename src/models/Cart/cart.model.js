const mongoose = require('mongoose');

// One item inside a category group (e.g. "Split AC – 1 Ton")
const cartItemSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name: { type: String, required: true },
    // BOOKING | QUOTE_REQUEST
    type: { type: String, required: true },
    subType: { type: String },
    // Sterilization | Repair | Installation …
    serviceType: { type: String },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    // e.g. { categoryType: 'Split AC', subType: '1.5 Ton', variant: '...' }
    attributes: {
      categoryType: { type: String },
      subType: { type: String },
      variant: { type: String },
    },
    // Quote-request metadata (brand, model, age, condition, issue, planType)
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: true },
);

// A category group inside the cart (e.g. "Air Conditioning", "Boiler")
const cartCategorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    items: [cartItemSchema],
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one cart per user
      index: true,
    },
    services: [cartCategorySchema],
    // Checkout context — set when user picks slot/address
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    slot: { type: String },
    date: { type: String },
    // Pricing summary (recomputed on every update)
    itemTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Cart', cartSchema);
