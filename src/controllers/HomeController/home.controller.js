const HomeBanner = require('../../models/HomeBanner/homebanner.model');
const Service = require('../../models/Service/service.model');
const HomeScreenConfig = require('../../models/HomeConfig/homeScreenConfig.model');

// ─── Static fallback data ─────────────────────────────────────────────────────

// Two utility _ids are HARDCODED in UtilisComponets.js in the User App
const UTILITY_ITEMS = [
  { _id: '69cbd277d17e67d59b17550d', name: 'Tonnage Calculator', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png' },
  { _id: '69cbd296d17e67d59b17550f', name: 'Error Codes', iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' },
];

const REQUEST_ITEMS = [
  { _id: 'req_repair', name: 'Repair & Diagnosis', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png' },
  { _id: 'req_amc', name: 'AMC', iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png' },
  { _id: 'req_consultation', name: 'Free Consultancy', iconUrl: 'https://cdn-icons-png.flaticon.com/512/3481/3481082.png' },
];

// ─── Banner helpers ───────────────────────────────────────────────────────────

const buildBannerSection = (banners, position, bannerDisplay = 'AUTO') => ({
  type: 'BANNER',
  section: position,
  bannerDisplay,
  items: banners.map((b) => ({
    _id: b._id,
    mediaType: b.mediaType,
    mediaUrl: b.mediaUrl,
    thumbnailUrl: b.thumbnailUrl || b.mediaUrl,
    destination: b.destination,
    data: b.data,
    section: b.section || position,
    order: b.position,
  })),
});

const buildBookingSection = (services) => ({
  type: 'DASHBOARD',
  section: 'BOOKING',
  title: 'Book a Service',
  items: services.map((svc) => ({
    _id: svc._id,
    name: svc.name,
    iconUrl: svc.iconUrl || svc.icon || '',
    position: svc.orderBy || 0,
    action: { type: 'NAVIGATE', id: svc._id },
    service: {
      _id: svc._id,
      name: svc.name,
      icon: svc.icon || svc.iconUrl || '',
      iconUrl: svc.iconUrl || svc.icon || '',
      unitPrice: svc.unitPrice || 0,
      category: svc.category,
      key: svc.key,
    },
  })),
});

// ─── AC sub-type tree (for Bookingscreen drill-down) ─────────────────────────

const AC_SUBTYPES    = ['Split AC', 'Window AC', 'Cassette AC', 'Tower AC', 'Ductable AC'];
const BOILER_SUBTYPES = ['Combi Boiler', 'System Boiler', 'Heat-only Boiler'];
const HEAT_PUMP_SUBTYPES = ['Air Source', 'Ground Source'];
const TONNAGE_OPTIONS = ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton'];

const buildServiceTypeSection = (categoryName, subtypes) => ({
  type: 'SERVICE_TYPE',
  section: 'SERVICE_TYPES',
  title: `Select ${categoryName} Type`,
  items: subtypes.map((subtype) => ({
    _id: `st_${subtype.replace(/\s+/g, '_').toLowerCase()}`,
    name: subtype,
    iconUrl: '',
    children: TONNAGE_OPTIONS.map((ton) => ({
      _id: `${subtype.replace(/\s+/g, '_').toLowerCase()}_${ton.replace(/\s+/g, '_').toLowerCase()}`,
      name: ton,
      iconUrl: '',
      children: [],
    })),
  })),
});

// ─── Config-driven section builder ───────────────────────────────────────────
// Mirrors production getHomeScreenService: reads HomeScreenConfig, fetches
// banners + services for each active section key.

const buildSectionsFromConfig = async (config, appType) => {
  const [allBanners, services] = await Promise.all([
    HomeBanner.find({ isActive: true, appType: { $in: ['USER', appType] } })
      .sort({ position: 1 })
      .lean(),
    Service.find({ isActive: 1 }).sort({ orderBy: 1, position: 1 }).lean(),
  ]);

  const bannerMap = {
    TOP:    allBanners.filter((b) => b.destination === 'HOME'),
    MIDDLE: allBanners.filter((b) => b.destination === 'ADVERTISE'),
    BOTTOM: allBanners.filter((b) => ['HOW_IT_WORK', 'PRODUCT'].includes(b.destination)),
  };

  const bookingServices = services.filter((s) => !['AMC', 'COPPER_PIPING'].includes(s.category));

  const sortedSections = config.sections
    .filter((s) => s.isActive)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const result = [];

  for (const sec of sortedSections) {
    const bd = sec.bannerDisplay || 'AUTO';

    switch (sec.key) {
      case 'TOP_BANNER':
        if (bannerMap.TOP.length) result.push(buildBannerSection(bannerMap.TOP, 'TOP', bd));
        break;
      case 'SERVICE_TYPES':
        if (bookingServices.length) result.push(buildBookingSection(bookingServices));
        break;
      case 'REQUEST':
        result.push({ type: 'DASHBOARD', section: 'REQUEST', title: 'Request a Service', items: REQUEST_ITEMS });
        break;
      case 'UTILITIES':
        result.push({ type: 'UTILITIES', section: 'UTILITIES', title: 'Utilities', items: UTILITY_ITEMS });
        break;
      case 'MIDDLE_BANNER':
        if (bannerMap.MIDDLE.length) result.push(buildBannerSection(bannerMap.MIDDLE, 'MIDDLE', bd));
        break;
      case 'BOTTOM_BANNER':
        if (bannerMap.BOTTOM.length) result.push(buildBannerSection(bannerMap.BOTTOM, 'BOTTOM', bd));
        break;
      default:
        break;
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET HOME SCREEN  — GET /api/v1/home?type=USER&screen=HOME
// Matches production response: { success: true, count: N, data: [...sections] }
// ─────────────────────────────────────────────────────────────────────────────

exports.getHomeScreen = async (req, res) => {
  try {
    const type   = (req.query.type  || 'USER').toString().toUpperCase();
    let   screen = (req.query.screen || 'HOME').toString().toUpperCase().trim();

    // Production screen aliases
    if (['REPAIR', 'INSTALLATION', 'OLD_BOILER', 'AMC'].includes(screen)) {
      screen = 'STERILIZATION';
    }

    if (!['USER', 'TECHNICIAN'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    // ── Bookingscreen drill-down ──────────────────────────────────────────
    if (screen !== 'HOME') {
      let subtypes = [];
      const lc = screen.toLowerCase();

      if (lc.includes('air conditioning') || lc.includes('ac') || lc.includes('cooling') || lc.includes('sterilization')) {
        subtypes = AC_SUBTYPES;
      } else if (lc.includes('heat pump')) {
        subtypes = HEAT_PUMP_SUBTYPES;
      } else if (lc.includes('boiler')) {
        subtypes = BOILER_SUBTYPES;
      } else {
        subtypes = ['Standard', 'Premium'];
      }

      const screenTitle = screen.charAt(0) + screen.slice(1).toLowerCase();
      const sections = [buildServiceTypeSection(screenTitle, subtypes)];

      return res.status(200).json({ success: true, count: sections.length, data: sections });
    }

    // ── HOME screen ────────────────────────────────────────────────────────
    // Check for a saved HomeScreenConfig (config-driven, like production)
    const config = await HomeScreenConfig.findOne({ appType: type, screen: 'HOME', isActive: true }).lean();

    let sections;

    if (config && config.sections && config.sections.length) {
      // Config-driven path (matches production behaviour exactly)
      sections = await buildSectionsFromConfig(config, type);
    } else {
      // Fallback: build default sections from DB data
      const [topBanners, middleBanners, bottomBanners, services] = await Promise.all([
        HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: 'HOME' }).sort({ position: 1 }).limit(10).lean(),
        HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: 'ADVERTISE' }).sort({ position: 1 }).limit(5).lean(),
        HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: { $in: ['HOW_IT_WORK', 'PRODUCT'] } }).sort({ position: 1 }).limit(5).lean(),
        Service.find({ isActive: 1 }).sort({ orderBy: 1, position: 1 }).limit(12).lean(),
      ]);

      sections = [];
      if (topBanners.length)    sections.push(buildBannerSection(topBanners, 'TOP'));
      const bookingServices = services.filter((s) => !['AMC', 'COPPER_PIPING'].includes(s.category));
      if (bookingServices.length) sections.push(buildBookingSection(bookingServices));
      sections.push({ type: 'DASHBOARD', section: 'REQUEST', title: 'Request a Service', items: REQUEST_ITEMS });
      sections.push({ type: 'UTILITIES', section: 'UTILITIES', title: 'Utilities', items: UTILITY_ITEMS });
      if (middleBanners.length) sections.push(buildBannerSection(middleBanners, 'MIDDLE'));
      if (bottomBanners.length) sections.push(buildBannerSection(bottomBanners, 'BOTTOM'));
    }

    return res.status(200).json({ success: true, count: sections.length, data: sections });
  } catch (error) {
    console.error('getHomeScreen error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load home screen' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HOME CONFIG CRUD  — matches production createHomeConfigService exactly
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/v1/home/config
// Body: { appType, screen, sections: [{ key, type, order, isActive?, bannerDisplay? }] }
// Response: { success: true, data: configDoc }  201
exports.createHomeConfig = async (req, res) => {
  try {
    const { appType, screen, sections } = req.body;

    const exists = await HomeScreenConfig.findOne({ appType, screen });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Config already exists' });
    }

    const data = await HomeScreenConfig.create({ appType, screen, sections });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/v1/home/config?appType=USER&screen=HOME
// Response: { success: true, count: N, data: [...] }
exports.getHomeConfigList = async (req, res) => {
  try {
    const { appType, screen } = req.query;

    const filter = {};
    if (appType) filter.appType = appType;
    if (screen)  filter.screen  = screen;

    const data = await HomeScreenConfig.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch configs',
    });
  }
};

// GET /api/v1/home/config/:id
// Response: { success: true, data: configDoc }
exports.getHomeConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });

    const data = await HomeScreenConfig.findById(id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Config not found' });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/home/config/:id
// Body: { sections?, isActive? }
// Response: { success: true, data: updatedConfig }
exports.updateHomeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });

    const data = await HomeScreenConfig.findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!data) return res.status(400).json({ success: false, message: 'Config not found' });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/home/config/:id
// Response: { success: true, message: "Config deleted successfully" }
exports.deleteHomeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id param' });

    const deleted = await HomeScreenConfig.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Config not found' });

    return res.status(200).json({ success: true, message: 'Config deleted successfully' });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};
