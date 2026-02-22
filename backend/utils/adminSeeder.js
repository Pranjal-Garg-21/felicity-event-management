const User = require('../models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if any admin exists
        const adminExists = await User.findOne({ role: 'Admin' });

        if (!adminExists) {
            console.log('🛡️ No Admin found, creating default admin...');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            await User.create({
                email: adminEmail,
                password: hashedPassword,
                role: 'Admin',
                firstName: 'System',
                lastName: 'Admin',
                hasCompletedOnboarding: true
            });

            console.log(`✅ Default admin created: ${adminEmail}`);
        } else {
            console.log('🛡️ Admin account verified.');

            // Optional: Update existing admin password if it matches the email but password might be old
            // This ensures that if the user changes the ADMIN_PASSWORD environment variable, 
            // the existing admin gets the new password.
            if (adminExists.email === adminEmail && process.env.ADMIN_FORCE_UPDATE === 'true') {
                console.log('🛡️ Force updating admin credentials...');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(adminPassword, salt);
                adminExists.password = hashedPassword;
                await adminExists.save();
                console.log('✅ Admin credentials updated.');
            }
        }
    } catch (error) {
        console.error('❌ Error in Admin Seeder:', error.message);
    }
};

module.exports = seedAdmin;
