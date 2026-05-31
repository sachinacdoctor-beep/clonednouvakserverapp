const express = require('express');
const router = express.Router();
const homeController = require('../../controllers/HomeController/home.controller');

// GET /api/v1/home?type=USER&screen=HOME
// GET /api/v1/home?type=USER&screen=<SERVICE_NAME>
router.get('/home', homeController.getHomeScreen);

module.exports = router;
