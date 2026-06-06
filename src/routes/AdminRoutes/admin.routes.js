const express = require("express");
const adminController = require("../../controllers/AdminController/admin.controller");
const partnerController = require("../../controllers/PartnerController/partner.controller");
const serviceController = require("../../controllers/ServiceController/service.controller");
const technicianController = require("../../controllers/TechnicianController/technician.controller");
const bookingController = require("../../controllers/BookingController/booking.controller");
const adminAuthenticateToken = require("../../middlewares/Admin/admin.auth");
const {
  adminUserCreationSchema,
} = require("../../validators/AdminUserValidator/user.create.validator");
const {
  createValidateTechnician,
} = require("../../validators/TechnicianValidator/technician.validator");
const createEditValidateUser = require("../../validators/AdminUserValidator/user.create.validator");
const {
  addEditCouponValidation,
} = require("../../validators/CouponValidator/coupon.validator");
const couponController = require("../../controllers/CouponController/coupon.controller");
const leadController = require("../../controllers/LeadController/lead.controller");
const consultancyController = require("../../controllers/Consultancy/consultancy.controller");
const brandController = require("../../controllers/Brand/brand.controller");
const errorcodeController = require("../../controllers/Brand/errorcode.controller");
const multer = require("multer");
const { bannerValidator } = require("../../validators/homebanner.validator");
const {
  kycValidator,
} = require("../../validators/TechnicianValidator/kycDocValidator.validator");
const {
  createToolValidationSchemaValidator,
} = require("../../validators/ToolsValidator/tool.validator");
const {
  createToolBagSchemaValidator,
} = require("../../validators/ToolsValidator/toolsbag.validator");
const toolRequestValidator = require("../../validators/ToolsValidator/toolrequest.validator");
const upload = multer({ storage: multer.memoryStorage() });
const {
  attendanceValidator,
} = require("../../validators/TechnicianValidator/Attendance.validator");
const enquiryController = require("../../controllers/EnquiryController/enquiry.controller")


const router = express.Router();

// ## Admin Module
router.post("/admin/login", adminController.adminLogin);
router.post("/admin/register", adminController.adminRegistration);
// router.post('/generate-refresh-token', adminController.generateRefreshToken);

// ## User Module
router.post(
  "/admin/user/add-edit",
  createEditValidateUser,
  adminController.createEditUserAccount,
);
// router.post('/user-add-edit', adminAuthenticateToken, adminController.createEditUserAccount);
router.get("/admin/user/:userId", adminController.userDetails);

router.post(
  "/admin/user/active-inactive",
  adminController.activeInactiveAccount,
);
// router.post('/user-active-inactive', adminAuthenticateToken, adminController.activeInactiveAccount);
router.post("/admin/user/list", adminController.userList);

// ## Partner Module
router.post("/admin/partner/add-edit", partnerController.addEditPartner);
// router.post('/add-edit-partner', adminAuthenticateToken, uploadFields, adminController.addEditPartner);
router.post("/admin/partner-list", partnerController.partnerList);
router.get("/admin/partner/:partnerId", partnerController.partnerGetById);
router.post(
  "/admin/partner/active-inactive/:partnerId",
  partnerController.partnerActiveInactive,
);

// ## Service Module
router.post("/admin/service/create", serviceController.createService);

router.post("/admin/service/list", serviceController.serviceList);

router.post("/admin/service/edit/:serviceId", serviceController.editService);

router.post(
  "/admin/service/:serviceId",
  serviceController.singleServiceGetById,
);

router.post(
  "/admin/service/active-inactive/:serviceId",
  serviceController.serviceActiveInactive,
);

// ## Technician Module
router.post(
  "/admin/technician/create",
  createValidateTechnician,
  technicianController.createTechnician,
);

router.post(
  "/admin/technician/kycstatus",
  adminAuthenticateToken,
  technicianController.updateKycStatus,
);

router.post(
  "/admin/technician/status",
  adminAuthenticateToken,
  technicianController.toggleTechnicianStatus,
);

router.post(
  "/admin/technician/deletion-request",
  adminAuthenticateToken,
  technicianController.handleDeletionRequest,
);

router.post(
  "/admin/technician/edit",
  createValidateTechnician,
  technicianController.editTechnician,
);

router.get(
  "/admin/technician/list/available",
  adminAuthenticateToken,
  technicianController.getAvailableTechnicians,
);

router.get(
  "/admin/technician/today-present-attendance",
  technicianController.getTechniciansTodayPresentAttendance,
);

router.get(
  "/admin/technician/:technicianId",
  adminAuthenticateToken,
  technicianController.getTechnicianById,
);

// router.post(
//   "/admin/technician/active-inactive/:technicianId",
//   adminAuthenticateToken,
//   technicianController.technicianActiveInactive
// );

router.post(
  "/admin/technician/kyc/manage/:technicianId",
  kycValidator,
  technicianController.updateKyc,
);

router.post(
  "/admin/technician/list",
  adminAuthenticateToken,
  technicianController.technicianList,
);

router.get(
  "/admin/technician/self-booking/list/:technicianId",
  adminAuthenticateToken,
  technicianController.technicianBookingList,
);

// NOT REQUIRED - TO BE DELETED LATER
router.post(
  "/admin/technician/kcy/status",
  adminAuthenticateToken,
  technicianController.technicianUpdateKycStatus,
);

router.put(
  "/admin/technician/professional-skill/:technicianId",
  adminAuthenticateToken,
  technicianController.updateProfessionalSkills,
);

router.get(
  "/admin/attendance/list",
  technicianController.getAttendanceDataForDateRange,
);

router.post(
  "/admin/attendance/mark/:technicianId",
  attendanceValidator,
  technicianController.markAttendance,
);

// router.get('/admin/leave/list', technicianController.leaveList);
router.post("/admin/leave/create", technicianController.createLeaveRequest);

// ## Booking Module
router.post("/admin/booking/create", bookingController.createBooking);

router.get(
  "/admin/booking/:bookingId",
  adminAuthenticateToken,
  bookingController.singleBookingGetById,
);

// User booking list
router.get(
  "/admin/user/booking/list/:userId",
  bookingController.userBookingList,
);

router.post(
  "/admin/booking/edit/:bookingId",
  adminAuthenticateToken,
  bookingController.editBooking,
);

router.post(
  "/admin/booking/list",
  adminAuthenticateToken,
  bookingController.bookingList,
);

router.post(
  "/admin/booking/order-items/add-edit",
  bookingController.addOrderItem,
);

router.get(
  "/admin/booking/generate-invoice/:bookingId",
  bookingController.generateInvoice,
);

router.post(
  "/admin/booking/assign_technician",
  bookingController.technicianAssign,
);
// router.post('/admin/booking/assign_technician', adminAuthenticateToken, bookingController.technicianAssign);

router.post(
  "/admin/booking/status/manage",
  bookingController.bookingStatusManage,
);

router.get(
  "/admin/generate-presigned-url",
  adminController.generatePresignedUrl,
);

// Coupons

router.post(
  "/admin/coupon/add-edit",
  addEditCouponValidation,
  couponController.addEditCoupon,
);

router.get("/admin/coupon/:couponId", couponController.couponGetById);

router.get(
  "/admin/coupon/active-inactive/:couponId",
  adminAuthenticateToken,
  couponController.couponActiveInactive,
);

router.post(
  "/admin/coupon/list",
  adminAuthenticateToken,
  couponController.couponList,
);

// LEAD
router.get("/admin/lead/list", leadController.adminLeadList);
router.get("/admin/lead/:leadId", leadController.adminLeadDetails);

// Consultancy
router.post(
  "/admin/consultancy/create-edit",
  consultancyController.adminCreateConsultancy,
);
router.get(
  "/admin/consultancy/:consultancyId",
  consultancyController.adminConsultancyDetails,
);
router.get(
  "/admin/consultancy-list",
  consultancyController.adminConsultancyList,
);

// Brand
router.post("/admin/brand/create-edit", brandController.adminCreateEditBrand);
router.get(
  "/admin/brand/active-inactive/:brandId",
  brandController.adminBrandActiveInactive,
);
router.get("/admin/brand-list", brandController.adminBrandList);

// Home Banner
router.post(
  "/admin/home-banner/create",
  bannerValidator,
  adminController.saveHomeBanner,
);

router.post(
  "/admin/home-banner/edit",
  bannerValidator,
  adminController.editHomeBanner,
);

router.post(
  "/admin/home-banner/manage/status/:bannerId",
  adminController.toggleBannerStatus,
);

router.delete(
  "/admin/home-banner/delete/:bannerId",
  adminController.deleteHomeBanner,
);

router.get("/admin/home-banner/list", adminController.getHomeBannerList);

// Error Code
router.post(
  "/admin/error-code/create-edit",
  errorcodeController.adminCreateEditErrorCode,
);

router.post(
  "/admin/error-code-excel-upload",
  upload.single("file"),
  errorcodeController.adminExcelErrorCodeUpload,
);
router.get(
  "/admin/dummy-excel-download",
  errorcodeController.dummyExcelFileDownload,
);

router.get(
  "/admin/error-code-list/:brandId",
  errorcodeController.adminErrorCodeList,
);

// Promotional Notification
router.post(
  "/admin/promotion-notification",
  adminController.sendPromoNotification,
);
router.get("/admin/promotion-list", adminController.adminPromoNotificationList);

// Tools Module
router.post(
  "/admin/tools/create",
  adminAuthenticateToken,
  createToolValidationSchemaValidator,
  adminController.addTool,
);

router.put(
  "/admin/tools/edit",
  adminAuthenticateToken,
  adminController.updateTool,
);

router.get(
  "/admin/tools/list",
  adminAuthenticateToken,
  adminController.getToolList,
);

router.delete(
  "/admin/tools/delete/:toolId",
  adminAuthenticateToken,
  adminController.removeTool,
);

/**
 * Tool Bag Module
 */
router.post(
  "/admin/tool-bag/create",
  adminAuthenticateToken,
  createToolBagSchemaValidator,
  adminController.addToolBag,
);

router.put(
  "/admin/tool-bag/edit/:toolBagId",
  adminAuthenticateToken,
  adminController.updateToolBag,
);
router.get(
  "/admin/tool-bag/list",
  adminAuthenticateToken,
  adminController.getToolBagList,
);

router.get(
  "/admin/tool-bag/:toolBagId",
  adminAuthenticateToken,
  adminController.getToolBagById,
);

router.delete(
  "/admin/tool-bag/delete/:toolBagId",
  adminAuthenticateToken,
  adminController.deleteToolBag,
);

// Add or remove tool in tool bag
router.post(
  "/admin/tool-bag/modify-tool",
  adminAuthenticateToken,
  adminController.modifyToolInToolBag,
);

//Tool Request
router.post(
  "/admin/tool/request",
  adminAuthenticateToken,
  toolRequestValidator,
  adminController.createToolRequest,
);

router.get(
  "/admin/tool/request/list",
  adminAuthenticateToken,
  adminController.getToolRequestList,
);

router.put(
  "/admin/tool/request/approve",
  adminAuthenticateToken,
  adminController.updateToolRequestStatus,
);

// Material Module
router.post(
  "/admin/material/create",
  adminAuthenticateToken,
  adminController.createMaterial,
);

router.put(
  "/admin/material/edit",
  adminAuthenticateToken,
  adminController.updateMaterial,
);

router.get(
  "/admin/material/list",
  adminAuthenticateToken,
  adminController.getMaterialList,
);

router.get(
  "/admin/serviceReport",
  adminAuthenticateToken,
  adminController.adminGetJobServiceReports,
);

router.get(
  "/admin/toolReport",
  adminAuthenticateToken,
  adminController.getToolReports,
);

router.post(
  "/admin/assignTool",
  adminAuthenticateToken,
  adminController.assignToolToTechnician,
);

router.get("/admin/technician/assigned/tools", adminAuthenticateToken, adminController.getAssignedToolsToTechnician);

router.get(
  "/admin/technician/leave/list",
  adminAuthenticateToken,
  adminController.getLeaveList,
);

router.post(
  "/admin/leave/approval",
  adminAuthenticateToken,
  adminController.approveLeaveRequest,
);

router.get(
  "/admin/technician/leave-calendar/:technicianId",
  adminAuthenticateToken,
  adminController.getTechnicianAttendanceCalendar,
);

router.post(
  "/admin/holiday/create",
  adminAuthenticateToken,
  adminController.createHoliday,
);
router.get(
  "/admin/holiday/list/:id?",
  adminAuthenticateToken,
  adminController.getHoliday,
);
router.put(
  "/admin/holiday/update/:id",
  adminAuthenticateToken,
  adminController.updateHoliday,
);
router.delete(
  "/admin/holiday/delete/:id",
  adminAuthenticateToken,
  adminController.deleteHoliday,
);

router.get(
  "/admin/serviceReportHistory",
  adminAuthenticateToken,
  adminController.adminGetServiceReportHistory,
);

// Taxation routes
// Create new tax config (versioned)
router.post(
  '/admin/tax-configs',
  adminAuthenticateToken,
  adminController.createTaxConfig
);

// Get active tax config
router.get(
  '/admin/tax-configs/active',
  adminAuthenticateToken,
  adminController.getActiveTaxConfig
);

// Get all tax configs (history)
router.get(
  '/admin/tax-configs',
  adminAuthenticateToken,
  adminController.getAllTaxConfigs
);


router.post(
  "/admin/activity-point/create",
  adminAuthenticateToken,
  adminController.createActivityPoint,
);

router.get(
  "/admin/activity-point/list",
  adminAuthenticateToken,
  adminController.getActivityPointList,
);

router.put(
  "/admin/activity-point/update/:id",
  adminAuthenticateToken,
  adminController.updateActivityPoint,
);

// Admin Submit Offer
router.post(
  "/admin/enquiry/submit-offer",
  adminAuthenticateToken,
  enquiryController.adminSubmitOffer
);

// Helper pairing

router.post("/admin/helper/pair", technicianController.pairHelper);

router.get(
  "/admin/unpaired-technicians/list",
  technicianController.getUnpairedTechnicians,
);

router.post("/admin/helper/unpair/:helperId", technicianController.unpairHelper);

router.post(
  "/admin/cash/approval",
  adminController.updateRedemptionStatus
);

router.get(
  "/admin/ledgerReport",
  adminController.getAdminPointLedgerReport
);

router.post(
  "/admin/contractor/approve_points",
  adminController.updatePendingPointsStatus
);

router.get(
  "/admin/contractor/redemption_request",
  adminController.getContractorRedemptionRequests
);

router.get("/admin/app/reviews", adminController.getAppReviews);

router.delete(
  "/admin/app/review/delete/:reviewId",
  adminController.deleteAppReview,
);

// ── Admin Staff Management (missing from original cloned — added from acdoctorserverapp)
router.get("/admin/staff/list", adminController.listAdminStaff);
router.post("/admin/staff/create", adminController.createAdminStaff);
router.patch("/admin/staff/:id", adminController.updateAdminStaff);
router.put("/admin/staff/:id/permissions", adminController.updateAdminStaffPermissions);
router.post("/admin/staff/:id/permissions/reset", adminController.resetAdminStaffPermissions);

// ── Dashboard Stats (missing from original cloned — added from acdoctorserverapp)
const dashboardController = require("../../controllers/DashboardController/dashboard.controller");
router.get(
  "/admin/dashboard/stats",
  adminAuthenticateToken,
  dashboardController.getDashboardStats,
);

module.exports = router;
