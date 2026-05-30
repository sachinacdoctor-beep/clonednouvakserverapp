const express = require("express");
const adminController = require("../../controllers/AdminController/admin.controller");
const productController = require("../../controllers/ShopController/product.controller");
const adminAuthenticateToken = require("../../middlewares/Admin/admin.auth");

const router = express.Router();


router.post(
  "/admin/shop/product/create",
  productController.createProduct
);

router.put("/admin/shop/product/update/:id", productController.updateProduct);

router.get(
  "/admin/shop/product/generate-presigned-url",
  adminController.generatePresignedUrl,
);

router.get("/admin/shop/product-list", productController.productList);

router.get("/admin/shop/product/:productId", productController.getProductById);

router.post(
  "/admin/shop/purchase/lead",
  productController.createPurchaseLead,
);

router.put(
  "/admin/shop/purchase/lead/update/:purchaseLeadId",
  productController.updatePurchaseLead,
);

router.get(
  "/admin/shop/purchase/leads",
  productController.getPurchaseLeads,
);

router.get("/admin/shop/purchase/lead/:purchaseLeadId", productController.getPurchaseLeadById);

module.exports = router;