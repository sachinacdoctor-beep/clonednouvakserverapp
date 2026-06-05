const mongoose = require('mongoose');

// Exact port of production nouvakserverapp DashboardItem model.
// Stores items for home screen sections: BOOKING, REQUEST, UTILITIES, etc.
// Admin manages these via GET/POST/PUT/DELETE /api/v1/admin/dashboard-items.
// getHomeScreen reads them via getDashboardItemsService.

const DashboardItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    iconUrl: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      enum: ['QUICK_SERVICES', 'BOOKING', 'OTHER', 'REQUEST', 'UTILITIES'],
      required: true,
      index: true,
    },
    sectionTitle: {
      type: String,
      trim: true,
    },
    appType: {
      type: String,
      enum: ['USER', 'TECHNICIAN'],
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    screen: {
      type: String,
      required: true,
      index: true,
      default: 'HOME',
    },
    // null for top-level items; set to parent _id for child items (SERVICE_TYPE tree)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DashboardItem',
      default: null,
    },
    // links a BOOKING item to a Service document (for unitPrice lookup)
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    actionType: {
      type: String,
      enum: ['SERVICE', 'NAVIGATE', 'API'],
    },
    actionValue: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DashboardItem', DashboardItemSchema);
