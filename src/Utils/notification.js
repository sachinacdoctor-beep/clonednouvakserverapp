const admin = require('firebase-admin');
const serviceAccount = require('../../notification.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

async function sendPushNotification(registrationToken, title, body) {
    // console.log("registrationToken",registrationToken);
    const message = {
        notification: {
            title: title || 'Default Title',
            body: body || 'Default Body',
        },
        token: registrationToken,
        android: {
            priority: 'high',
        },
        apns: {
            headers: {
                'apns-priority': '10',
            },
        },
    };

    console.log('Sending Notification with Payload:', message);
    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        // return response;
    } catch (error) {
        console.error('Error sending message:', error.errorInfo || error);
        // throw error;
    }
}


module.exports = { sendPushNotification };
