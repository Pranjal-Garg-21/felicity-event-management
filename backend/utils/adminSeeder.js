const User = require('../models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@felicity.com').toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        console.log(`🛡️ Checking for admin user: ${adminEmail}...`);

        // Check if the specific admin account already exists
        let adminAccount = await User.findOne({ email: adminEmail });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        if (!adminAccount) {
            console.log('🛡️ Admin account not found, creating it...');
            await User.create({
                email: adminEmail,
                password: hashedPassword,
                role: 'Admin',
                firstName: 'System',
                lastName: 'Admin',
                hasCompletedOnboarding: true
            });
            console.log(`✅ Admin account created successfully: ${adminEmail}`);
        } else {
            // Account exists - check if it's an Admin
            if (adminAccount.role !== 'Admin') {
                console.log(`🛡️ Account found but role is ${adminAccount.role}. Upgrading to Admin...`);
                adminAccount.role = 'Admin';
                await adminAccount.save();
            }

            // Check if we need to force update the password
            if (process.env.ADMIN_FORCE_UPDATE === 'true') {
                console.log('🛡️ Force updating admin password...');
                adminAccount.password = hashedPassword;
                await adminAccount.save();
                console.log('✅ Admin password updated successfully.');
            } else {
                console.log('🛡️ Admin account already exists and is verified.');
            }
        }

        // Double check if any other user has the Admin role just in case
        const totalAdmins = await User.countDocuments({ role: 'Admin' });
        console.log(`📊 Total Admin accounts in database: ${totalAdmins}`);

    } catch (error) {
        console.error('❌ Error in Admin Seeder:', error.message);
    }
};

module.exports = seedAdmin;
