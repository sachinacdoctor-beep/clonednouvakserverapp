const mongoose = require('mongoose');
const {seedPointSystem,seedDefaultExpiryRules} = require('./seeder');

const connectDB = async () => {  
    try {
        console.log("MONGO_URI =", process.env.MONGOURL);

        await mongoose.connect(process.env.MONGOURL, {
        });

        await seedPointSystem()
        await seedDefaultExpiryRules(); 

        console.log('MongoDB connected successfully.');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
