// Run this script ONCE to fix existing participant accounts
// Usage: node fixExistingUsers.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const fixExistingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Update all participants who don't have hasCompletedOnboarding set
    const result = await User.updateMany(
      { 
        role: 'Participant',
        hasCompletedOnboarding: { $exists: false }
      },
      { 
        $set: { hasCompletedOnboarding: false }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} participant accounts`);
    console.log('   All existing participants will now see onboarding on next login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixExistingUsers();
