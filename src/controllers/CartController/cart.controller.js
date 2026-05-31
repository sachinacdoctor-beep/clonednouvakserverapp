const Cart = require('../../models/Cart/cart.model');
const Booking = require('../../models/Bookings/booking.model');
const Address = require('../../models/User/address.model');
const User = require('../../models/User/user.model');
const moment = require('moment');

// ─── helpers ──────────────────────────────────────────────────────────────────

const recalcTotals = (cart) => {
  let itemTotal = 0;
  for (const group of cart.services) {
    for (const item of group.items) {
      item.totalPrice = (item.unitPrice || 0) * (item.quantity || 1);
      itemTotal += item.totalPrice;
    }
  }
  cart.itemTotal = itemTotal;
  cart.grandTotal = itemTotal - (cart.discount || 0) + (cart.tax || 0);
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, services: [] });
  }
  return cart;
};

// Generate booking ID matching existing convention: BK + DDMMYYYY + 4-digit random
const generateBookingId = () => {
  const date = moment().format('DDMMYYYY');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `BK${date}${rand}`;
};

// ─── POST /api/v1/cart/add ────────────────────────────────────────────────────
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      type,
      subType,
      serviceId,
      category,
      name,
      serviceType,
      quantity = 1,
      unitPrice = 0,
      attributes = {},
      meta,
    } = req.body;

    if (!type || !category || !name) {
      return res.status(400).json({
        status: false,
        message: 'type, category, and name are required',
      });
    }

    const cart = await getOrCreateCart(userId);

    // Find or create category group
    let group = cart.services.find((g) => g.category === category);
    if (!group) {
      cart.services.push({ category, items: [] });
      group = cart.services[cart.services.length - 1];
    }

    // Add item
    group.items.push({
      serviceId: serviceId || undefined,
      name,
      type,
      subType,
      serviceType,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      attributes,
      meta: meta || undefined,
    });

    recalcTotals(cart);
    await cart.save();

    return res.status(200).json({
      status: true,
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
    console.error('addToCart error:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// ─── GET /api/v1/my-cart ─────────────────────────────────────────────────────
exports.getMyCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).lean();

    // Return empty cart shape if none exists yet — frontend handles { services: [] }
    return res.status(200).json({
      status: true,
      data: cart || { userId, services: [], itemTotal: 0, grandTotal: 0 },
    });
  } catch (error) {
    console.error('getMyCart error:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// ─── GET /api/v1/cartItem ─────────────────────────────────────────────────────
// Alias — same as getMyCart
exports.getCartItem = async (req, res) => {
  return exports.getMyCart(req, res);
};

// ─── PATCH /api/v1/item/:cartItemId ──────────────────────────────────────────
// Body: { action: "INCREMENT" | "DECREMENT" }
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cartItemId } = req.params;
    const { action } = req.body;

    if (!['INCREMENT', 'DECREMENT'].includes(action)) {
      return res.status(400).json({ status: false, message: 'action must be INCREMENT or DECREMENT' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ status: false, message: 'Cart not found' });
    }

    let found = false;
    for (const group of cart.services) {
      const item = group.items.id(cartItemId);
      if (item) {
        if (action === 'INCREMENT') {
          item.quantity += 1;
        } else {
          item.quantity -= 1;
          if (item.quantity <= 0) {
            item.deleteOne();
          }
        }
        // Remove empty category groups
        if (group.items.length === 0) {
          cart.services = cart.services.filter((g) => g.items.length > 0);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ status: false, message: 'Cart item not found' });
    }

    recalcTotals(cart);
    await cart.save();

    return res.status(200).json({ status: true, success: true, message: 'Cart updated', data: cart });
  } catch (error) {
    console.error('updateCartItem error:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// ─── DELETE /api/v1/item/:cartItemId ─────────────────────────────────────────
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cartItemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ status: false, message: 'Cart not found' });
    }

    let found = false;
    for (const group of cart.services) {
      const item = group.items.id(cartItemId);
      if (item) {
        item.deleteOne();
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ status: false, message: 'Cart item not found' });
    }

    // Remove empty groups
    cart.services = cart.services.filter((g) => g.items.length > 0);
    recalcTotals(cart);
    await cart.save();

    return res.status(200).json({ status: true, success: true, message: 'Item removed', data: cart });
  } catch (error) {
    console.error('removeCartItem error:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// ─── POST /api/v1/cart/checkout ───────────────────────────────────────────────
// Body: { addressId, slot, date }
// Creates a Booking from the current cart, clears the cart.
// ViewCart.js checks res.data.success === true to navigate to BookingCompleteScreens.
exports.checkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { addressId, slot, date } = req.body;

    if (!addressId || !slot || !date) {
      return res.status(400).json({
        status: false,
        success: false,
        message: 'addressId, slot, and date are required',
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.services.length) {
      return res.status(400).json({ status: false, success: false, message: 'Cart is empty' });
    }

    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(400).json({ status: false, success: false, message: 'Invalid address' });
    }

    const user = await User.findById(userId).select('name');
    if (!user) {
      return res.status(400).json({ status: false, success: false, message: 'User not found' });
    }

    // Build serviceDetails in the format existing Booking model expects
    const serviceDetails = [];
    for (const group of cart.services) {
      for (const item of group.items) {
        serviceDetails.push({
          service_id: item.serviceId || undefined,
          serviceType: item.serviceType || item.subType || item.name,
          quantity: item.quantity,
          acType: item.attributes?.categoryType || item.attributes?.subType || '',
          place: '',
          comment: item.name,
        });
      }
    }

    const addressDetails = {
      house: address.house,
      street: address.street,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      saveAs: address.saveAs,
      landmark: address.landmark,
    };

    const booking = new Booking({
      user_id: userId,
      bookingId: generateBookingId(),
      name: user.name || 'User',
      serviceDetails,
      addressId,
      addressDetails,
      slot,
      date,
      amount: cart.grandTotal,
      status: 'BOOKED',
    });

    await booking.save();

    // Clear cart after successful booking
    cart.services = [];
    cart.itemTotal = 0;
    cart.grandTotal = 0;
    cart.discount = 0;
    cart.tax = 0;
    await cart.save();

    // success: true is explicitly required by ViewCart.js:
    // if (res?.data?.success === true) { navigation to complete screen }
    return res.status(200).json({
      status: true,
      success: true,
      message: 'Booking created successfully',
      data: { bookingId: booking.bookingId, _id: booking._id },
    });
  } catch (error) {
    console.error('checkout error:', error);
    return res.status(500).json({ status: false, success: false, message: 'Checkout failed' });
  }
};
