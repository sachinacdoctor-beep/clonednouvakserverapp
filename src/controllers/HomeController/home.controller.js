/**
 * Home controller — follows the production nouvakserverapp home flow exactly.
 *
 * Production flow:
 *  1. GET /home → getHomeScreen
 *       Reads HomeScreenConfig (section order) + DashboardItems + HomeBanners +
 *       featured Products, then assembles sections in the configured order.
 *  2. POST /home/config       → createHomeConfig
 *  3. GET  /home/config       → getHomeConfigList
 *  4. GET  /home/config/:id   → getHomeConfigById
 *  5. PUT  /home/config/:id   → updateHomeConfig
 *  6. DELETE /home/config/:id → deleteHomeConfig
 */

const HomeBanner       = require('../../models/HomeBanner/homebanner.model');
const HomeScreenConfig = require('../../models/HomeConfig/homeScreenConfig.model');
const DashboardItem    = require('../../models/Dashboard/dashboardItem.model');
const Product          = require('../../models/Shop/product.model');

// ─── Constants — mirror production section.types.ts ──────────────────────────

const SECTION = {
  SERVICE_TYPES:      'SERVICE_TYPES',
  BOOKING:            'BOOKING',
  REQUEST:            'REQUEST',
  UTILITIES:          'UTILITIES',
  TOP_BANNER:         'TOP_BANNER',
  MIDDLE_BANNER:      'MIDDLE_BANNER',
  BOTTOM_BANNER:      'BOTTOM_BANNER',
  PRODUCT_LIST:       'PRODUCT_LIST',
  STERILIZATION_INFO: 'STERILIZATION_INFO',
};

// ─── Service layer (inlined — mirrors production service functions) ──────────

/**
 * getHomeBannerListService
 * Returns HomeBanner docs filtered by appType and optionally by section.
 */
const getHomeBannerListService = async ({ appType, section }) => {
  const filter = {
    isActive: true,
    appType: { $in: ['USER', appType] },
  };
  if (section) filter.section = section;

  return HomeBanner.find(filter).sort({ order: 1, position: 1 }).lean();
};

/**
 * getDashboardItemsService
 * Returns a Map keyed by section name → { title, items }.
 * Mirrors production dashboard.service.ts getDashboardItemsService.
 */
const getDashboardItemsService = async ({ appType, screen }) => {
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
            {
              _id: '$service._id',
              name: '$service.name',
              unitPrice: '$service.unitPrice',
            },
            null,
          ],
        },
      },
    },
    { $sort: { position: 1 } },
    {
      $group: {
        _id: '$section',
        sectionTitle: { $first: { $ifNull: ['$sectionTitle', '$section'] } },
        items: { $push: '$$ROOT' },
      },
    },
  ]);

  const map = new Map();
  for (const doc of docs) {
    map.set(doc._id, { title: doc.sectionTitle, items: doc.items });
  }
  return map;
};

/**
 * getFeaturedProductsService
 * Mirrors production shop/product.service.ts getFeaturedProductsService shape.
 */
const getFeaturedProductsService = async ({ page = '1', limit = '5' } = {}) => {
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const products = await Product.aggregate([
    { $match: { featured: true, active: true } },
    { $skip: skip },
    { $limit: parseInt(limit, 10) },
    {
      $project: {
        _id: 1,
        brand: 1,
        featured: 1,
        model: 1,
        name: 1,
        isWishlisted: { $literal: false },
        image:          { $arrayElemAt: ['$images', 0] },
        acType:         '$specifications.acType',
        tonnage:        '$specifications.tonnage',
        inverter:       '$specifications.inverter',
        starRating:     '$specifications.starRating',
        compressorType: '$specifications.compressorType',
        refrigerant:    '$specifications.refrigerant',
        noiseLevel:     '$specifications.noiseLevel',
        mrp:            '$pricing.mrp',
        customerPrice:  '$pricing.customerPrice',
      },
    },
  ]);

  return { products, total: products.length };
};

// ─── Formatters — mirror production formatDashboardItems ─────────────────────

const formatDashboardItems = (items) =>
  items
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      _id:      item._id,
      name:     item.name,
      iconUrl:  item.iconUrl,
      position: item.position ?? 0,
      parentId: item.parentId || null,
      action: {
        type: item.actionType || 'API',
        id:   item.service?._id ?? item.actionValue ?? null,
      },
      service: item.service || null,
    }));

// ─── Banner helper — mirrors production handleBanner ─────────────────────────

const handleBanner = (response, bannerMap, sectionKey, bannerDisplay = 'AUTO') => {
  const items = (bannerMap[sectionKey] || []).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.position ?? 0) - (b.position ?? 0),
  );
  if (!items.length) return;
  response.push({ type: 'BANNER', section: sectionKey, bannerDisplay, items });
};

// ─── Service type tree — mirrors production buildServiceTypeTree ──────────────

const buildServiceTypeTree = (items) => {
  if (!items?.length) return [];

  const formatted = formatDashboardItems(items).map((i) => ({ ...i, children: [] }));
  const map = new Map(formatted.map((i) => [i._id.toString(), i]));
  const root = [];

  formatted.forEach((i) => {
    if (i.parentId && map.has(i.parentId.toString())) {
      map.get(i.parentId.toString()).children.push(i);
    } else {
      root.push(i);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    nodes.forEach((n) => { if (n.children?.length) sortTree(n.children); });
  };
  sortTree(root);
  return root;
};

// ─── Static SERVICE_TYPE fallback (when DB has no DashboardItems for screen) ──

const TONNAGE_OPTIONS    = ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton'];
const AC_SUBTYPES        = ['Split AC', 'Window AC', 'Cassette AC', 'Tower AC', 'Ductable AC'];
const BOILER_SUBTYPES    = ['Combi Boiler', 'System Boiler', 'Heat-only Boiler'];
const HEAT_PUMP_SUBTYPES = ['Air Source', 'Ground Source'];

const buildStaticServiceTypeSection = (categoryName, subtypes) => ({
  type: 'SERVICE_TYPE',
  section: 'SERVICE_TYPES',
  title: `Select ${categoryName} Type`,
  items: subtypes.map((sub) => ({
    _id:      `st_${sub.replace(/\s+/g, '_').toLowerCase()}`,
    name:     sub,
    iconUrl:  '',
    children: TONNAGE_OPTIONS.map((ton) => ({
      _id:      `${sub.replace(/\s+/g, '_').toLowerCase()}_${ton.replace(/\s+/g, '_').toLowerCase()}`,
      name:     ton,
      iconUrl:  '',
      children: [],
    })),
  })),
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/home?type=USER&screen=HOME
// Mirrors production getHomeScreen → getHomeScreenService exactly.
// ═════════════════════════════════════════════════════════════════════════════

exports.getHomeScreen = async (req, res) => {
  try {
    // ── Validate appType ──────────────────────────────────────────────────
    const { type } = req.query;
    let { screen } = req.query;

    if (!type || !['USER', 'TECHNICIAN'].includes(type.toString().toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }
    const appType = type.toString().toUpperCase();

    // ── Screen aliases (production normalises these) ──────────────────────
    if (screen === 'REPAIR')       screen = 'STERILIZATION';
    if (screen === 'INSTALLATION') screen = 'STERILIZATION';
    if (screen === 'OLD_BOILER')   screen = 'STERILIZATION';
    if (screen === 'AMC')          screen = 'STERILIZATION';

    // ── Parallel fetch — mirrors production Promise.all ───────────────────
    const [bannerList, dashboardMap, config] = await Promise.all([
      getHomeBannerListService({ appType }),
      getDashboardItemsService({ appType, ...(screen ? { screen } : {}) }),
      HomeScreenConfig.findOne({
        appType,
        screen: screen || 'HOME',
        isActive: true,
      }).lean(),
    ]);

    // ── No config → return empty (production) / fallback default (cloned) ─
    let sortedSections;
    if (config?.sections?.length) {
      sortedSections = config.sections
        .filter((s) => s.isActive)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
      // Fallback order so home screen renders without a seeded config doc
      sortedSections = [
        { key: SECTION.TOP_BANNER,         isActive: true, order: 1, bannerDisplay: 'CAROUSEL' },
        { key: SECTION.SERVICE_TYPES,      isActive: true, order: 2 },
        { key: SECTION.REQUEST,            isActive: true, order: 3 },
        { key: SECTION.PRODUCT_LIST,       isActive: true, order: 4 },
        { key: SECTION.UTILITIES,          isActive: true, order: 5 },
        { key: SECTION.MIDDLE_BANNER,      isActive: true, order: 6, bannerDisplay: 'STATIC' },
        { key: SECTION.BOTTOM_BANNER,      isActive: true, order: 7, bannerDisplay: 'AUTO' },
      ];
    }

    // ── Build banner map (TOP / MIDDLE / BOTTOM) ──────────────────────────
    const bannerMap = {
      TOP:    bannerList.filter((b) => b.section === 'TOP'),
      MIDDLE: bannerList.filter((b) => b.section === 'MIDDLE'),
      BOTTOM: bannerList.filter((b) => b.section === 'BOTTOM'),
    };

    const response = [];

    // ── Main loop — mirrors production switch statement exactly ───────────
    for (const sec of sortedSections) {
      const bd = sec.bannerDisplay || 'AUTO';

      switch (sec.key) {

        case SECTION.TOP_BANNER:
          handleBanner(response, bannerMap, 'TOP', bd);
          break;

        case SECTION.SERVICE_TYPES: {
          // HOME → BOOKING section; STERILIZATION → nested SERVICE_TYPE tree
          const sectionKey = screen === 'STERILIZATION' ? 'SERVICE_TYPES' : 'BOOKING';
          const services = dashboardMap.get(sectionKey);

          if (services?.items?.length) {
            if (screen === 'STERILIZATION') {
              response.push({
                type:    'SERVICE_TYPE',
                section: 'SERVICE_TYPES',
                title:   services.title || 'Select Service Type',
                items:   buildServiceTypeTree(services.items),
              });
            } else {
              response.push({
                type:    'DASHBOARD',
                section: 'BOOKING',
                title:   services.title || 'Book a Services',
                items:   formatDashboardItems(services.items),
              });
            }
          }
          break;
        }

        case SECTION.REQUEST: {
          const request = dashboardMap.get('REQUEST');
          if (request?.items?.length) {
            response.push({
              type:    'DASHBOARD',
              section: 'REQUEST',
              title:   request.title || 'Request a quote',
              items:   formatDashboardItems(request.items),
            });
          }
          break;
        }

        case SECTION.PRODUCT_LIST: {
          if (!screen || screen === 'HOME') {
            const { products } = await getFeaturedProductsService({ page: '1', limit: '5' });
            if (products.length) {
              response.push({
                type:      'PRODUCT_LIST',
                section:   'PRODUCTS',
                items:     products,
                title:     'Feature Product',
                isVisible: true,
              });
            }
          }
          break;
        }

        case SECTION.MIDDLE_BANNER:
          handleBanner(response, bannerMap, 'MIDDLE', bd);
          break;

        case SECTION.UTILITIES: {
          const utilities = dashboardMap.get('UTILITIES');
          if (utilities?.items?.length) {
            response.push({
              type:    'UTILITIES',
              section: 'UTILITIES',
              title:   utilities.title || 'Utilities',
              items:   formatDashboardItems(utilities.items),
            });
          }
          break;
        }

        case SECTION.STERILIZATION_INFO: {
          const info = dashboardMap.get('STERILIZATION_INFO');
          if (info?.items?.length) {
            response.push({
              type:    'INFO',
              section: 'STERILIZATION',
              items:   info.items.map((i) => ({ title: i.title, description: i.description })),
            });
          }
          break;
        }

        case SECTION.BOTTOM_BANNER:
          handleBanner(response, bannerMap, 'BOTTOM', bd);
          break;

        default:
          break;
      }
    }

    // ── Bookingscreen fallback: no DB items for this screen ───────────────
    if (screen && screen !== 'HOME' && !response.some((s) => ['SERVICE_TYPE', 'DASHBOARD'].includes(s.type))) {
      const lc = screen.toLowerCase();
      const subtypes = lc.includes('heat pump') ? HEAT_PUMP_SUBTYPES
        : lc.includes('boiler') ? BOILER_SUBTYPES
        : AC_SUBTYPES;
      const screenTitle = screen.charAt(0) + screen.slice(1).toLowerCase();
      response.push(buildStaticServiceTypeSection(screenTitle, subtypes));
    }

    return res.status(200).json({ success: true, count: response.length, data: response });
  } catch (error) {
    console.error('getHomeScreen error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load home screen' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// HOME CONFIG CRUD — mirrors production home.controller.ts exactly
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/v1/home/config  →  { success: true, data }  201
exports.createHomeConfig = async (req, res) => {
  try {
    const exists = await HomeScreenConfig.findOne({
      appType: req.body.appType,
      screen:  req.body.screen,
    });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Config already exists' });
    }
    const data = await HomeScreenConfig.create(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/v1/home/config?appType=USER&screen=HOME  →  { success: true, count, data }
exports.getHomeConfigList = async (req, res) => {
  try {
    const { appType, screen } = req.query;
    const filter = {};
    if (appType) filter.appType = appType;
    if (screen)  filter.screen  = screen;
    const data = await HomeScreenConfig.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, message: 'Failed to fetch configs' });
  }
};

// GET /api/v1/home/config/:id  →  { success: true, data }
exports.getHomeConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });
    const data = await HomeScreenConfig.findById(id).lean();
    if (!data) throw new Error('Config not found');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/home/config/:id  →  { success: true, data }
exports.updateHomeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });
    const data = await HomeScreenConfig.findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!data) throw new Error('Config not found');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/home/config/:id
// Production: return res.status(200).json({ success: true, ...data })
// where deleteHomeConfigService returns { message: "Config deleted successfully" }
exports.deleteHomeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });
    const deleted = await HomeScreenConfig.findByIdAndDelete(id);
    if (!deleted) throw new Error('Config not found');
    return res.status(200).json({ success: true, message: 'Config deleted successfully' });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};
