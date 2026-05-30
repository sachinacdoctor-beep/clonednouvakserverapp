const express = require('express');
const locationController = require('../../controllers/locationController/location.controller');
const {userAuthenticateToken} = require('../../middlewares/User/user.auth');
const router = express.Router();


router.post('/location/check-availability', userAuthenticateToken, locationController.checkAvailability);
// console.log("object");
module.exports = router;
