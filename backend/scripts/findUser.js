
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

console.log('Connecting to DB...');
// console.log('URI:', process.env.MONGO_URI); // Don't log sensitive info

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected!');
        try {
            const user = await User.findOne({ email: 'artsoc@iiit.ac.in' });
            if (user) {
                console.log('User found:', user.email, user.role);
            } else {
                console.log('User NOT found: artsoc@iiit.ac.in');
            }

            const allUsers = await User.find({ role: 'Organizer' });
            console.log('All Organizers:', allUsers.map(u => u.email));
        } catch (err) {
            console.error('Error querying:', err);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
