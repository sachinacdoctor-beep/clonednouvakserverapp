const express = require('express');
const userController = require('../../controllers/UserController/user.controller');
const { loginUser, verifyOTPUser, resendOTPUser, profileUpdate, addressValidation } = require('../../validators/validateUser');
const router = express.Router();
const adminController = require('../../controllers/AdminController/admin.controller');
const partnerController = require('../../controllers/PartnerController/partner.controller');
const serviceController = require('../../controllers/ServiceController/service.controller');
const bookingController = require('../../controllers/BookingController/booking.controller');
const consultancyController = require('../../controllers/Consultancy/consultancy.controller');
const brandController = require('../../controllers/Brand/brand.controller');
const errorcodeController = require('../../controllers/Brand/errorcode.controller');
const couponController = require('../../controllers/CouponController/coupon.controller');
const productController = require("../../controllers/ShopController/product.controller");
const enquiryController = require("../../controllers/EnquiryController/enquiry.controller")


const {userAuthenticateToken} = require('../../middlewares/User/user.auth');
const multer = require('multer');

const leadController = require('../../controllers/LeadController/lead.controller');
const upload = multer({ storage: multer.memoryStorage() });

// User APIs
router.post('/user/login', loginUser, userController.login);

router.post('/user/verify-otp', userAuthenticateToken, verifyOTPUser, userController.verifyOtp);

// router.post('/user/resend-otp', resendOTPUser, userController.resendOtp);

router.post("/user/resend-otp/:id", userController.resendOtp);


router.get('/user/get-profile/:userId', userController.getUser);

router.post(
  "/user/profile-update", 
  userAuthenticateToken,
  profileUpdate,
  userController.updateProfile
);

router.get(
  "/user/profile-update/image-url",
  userAuthenticateToken,
  userController.getPresignedUrlForUser
);

router.post('/user/address-add-edit', userController.addEditAddress);

router.get('/user/address-list/:userId', userController.userAddressList);

router.post("/user/address/set-default/:addressId", userAuthenticateToken, userController.setDefaultAddress);

router.post('/user/address-delete/:addressId', userController.userAddressDelete);

// logout
router.post('/user/logout/:userId', userController.userLogout);

// Partner List
router.get('/user/partner-list', partnerController.mobilePartnerList);

// Service List
router.get('/user/service-list', serviceController.mobileServiceList);


// router.get('/user/home-screen-data', userController.userHomeScreenList);
router.get('/user/home-banners', userController.getHomeBanners);

router.post('/user/booking/create', userAuthenticateToken, bookingController.createBooking);
router.get('/user/booking-list/:userId', bookingController.mobileBookingList);
router.get('/user/booking-details/:bookingId', bookingController.mobileBookingDetails);
router.get('/user/booking-summary/:bookingId', bookingController.mobileBookingSummary);

router.get('/user/proceed-to-pay/:bookingId', bookingController.generateInvoiceProceedToPayBooking);

router.get(
  "/user/coupon/list",
  userAuthenticateToken,
  couponController.couponList,
);

router.post('/user/coupon/apply-coupon',userAuthenticateToken, couponController.applyCouponCode);


// LEAD
router.post('/user/lead/create', leadController.createLeads);
router.get('/user/lead/:leadId', leadController.userLeadDetails);
router.get('/user/lead/list/:userId', leadController.userLeadList);


// Consultancy
router.post('/user/consultancy/create', upload.single('file'), consultancyController.createConsultancy);
router.get('/user/consultancy/:consultancyId', consultancyController.userConsultancyDetails);
router.get('/user/consultancy-list/:userId', consultancyController.userConsultancyList);


// Brand
router.get('/user/brand/list', brandController.userBrandList);

// Error Code
router.post('/user/error-code/list', errorcodeController.errorCodeList);

router.get('/eeeeeeeeeeee', userController.demo);



// Notification list
router.get('/user/notification-list',userAuthenticateToken, userController.notificationList);
router.get('/user/notification/:id',userAuthenticateToken, userController.getNotificationById);
router.delete('/user/notification/delete/:id',userAuthenticateToken, userController.softDeleteNotification);
router.delete(
  "/user/notification/delete-all",
  userAuthenticateToken,
  userController.softDeleteAllNotifications,
);
router.post(
  "/user/notification/check/:id",
  userAuthenticateToken,
  userController.markNotificationAsChecked,
);
router.post(
  "/user/notification/check-all",
  userAuthenticateToken,
  userController.markAllNotificationsAsChecked,
);

// featured product list
router.get('/user/featured/product-list', productController.getFeaturedProducts);
router.get('/user/products', productController.getProducts);
router.get('/user/featured/product/:productId', productController.getFeaturedProductById);
router.post(
  "/user/featured/product/interested",
   userAuthenticateToken,
  productController.createInterestedLead,
);


router.post('/user/enquiry/create', userAuthenticateToken, enquiryController.createEnquiry);

router.get('/user/myenquiry/list', userAuthenticateToken, enquiryController.getEnquiriesByUserId);

router.get('/user/equiry/data/:id', userAuthenticateToken, enquiryController.getEnquiryById);

router.post(
  "/user/enquiry/cancel",
  userAuthenticateToken,
  enquiryController.cancelEnquiry
);

router.post(
  "/user/enquiry/reschedule",
  userAuthenticateToken,
  enquiryController.rescheduleEnquiry
);

router.post(
  "/user/enquiry/respondToOffer",
  userAuthenticateToken,
  enquiryController.respondToOffer
);

router.post("/user/enquiry/revisit",userAuthenticateToken, enquiryController.requestRevisit);

router.get(
  "/user/multiple_image_url",
  userAuthenticateToken,
  userController.getMultiplePresignedUrlForUser
);

router.post(
  "/user/booking-reschedule",
  userAuthenticateToken,
  bookingController.rescheduleBooking,
);

router.post("/user/app/review", userAuthenticateToken, userController.createOrUpdateAppReview)
router.get("/user/app/active-reviews", userController.getActiveAppReviews)

module.exports = router;    
