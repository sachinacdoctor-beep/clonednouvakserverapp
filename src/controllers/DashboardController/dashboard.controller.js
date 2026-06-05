const mongoose = require('mongoose');
const DashboardItem = require('../../models/Dashboard/dashboardItem.model');

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_APP_TYPES = ['USER', 'TECHNICIAN'];
const VALID_SECTIONS  = ['QUICK_SERVICES', 'BOOKING', 'OTHER', 'REQUEST', 'UTILITIES'];
const VALID_ACTIONS   = ['SERVICE', 'NAVIGATE', 'API'];

const isValid = (value, arr) => arr.includes(value);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/dashboard-items?appType=USER&screen=HOME
// Response: { success: true, data: [...groupedSections] }
// Mirrors production getDashboardItems controller exactly.
// ─────────────────────────────────────────────────────────────────────────────

exports.getDashboardItems = async (req, res) => {
  try {
    const { appType, screen } = req.query;

    if (appType && !isValid(appType, VALID_APP_TYPES)) {
      return res.status(400).json({ success: false, message: 'Invalid appType' });
    }

    const match = { isActive: true };
    if (appType) match.appType = appType;
    if (screen)  match.screen  = screen;

    const docs = await DashboardItem.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          parentId: { $ifNull: ['$parentId', null] },
          service: {
            $cond: [
              { $ifNull: ['$service._id', false] },
              { _id: '$service._id', name: '$service.name', unitPrice: '$service.unitPrice', category: '$service.category' },
              null,
            ],
          },
        },
      },
      { $sort: { section: 1, position: 1 } },
      {
        $group: {
          _id: '$section',
          sectionTitle: { $first: { $ifNull: ['$sectionTitle', '$section'] } },
          items: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          section: '$_id',
          title: '$sectionTitle',
          items: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, data: docs });
  } catch (error) {
    console.error('getDashboardItems error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard items', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/dashboard-items
// Response: { success: true, data: item }  201
// Mirrors production createDashboardItem controller exactly.
// ─────────────────────────────────────────────────────────────────────────────

exports.createDashboardItem = async (req, res) => {
  try {
    const { name, iconUrl, appType, section, sectionTitle, position, actionType, actionValue, screen, serviceId, parentId } = req.body;

    if (!name || !iconUrl || !appType || !section || position === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!isValid(appType, VALID_APP_TYPES)) {
      return res.status(400).json({ success: false, message: 'Invalid appType' });
    }
    if (!isValid(section, VALID_SECTIONS)) {
      return res.status(400).json({ success: false, message: 'Invalid section' });
    }
    if (actionType && !isValid(actionType, VALID_ACTIONS)) {
      return res.status(400).json({ success: false, message: 'Invalid actionType' });
    }
    if (!actionType && !serviceId) {
      return res.status(400).json({ success: false, message: 'Either actionType or serviceId is required' });
    }
    if (actionType === 'SERVICE' && !serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required when actionType is SERVICE' });
    }
    if ((actionType === 'NAVIGATE' || actionType === 'API') && !actionValue) {
      return res.status(400).json({ success: false, message: 'actionValue is required for NAVIGATE or API' });
    }

    const item = await DashboardItem.create({
      name, iconUrl, appType, section, position,
      ...(screen       && { screen }),
      ...(sectionTitle && { sectionTitle }),
      ...(parentId     && { parentId: new mongoose.Types.ObjectId(parentId) }),
      ...(serviceId    && { serviceId: new mongoose.Types.ObjectId(serviceId) }),
      ...(actionType   && { actionType }),
      ...(actionValue  && { actionValue }),
    });

    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('createDashboardItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create dashboard item', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/admin/dashboard-items/:id
// Response: { success: true, data: updatedItem }
// ─────────────────────────────────────────────────────────────────────────────

exports.updateDashboardItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

    const { name, iconUrl, section, sectionTitle, appType, position, actionType, actionValue, isActive, screen, serviceId, parentId } = req.body;

    if (appType    && !isValid(appType,    VALID_APP_TYPES)) return res.status(400).json({ success: false, message: 'Invalid appType' });
    if (section    && !isValid(section,    VALID_SECTIONS))  return res.status(400).json({ success: false, message: 'Invalid section' });
    if (actionType && !isValid(actionType, VALID_ACTIONS))   return res.status(400).json({ success: false, message: 'Invalid actionType' });

    if (actionType === 'SERVICE' && !serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required when actionType is SERVICE' });
    }
    if ((actionType === 'NAVIGATE' || actionType === 'API') && !actionValue) {
      return res.status(400).json({ success: false, message: 'actionValue is required for NAVIGATE or API' });
    }

    const payload = {
      ...(name       !== undefined && { name }),
      ...(iconUrl    !== undefined && { iconUrl }),
      ...(section    !== undefined && { section }),
      ...(sectionTitle             && { sectionTitle }),
      ...(appType    !== undefined && { appType }),
      ...(position   !== undefined && { position }),
      ...(actionType !== undefined && { actionType }),
      ...(actionValue              && { actionValue }),
      ...(isActive   !== undefined && { isActive }),
      ...(screen                   && { screen }),
      ...(serviceId                && { serviceId: new mongoose.Types.ObjectId(serviceId) }),
      ...(parentId                 && { parentId: new mongoose.Types.ObjectId(parentId) }),
    };

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const updated = await DashboardItem.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateDashboardItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update item', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/admin/dashboard-items/:id
// Response: { success: true, message: "Deleted successfully" }
// ─────────────────────────────────────────────────────────────────────────────

exports.deleteDashboardItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

    const deleted = await DashboardItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Item not found' });

    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteDashboardItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete item', error: error.message });
  }
};
