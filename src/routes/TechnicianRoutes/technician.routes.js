const express = require("express");
const TechnicianController = require("../../controllers/TechnicianController/technician.controller");
const BookingController = require("../../controllers/BookingController/booking.controller");
const brandController = require('../../controllers/Brand/brand.controller');
const errorcodeController = require('../../controllers/Brand/errorcode.controller');

const {
  validateTechnicianLogin,
  validateTechnicianLoginVerifyPayload,
  createValidateTechnician,
  createValidateTechnicianProfile,
  updateValidateTechnician,
} = require("../../validators/TechnicianValidator/technician.validator");
const {
  authenticateTechnicianToken,
} = require("../../middlewares/Technician/technician.auth");
const {
  kycValidator,
} = require("../../validators/TechnicianValidator/kycDocValidator.validator");
const {
  attendanceValidator,
} = require("../../validators/TechnicianValidator/Attendance.validator");
const toolRequestValidator = require("../../validators/ToolsValidator/toolrequest.validator");
const enquiryController = require("../../controllers/EnquiryController/enquiry.controller")


const router = express.Router();

// Auth
router.post(
  "/technician/login",
  validateTechnicianLogin,
  TechnicianController.login,
);

router.post(
  "/technician/verify-otp",
  validateTechnicianLoginVerifyPayload,
  TechnicianController.verifyOtp,
);

router.post("/technician/resend-otp/:id", TechnicianController.resendOtp);

router.post("/technician/refresh-token", TechnicianController.refreshToken);

router.post("/technician/request-deletion", authenticateTechnicianToken, TechnicianController.requestAccountDeletion);

// Profile
router.get(
  "/technician/profile-detail/:technicianId",
  authenticateTechnicianToken,
  TechnicianController.getTechnicianProfile,
);

router.get(
  "/technician/profile",
  authenticateTechnicianToken,
  TechnicianController.getTechnicianForAuthenticatedTechnician,
);

router.post(
  "/technician/profile",
  authenticateTechnicianToken,
  createValidateTechnicianProfile,
  TechnicianController.createProfile,
);

router.put(
  "/technician/profile",
  authenticateTechnicianToken,
  updateValidateTechnician,
  TechnicianController.updateProfile,
);

// KYC
router.post(
  "/technician/kyc",
  authenticateTechnicianToken,
  kycValidator,
  TechnicianController.updateKyc,
);

router.get(
  "/technician/kyc",
  authenticateTechnicianToken,
  TechnicianController.getKyc,
);

router.get(
  "/technician/kyc-upload/image-url",
  authenticateTechnicianToken,
  TechnicianController.getPresignedUrlForTechnician,
);

router.post(
  "/technician/review-kyc",
  authenticateTechnicianToken,
  TechnicianController.createKycReviewRequest,
);

// Attendance
router.post(
  "/technician/attendance",
  authenticateTechnicianToken,
  attendanceValidator,
  TechnicianController.markAttendance,
);

router.get(
  "/technician/attendance",
  authenticateTechnicianToken,
  TechnicianController.getAttendanceDataForDateRange,
);

// Leaves
router.post(
  "/technician/leave",
  authenticateTechnicianToken,
  TechnicianController.applyLeave,
);

// router.get(
//   "/technician/leave",
//   authenticateTechnicianToken,
//   TechnicianController.getLeaveHistory,
// );

// Tools
router.post(
  "/technician/tool/request",
  authenticateTechnicianToken,
  toolRequestValidator,
  TechnicianController.createToolRequest,
);

router.post(
  "/technician/tool/delete-request",
  authenticateTechnicianToken,
  TechnicianController.deleteToolRequest,
);

router.get(
  "/technician/tools",
  authenticateTechnicianToken,
  TechnicianController.getAssignedTools,
);

router.get(
  "/technician/bookings",
  authenticateTechnicianToken,
  BookingController.technicianBookingList,
);

router.get(
  "/technician/booking/:bookingId",
  authenticateTechnicianToken,
  BookingController.technicianBookingDetails,
);

router.put(
  "/technician/booking/status",
  authenticateTechnicianToken,
  BookingController.manageBookingStatusByTechnician,
);

router.get(
  "/technician/tool/list",
  authenticateTechnicianToken,
  TechnicianController.getToolList,
);

router.get(
  "/technician/myTool/request",
  authenticateTechnicianToken,
  TechnicianController.getMyToolRequests,
);

router.get(
  "/technician/myTool/list",
  authenticateTechnicianToken,
  TechnicianController.getAssignedTools,
);

router.post(
  "/technician/report/tool/issue",
  authenticateTechnicianToken,
  TechnicianController.reportToolIssue,
);

router.get(
  "/technician/notifications",
  authenticateTechnicianToken,
  TechnicianController.getNotificationList,
);
router.get(
  "/technician/notifications/unchecked/count",
  authenticateTechnicianToken,
  TechnicianController.getUncheckedNotificationCount,
);

router.get(
  "/technician/material/list",
  authenticateTechnicianToken,
  TechnicianController.getMaterialList
);

router.post(
  "/technician/serviceReport/create",
  authenticateTechnicianToken,
  TechnicianController.createServiceReport
);

router.get(
  "/technician/serviceReport",
  authenticateTechnicianToken,
  TechnicianController.getCentralizedServiceReport
);

router.post(
  "/technician/createLeaveRequest",
  authenticateTechnicianToken,
  TechnicianController.createLeaveRequest
);

router.get(
  "/technician/toolReport",
  authenticateTechnicianToken,
  TechnicianController.getTechnicianToolReports
);

router.get(
  "/technician/leave/list",
  authenticateTechnicianToken,
  TechnicianController.leaveList
);

router.get(
  "/technician/holiday/calender",
  authenticateTechnicianToken,
  TechnicianController.getTechnicianHolidayCalendar
);

router.get(
  "/technician/serviceReportHistory",
  authenticateTechnicianToken,
  TechnicianController.getCentralizedServiceReportHistory
);

// Brand
router.get("/technician/brand/list", brandController.userBrandList);

// Error Code
router.post('/technician/error-code/list', errorcodeController.errorCodeList);

router.get('/technician/my-performance-score', authenticateTechnicianToken,TechnicianController.getTechnicianScoreDashboard);

router.post(
  "/technician/enquiry/submit-inspection",
  authenticateTechnicianToken,
  enquiryController.submitInspection
);

// Get paired technician and helper

router.get(
  "/technician/pairing",
  authenticateTechnicianToken,
  TechnicianController.getPairing,
);

router.get(
  "/technician/points/history",
  authenticateTechnicianToken, 
  TechnicianController.getTechnicianPointHistory
);

router.post(
  "/technician/cash/redeem_request",
  authenticateTechnicianToken, 
  TechnicianController.createRedemptionRequest
);

router.post(
  "/technician/multple_image",
  authenticateTechnicianToken,
  TechnicianController.getMultiplePresignedUrlsForTechnician,
);

router.get(
  "/technician/image-url",
  authenticateTechnicianToken,
  TechnicianController.getPresignedUrlForTechnicianProfile,
);

router.get(
  "/technician/pendingJob",
  authenticateTechnicianToken,
  TechnicianController.getPendingJobsBookings,
);


module.exports = router;
