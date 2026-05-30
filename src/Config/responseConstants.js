module.exports = {
    STATUS: {
        SUCCESS: true,
        FAIL: false,
    },

    MESSAGES: {
        // General messages
        SERVER_ERROR: "Internal Server Error",
        NOT_FOUND: "No data found",

        // User message
        INVALID_OTP: 'Invalid otp',
        OTP_EXPIRED: 'Otp expired. Please try again',

        // Tokem Message
        NO_TOKEN: 'No token provided, access denied',
        INVALID_TOKEN: 'Invalid or expired token',
        //Services message
        SERVICE_CREATED: "Service updated successfully",
        SERVICE_UPDATE: "Service updated successfully",
        SERVICE_ACTIVATE: "Service activated",
        SERVICE_DEACTIVATE: "Service De-activated",
        // Authentication messages
        INVALID_CREDENTIALS: "Invalid email or password",
        USER_ID: "Please provide user ID",
        LOGIN_SUCCESS: "Login successful",
        TOKEN_EXPIRED: "Refresh token expired",
        TOKEN_INVALID: "Invalid refresh token or user logged in on another device",

        // User management messages
        USER_NOT_FOUND: "User not found",
        ACCOUNT_EXISTS: "Account already exists!",
        ACCOUNT_CREATED: "Account created successfully",
        PROFILE_UPDATED: "Profile updated successfully",
        USER_ACTIVATED: "User activated",
        USER_DEACTIVATED: "User deactivated",

        // Validation messages
        REQUIRED_FIELDS: "Phone number, country code, and username are required",
        USER_ID_REQUIRED: "User ID is required",
        NAME_REQUIRED_FOR_BOOKING:  "Name is required for booking",

        // Booking management messages
        BOOKING_ID_REQUIRED: "Booking ID is required",
        BOOKING_NOT_FOUND: "Booking not found",
        ITEM_ADDED: "Order item added successfully",
        ITEM_UPDATED: "Order item updated successfully",
        MISSING_BOOKING_ID: "Missing booking ID",
        SERVICE_ID_REQUIRED: "Invalid or missing service ID",
        ADDRESS_ID_REQUIRED: "Address ID is required",
        VALID_ADDRESS_ID_REQUIRED: "Please provide valid address ID",
        SLOT_REQUIRED: "Slot is required",
        INVALID_DATE: "Invalid or missing date",
        BOOKING_AMOUNT: "Invalid or missing amount",
        BOOKING_CREATED: "Booking created successfully",
        BOOKING_UPDATED: "Booking updated successfully",

        // Technician management messages
        BOOKING_ID_AND_TECHNICIAN_ID_REQUIRED: "Booking Id and Technician Id are required",
        TECHNICIAN_NOT_AVAILABLE: "Technician is not available",
        TECHNICIAN_ASSIGNED_SUCCESS: "Technician assigned successfully",
        TECHNICIAN_NOT_FOUND: "Technician not found",
        TECHNICIAN_CREATED: "Technician added successfully",
        TECHNICIAN_UPDATED: "Technician updated successfully",
        TECHNICIAN_ID_REQUIRED: "Technician ID is required",
        TECHNICIAN_ACTIVATE: 'Technician activated',
        TECHNICIAN_DEACTIVATE: 'Technician deactivated',
        TECHNICIAN_PHONE_REQUIRED: 'Phone number is required',

        //Lead
        QUANTITY_REQUIRED: 'Quantity is required',
        PLACE_REQUIRED: 'Place is required',
        LEAD_SAVED: 'Lead saved successfully',


        // NOTIFICATION
        BOOKING_CREATE_NOTIFICATION: 'Order booked',
        PRODUCT_PURCHASE_NOTIFICATION: 'Product purchase request submitted',
        BOOKING_INVOICE_GENERATED: 'Invoice generated',
        BOOKING_TECHNICIAN_ASSIGNED: 'Hooray! Technician Assigned',
        BOOKING_COMPLETED: 'Hooray! Booking Completed',
        BOOKING_IN_PROGRESS: 'Booking is in Progress',
        BOOKING_CANCELLED: 'Booking is Cancelled',

        FREE_CONSULTANCY: 'your request for free consultation is received, we will assign an executive for you shortly.',
        AMC_REQUEST: 'your request for AMC is received, we will assign an executive for you shortly.',


        //Tools
        TOOL_CREATED: "Tool created successfully",
        TOOL_UPDATED: "Tool updated successfully",
        REQUIRED_FIELDS_MISSING_TOOLS: "Name, description, and image are required",
        TOOL_ID_REQUIRED: "Tool ID is required",
        TOOL_NOT_FOUND: "Tool not found",
        TOOL_REMOVED: "Tool removed successfully",

        //Tools Status Update
        TOOLS_STATUS_UPDATE: 'Tool request status updated',

        // Material
        MATERIAL_ID_REQUIRED: "Material ID is required",
        MATERIAL_NOT_FOUND: "Material not found",
        MATERIAL_UPDATED:"Material updated successfully"




    },
    
    CODES: {
        SUCCESS: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        NOT_FOUND: 404,
        SERVER_ERROR: 500,
        FORBIDDEN: 403,
    }
};
