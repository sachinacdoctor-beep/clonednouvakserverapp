const HomeBanner = require('../../models/HomeBanner/homebanner.model');
const Service = require('../../models/Service/service.model');

// ─── Home Screen Data ─────────────────────────────────────────────────────────
//
// GET /api/v1/home?type=USER&screen=HOME
//   Returns an array of sections consumed by the Nouvak User App.
//
// GET /api/v1/home?type=USER&screen=<SERVICE_NAME>
//   Returns service-type sections for the Bookingscreen (per-service drill-down).
//
// Section shapes the app renders:
//
//  item.section === 'TOP'          → AutoSlider  (banner carousel)
//  item.type   === 'DASHBOARD'     → DashboardSection (section: 'BOOKING' or 'REQUEST')
//  item.type   === 'UTILITIES'     → UtilisComponets
//  item.section === 'MIDDLE'       → StaticImage
//  item.section === 'BOTTOM'       → Bottomimages
//  item.type   === 'SERVICE_TYPE'  → SelectBookservices (Bookingscreen only)
//
// ─────────────────────────────────────────────────────────────────────────────

// Two utility item _ids are HARDCODED in UtilisComponets.js:
//   '69cbd277d17e67d59b17550d' → TonnageCalculator
//   '69cbd296d17e67d59b17550f' → ErroCodeinput
// The home endpoint must return items with exactly these IDs.
const UTILITY_ITEMS = [
  {
    _id: '69cbd277d17e67d59b17550d',
    name: 'Tonnage Calculator',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png',
  },
  {
    _id: '69cbd296d17e67d59b17550f',
    name: 'Error Codes',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
  },
];

// Static REQUEST items — names must match navigation switch in DashboardSection.js
const REQUEST_ITEMS = [
  {
    _id: 'req_repair',
    name: 'Repair & Diagnosis',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png',
  },
  {
    _id: 'req_amc',
    name: 'AMC',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png',
  },
  {
    _id: 'req_consultation',
    name: 'Free Consultancy',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3481/3481082.png',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildBannerSection = (banners, position) => ({
  type: 'BANNER',
  section: position,
  bannerDisplay: 'CAROUSEL',
  items: banners.map((b) => ({
    _id: b._id,
    mediaType: b.mediaType,
    mediaUrl: b.mediaUrl,
    thumbnailUrl: b.thumbnailUrl || b.mediaUrl,
    destination: b.destination,
    data: b.data,
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
    // `service` is passed whole to Bookingscreen — must include unitPrice
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

// ─── AC sub-type table ────────────────────────────────────────────────────────
// Used when the Bookingscreen calls GET /api/v1/home?screen=<SERVICE_NAME>.
// Keys are upper-cased service names; each value is a SERVICE_TYPE section.
const AC_SUBTYPES = ['Split AC', 'Window AC', 'Cassette AC', 'Tower AC', 'Ductable AC'];
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
    items: TONNAGE_OPTIONS.map((ton) => ({
      _id: `${subtype.replace(/\s+/g, '_').toLowerCase()}_${ton.replace(/\s+/g, '_').toLowerCase()}`,
      name: ton,
      iconUrl: '',
    })),
  })),
});

// ─── Main controller ──────────────────────────────────────────────────────────

exports.getHomeScreen = async (req, res) => {
  try {
    const { type = 'USER', screen = 'HOME' } = req.query;
    const normalizedScreen = screen.toUpperCase().trim();

    // ── Bookingscreen drill-down ───────────────────────────────────────────
    // When the user taps a BOOKING dashboard item, Bookingscreen calls
    // home?type=USER&screen=<serviceName> to get SERVICE_TYPE sections.
    if (normalizedScreen !== 'HOME') {
      let subtypes = [];
      const lc = normalizedScreen.toLowerCase();

      if (lc.includes('air conditioning') || lc.includes('ac') || lc.includes('cooling')) {
        subtypes = AC_SUBTYPES;
      } else if (lc.includes('boiler') || lc.includes('heat pump')) {
        subtypes = lc.includes('heat pump') ? HEAT_PUMP_SUBTYPES : BOILER_SUBTYPES;
      } else {
        // Generic: return a single group named after the service
        subtypes = ['Standard', 'Premium'];
      }

      const screenTitle = screen.charAt(0).toUpperCase() + screen.slice(1).toLowerCase();
      const sections = [buildServiceTypeSection(screenTitle, subtypes)];

      return res.status(200).json({ success: true, count: sections.length, data: sections });
    }

    // ── HOME screen ───────────────────────────────────────────────────────
    const [topBanners, middleBanners, bottomBanners, services] = await Promise.all([
      HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: 'HOME' })
        .sort({ position: 1 })
        .limit(10)
        .lean(),
      HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: 'ADVERTISE' })
        .sort({ position: 1 })
        .limit(5)
        .lean(),
      HomeBanner.find({ isActive: true, appType: { $in: ['USER', type] }, destination: { $in: ['HOW_IT_WORK', 'PRODUCT'] } })
        .sort({ position: 1 })
        .limit(5)
        .lean(),
      Service.find({ isActive: 1 }).sort({ orderBy: 1, position: 1 }).limit(12).lean(),
    ]);

    const sections = [];

    // TOP banner carousel
    if (topBanners.length) {
      sections.push(buildBannerSection(topBanners, 'TOP'));
    }

    // BOOKING dashboard — services with BASIC / standard categories
    const bookingServices = services.filter(
      (s) => !['AMC', 'COPPER_PIPING'].includes(s.category),
    );
    if (bookingServices.length) {
      sections.push(buildBookingSection(bookingServices));
    }

    // REQUEST dashboard — static items
    sections.push({
      type: 'DASHBOARD',
      section: 'REQUEST',
      title: 'Request a Service',
      items: REQUEST_ITEMS,
    });

    // UTILITIES — hardcoded IDs required by the app
    sections.push({
      type: 'UTILITIES',
      section: 'UTILITIES',
      title: 'Utilities',
      items: UTILITY_ITEMS,
    });

    // MIDDLE banner
    if (middleBanners.length) {
      sections.push(buildBannerSection(middleBanners, 'MIDDLE'));
    }

    // BOTTOM banner
    if (bottomBanners.length) {
      sections.push(buildBannerSection(bottomBanners, 'BOTTOM'));
    }

    return res.status(200).json({
      success: true,
      count: sections.length,
      data: sections,
    });
  } catch (error) {
    console.error('getHomeScreen error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load home screen' });
  }
};
