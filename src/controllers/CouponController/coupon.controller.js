const { Types } = require('mongoose');
const Coupon = require('../../models/Coupon/coupon.model');
const Booking = require('../../models/Bookings/booking.model');
const { calculateTotal } = require('../../Utils/common');

exports.addEditCoupon = async (req, res) => {

    const { couponObjectid, discount,
        expiryDate, minValue, name, couponCode,
        image, description } = req.body;


    if (!couponObjectid) {

        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(200).json({
                status: false,
                message: 'Coupon code already exists',
            });
        }

        // Create a new coupon
        await Coupon.create({
            couponCode: couponCode,
            image: image,
            name: name,
            discount: discount,
            minValue: minValue,
            expiryDate: expiryDate,
            description: description,
        });

        return res.status(201).json({
            status: true,
            message: 'Coupon created successfully'
        });
    } else {

        const existingCoupon = await Coupon.findById(couponObjectid);

        if (!existingCoupon) {
          return res.status(200).json({
            status: false,
            message: "Coupon not found",
          });
        }

        // Update the existing coupon
        const updateCoupon = await Coupon.findByIdAndUpdate(
            couponObjectid,
            {
                couponCode: couponCode || existingCoupon?.couponCode,
                image: image || existingCoupon?.image,
                name: name || existingCoupon?.name,
                discount: discount || existingCoupon?.discount,
                minValue: minValue || existingCoupon?.minValue,
                expiryDate: expiryDate || existingCoupon?.expiryDate,
                description: description || existingCoupon?.description,
            },
            { new: true });
            
        if (!updateCoupon) {
            return res.status(200).json({ message: 'Coupon not found', status: false });
        }

        return res.status(200).json({
            status: true,
            message: 'Coupon updated successfully',
        });
    }

}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

exports.couponGetById = async (req, res) => {

    const { couponId } = req.params;

    const coupon = await Coupon.findOne({ _id: couponId })

    if (coupon) {
        return res.status(200).json({
            status: true,
            data: coupon
        });
    } else {
        return res.status(400).json({
            status: false,
            message: 'No data found'
        });
    }
}

exports.couponActiveInactive = async (req, res) => {

    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);


    if (coupon) {

        if (coupon.isActive == 1) {

            await Coupon.updateOne(
                { _id: new Types.ObjectId(couponId) },
                {
                    isActive: 0
                });
            return res.status(200).json({
                status: true,
                message: 'Coupon De-activated'
            });
        } else {
            await Coupon.findOneAndUpdate(
                { _id: new Types.ObjectId(couponId) },
                {
                    isActive: 1
                });
            return res.status(200).json({
                status: true,
                message: 'Coupon activated'
            });
        }
    } else {
        return res.status(200).json({
            status: false,
            message: 'Coupon not found'
        });
    }
}


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
exports.couponList = async (req, res) => {

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const sortField = req?.query?.sortby || "createdAt";
    const sortOrder = req?.query?.orderby ? req.query.orderby === "desc" ? -1 : 1 : -1;


    const offset = (page - 1) * limit;


    const coupon = await Coupon.find({
        $or: [
            { couponCode: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
        ]
    })
        .skip(offset)
        .limit(limit)
        .sort({ [sortField]: sortOrder });


    const total = await Coupon.countDocuments({
        $or: [
            { couponCode: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
        ]
    })

    if (coupon.length > 0) {
        return res.status(200).json({
            status: true,
            data: coupon,
            count: total
        });
    } else {
        return res.status(200).json({
            status: false,
            message: 'No data found',
            data: [],
            count: 0
        });
    }
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// exports.applyCouponCode = async (req, res) => {


//     const { couponCode, userId, bookingId } = req.body;

//     const findBooking = await Booking.findOne({ _id: bookingId });


//     function calculateTotal(items) {
//         return items.reduce((total, item) => {
//             let quantity = parseInt(item.quantity.replace('+', ''), 10);
//             let price = parseFloat(item.price.toString());
//             return total + quantity * price;
//         }, 0);
//     }

//     const totalPrice = calculateTotal(findBooking.orderItems);


//     const findCoupon = await Coupon.findOne({ couponCode: couponCode, isActive: true }).select('minValue discount couponCode')



// }


/**
 * Apply or remove a coupon to/from a booking
 * @param {string} couponCode - Coupon code to apply
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID
 * @param {boolean} apply - true to apply coupon, false to remove it
 */
exports.applyCouponCode = async (req, res) => {
    try {
        const { couponCode, bookingId, apply } = req.body;
        const userId = req.user._id

        // Validate required fields
        if (!userId || !bookingId || apply === undefined) {
            return res.status(400).json({
                status: false,
                message: "User ID, booking ID, and apply flag are required."
            });
        }

        // Fetch booking by ID
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                status: false,
                message: "Booking not found."
            });
        }

        // Verify booking belongs to user
        if (booking.user_id.toString() !== userId) {
            return res.status(403).json({
                status: false,
                message: "Unauthorized: Booking does not belong to this user."
            });
        }

        // REMOVE COUPON
        if (!apply) {
            if (!booking.isCouponApplied) {
                return res.status(400).json({
                    status: false,
                    message: "No coupon is currently applied to this booking."
                });
            }

            // Reset booking coupon fields
            const updatedBooking = await Booking.findByIdAndUpdate(
                bookingId,
                {
                    $set: {
                        isCouponApplied: false,
                        originalTotal: 0,
                        discountAmount: 0,
                        discountedTotal: 0,
                        appliedCoupon: {
                            couponCode: "",
                            discount: 0,
                            minValue: 0
                        }
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                status: true,
                message: "Coupon removed successfully.",
                booking: {
                    grandTotal: booking.grandTotal ? parseFloat(booking.grandTotal.toString()) : 0,
                    isCouponApplied: updatedBooking.isCouponApplied,
                    discountAmount: updatedBooking.discountAmount
                }
            });
        }

        // APPLY COUPON
        if (!couponCode) {
            return res.status(400).json({
                status: false,
                message: "Coupon code is required."
            });
        }

        // Check if coupon already applied
        if (booking.isCouponApplied) {
            return res.status(400).json({
                status: false,
                message: "A coupon is already applied to this booking. Remove it first to apply a different coupon."
            });
        }

        // Fetch coupon
        const coupon = await Coupon.findOne({ couponCode, isActive: true });
        if (!coupon) {
            return res.status(404).json({
                status: false,
                message: "Invalid or inactive coupon code."
            });
        }

        // Validate coupon expiry
        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({
                status: false,
                message: "This coupon has expired."
            });
        }

        // Calculate total from booking (use grandTotal which includes tax)
        // Handle cases where grandTotal might not be set (fallback to amount + tax)
        let bookingTotal = 0;
        
        if (booking.grandTotal) {
            bookingTotal = parseFloat(booking.grandTotal.toString());
        } else if (booking.amount) {
            // Fallback: calculate from amount + tax if grandTotal is missing
            const baseAmount = parseFloat(booking.amount.toString());
            const taxAmount = booking.tax?.totalTax ? parseFloat(booking.tax.totalTax.toString()) : 0;
            bookingTotal = baseAmount + taxAmount;
        } else {
            return res.status(400).json({
                status: false,
                message: "Booking total amount is not properly set. Please complete booking details."
            });
        }

        // Validate minimum order value
        // if (bookingTotal < coupon.minValue) {
        //     return res.status(400).json({
        //         status: false,
        //         message: `Minimum order value of ₹${coupon.minValue} not met. Current total: ₹${bookingTotal.toFixed(2)}`
        //     });
        // }

        // Calculate discount
        const discountAmount = parseFloat(((bookingTotal * coupon.discount) / 100).toFixed(2));
        
        // Validate discount does not exceed total
        if (discountAmount > bookingTotal) {
            return res.status(400).json({
                status: false,
                message: "Discount amount exceeds booking total."
            });
        }

        const discountedTotal = parseFloat((bookingTotal - discountAmount).toFixed(2));

        // Update booking with coupon
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                $set: {
                    isCouponApplied: true,
                    originalTotal: bookingTotal,
                    discountAmount: discountAmount,
                    discountedTotal: discountedTotal,
                    appliedCoupon: {
                        couponCode: coupon.couponCode,
                        discount: coupon.discount,
                        minValue: coupon.minValue
                    }
                }
            },
            { new: true }
        );

        return res.status(200).json({
            status: true,
            message: "Coupon applied successfully.",
            booking: {
                originalTotal: bookingTotal,
                discountAmount: discountAmount,
                discountedTotal: discountedTotal,
                isCouponApplied: updatedBooking.isCouponApplied,
                appliedCoupon: updatedBooking.appliedCoupon
            }
        });
    } catch (error) {
        console.error("Error applying coupon code:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while applying the coupon."
        });
    }
};
