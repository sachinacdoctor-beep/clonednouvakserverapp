const express = require('express');
const router = express.Router();
const homeController = require('../../controllers/HomeController/home.controller');

// GET /api/v1/home?type=USER&screen=HOME
// GET /api/v1/home?type=USER&screen=<SERVICE_NAME>
router.get('/home', homeController.getHomeScreen);

// ── Home Screen Config CRUD ──────────────────────────────────────────────────
// Mirrors production nouvakserverapp home config routes exactly.
// Used by Admin to configure which sections appear on the home screen.

// POST /api/v1/home/config
router.post('/home/config', homeController.createHomeConfig);

// GET /api/v1/home/config?appType=USER&screen=HOME
router.get('/home/config', homeController.getHomeConfigList);

// GET /api/v1/home/config/:id
router.get('/home/config/:id', homeController.getHomeConfigById);

// PUT /api/v1/home/config/:id
router.put('/home/config/:id', homeController.updateHomeConfig);

// DELETE /api/v1/home/config/:id
router.delete('/home/config/:id', homeController.deleteHomeConfig);

module.exports = router;
