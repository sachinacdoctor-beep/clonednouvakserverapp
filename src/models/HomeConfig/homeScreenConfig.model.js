const mongoose = require('mongoose');

// Mirrors production nouvakserverapp HomeScreenConfig model exactly.

const SECTION_KEYS = [
  'TOP_BANNER',
  'SERVICE_TYPES',
  'REQUEST',
  'UTILITIES',
  'MIDDLE_BANNER',
  'PRODUCT_LIST',
  'STERILIZATION_INFO',
  'BOTTOM_BANNER',
];

const SECTION_TYPES = ['BANNER', 'DASHBOARD', 'PRODUCT_LIST', 'INFO'];
const BANNER_DISPLAYS = ['CAROUSEL', 'STATIC', 'AUTO'];

const homeSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, enum: SECTION_KEYS },
    type: { type: String, required: true, enum: SECTION_TYPES },
    order: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    bannerDisplay: { type: String, enum: BANNER_DISPLAYS, default: 'AUTO' },
  },
  { _id: false },
);

const homeScreenConfigSchema = new mongoose.Schema(
  {
    appType: {
      type: String,
      required: true,
      enum: ['USER', 'TECHNICIAN'],
    },
    screen: {
      type: String,
      required: true,
    },
    sections: {
      type: [homeSectionSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('HomeScreenConfig', homeScreenConfigSchema);
