
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const user = await User.findOne({ email: 'artsoc@iiit.ac.in' });
        if (user) {
            console.log('User found:', user.email);
            console.log('Role:', user.role);
            console.log('Reset Request Status:', user.resetRequest);
            console.log('Reset History:', JSON.stringify(user.resetHistory, null, 2));
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
