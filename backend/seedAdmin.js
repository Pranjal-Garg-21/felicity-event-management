const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecting to DB to seed Admin...");

    // Check if an Admin already exists 
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      console.log("Admin account already exists!");
      process.exit();
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt); // Choose a strong password

    // Create the Admin user
    await User.create({
      email: 'admin@felicity.com', 
      password: hashedPassword,
      role: 'Admin',
      firstName: 'System',
      lastName: 'Admin'
    });

    console.log("Admin user created: admin@felicity.com / admin123");
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();