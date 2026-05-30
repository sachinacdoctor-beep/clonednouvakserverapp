const express = require("express");
const adminController = require("../../controllers/AdminController/admin.controller");
const enquiryController = require("../../controllers/EnquiryController/enquiry.controller");
const adminAuthenticateToken = require("../../middlewares/Admin/admin.auth");

const router = express.Router();


router.post(
  "/admin/enquiry/create",
  enquiryController.createEnquiry
);

router.post(
  "/admin/enquiry/edit/:enquiryId",
  adminAuthenticateToken,
  enquiryController.updateEnquiry
);

router.get(
  "/admin/enquiry/:id",
  adminAuthenticateToken,
  enquiryController.getEnquiryById
);

router.post(
  "/admin/enquiry/assign_technician",
  enquiryController.assignTechnicianToEnquiry
);

router.post(
  "/admin/enquiry/addons",
  enquiryController.updateEnquiryWithAddons
);

router.get(
  "/admin/user/enquiry/list/:userId",
  enquiryController.getEnquiriesByUserId
);

router.get(
  "/admin/enquiry-list",
  adminAuthenticateToken,
  enquiryController.listEnquiries
);

// router.post(
//   "/admin/enquiry/order-items/add-edit",
//   bookingController.addOrderItem
// );

// router.get(
//   "/admin/enquiry/generate-invoice/:enquiryId",
//   bookingController.generateInvoice
// );

// router.post('/admin/enquiry/assign_technician', adminAuthenticateToken, bookingController.technicianAssign);

router.post(
  "/admin/enquiry/status/manage",
  enquiryController.updateEnquiryStatus
);

router.get(
  "/admin/generate-presigned-url",
  adminController.generatePresignedUrl
);

module.exports = router;    
