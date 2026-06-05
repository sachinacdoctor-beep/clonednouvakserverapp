const mongoose = require('mongoose');

// Mirrors production nouvakserverapp HomeScreenConfig exactly.
//
// Production SectionKey type (config.types.ts):
//   TOP_BANNER | SERVICE_TYPES | REQUEST | UTILITIES |
//   MIDDLE_BANNER | PRODUCT_LIST | STERILIZATION_INFO | BOTTOM_BANNER
//
// Note: production screenConfig.model.ts schema enum lists only 6 keys
// (missing REQUEST and UTILITIES) — that is a production oversight.
// All 8 keys are included here so REQUEST and UTILITIES sections work.

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

const SECTION_TYPES    = ['BANNER', 'DASHBOARD', 'PRODUCT_LIST', 'INFO'];
const BANNER_DISPLAYS  = ['CAROUSEL', 'STATIC', 'AUTO'];

const HomeSectionSchema = new mongoose.Schema(
  {
    key:          { type: String, required: true, enum: SECTION_KEYS },
    type:         { type: String, required: true, enum: SECTION_TYPES },
    order:        { type: Number, required: true },
    isActive:     { type: Boolean, default: true },
    bannerDisplay:{ type: String, enum: BANNER_DISPLAYS, default: 'AUTO' },
  },
  { _id: false },
);

const HomeScreenConfigSchema = new mongoose.Schema(
  {
    appType:  { type: String, required: true, enum: ['USER', 'TECHNICIAN'] },
    screen:   { type: String, required: true },
    sections: { type: [HomeSectionSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('HomeScreenConfig', HomeScreenConfigSchema);
