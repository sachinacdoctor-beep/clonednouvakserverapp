const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/CartController/cart.controller');
const { userAuthenticateToken } = require('../../middlewares/User/user.auth');

// All cart routes require authentication
router.post('/cart/add', userAuthenticateToken, cartController.addToCart);
router.get('/my-cart', userAuthenticateToken, cartController.getMyCart);
router.get('/cartItem', userAuthenticateToken, cartController.getCartItem);
router.patch('/item/:cartItemId', userAuthenticateToken, cartController.updateCartItem);
router.delete('/item/:cartItemId', userAuthenticateToken, cartController.removeCartItem);
router.post('/cart/checkout', userAuthenticateToken, cartController.checkout);

module.exports = router;
