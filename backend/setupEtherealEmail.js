// Run this script to generate test email credentials for development
// Usage: node setupEtherealEmail.js

const nodemailer = require('nodemailer');

async function createTestAccount() {
  try {
    console.log('🔧 Creating test email account with Ethereal...\n');
    
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Test account created successfully!\n');
    console.log('📧 Test Email Credentials:');
    console.log('================================');
    console.log('Host:', testAccount.smtp.host);
    console.log('Port:', testAccount.smtp.port);
    console.log('Secure:', testAccount.smtp.secure);
    console.log('User:', testAccount.user);
    console.log('Pass:', testAccount.pass);
    console.log('================================\n');
    
    console.log('📋 Add these to your .env file:');
    console.log('================================');
    console.log(`EMAIL_HOST=${testAccount.smtp.host}`);
    console.log(`EMAIL_PORT=${testAccount.smtp.port}`);
    console.log(`EMAIL_SECURE=${testAccount.smtp.secure}`);
    console.log(`EMAIL_USER=${testAccount.user}`);
    console.log(`EMAIL_PASS=${testAccount.pass}`);
    console.log(`EMAIL_FROM="Test Events <${testAccount.user}>"`);
    console.log('================================\n');
    
    console.log('ℹ️  Preview URLs will be logged when emails are sent');
    console.log('ℹ️  View emails at: https://ethereal.email/messages\n');
    
  } catch (error) {
    console.error('❌ Error creating test account:', error);
  }
}

createTestAccount();
