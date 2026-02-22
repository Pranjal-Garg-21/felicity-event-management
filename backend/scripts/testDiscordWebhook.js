const { sendEventToDiscord } = require('../utils/discordWebhook');
require('dotenv').config();

const testWebhook = async () => {
    // Use URL from argument or fallback to a dummy/placeholder
    const webhookUrl = process.argv[2];

    if (!webhookUrl) {
        console.error('❌ Please provide a Discord Webhook URL as an argument.');
        console.log('Usage: node scripts/testDiscordWebhook.js YOUR_WEBHOOK_URL');
        process.exit(1);
    }

    const mockEvent = {
        name: "🚀 Felicity Test Event",
        description: "This is a test notification to verify the Discord Webhook integration. Felicity Event Management System is ready to notify your community!",
        type: "Normal",
        registrationFee: 0,
        registrationLimit: 500,
        venue: "Main Campus Auditorium",
        startDate: new Date(),
        registrationDeadline: new Date(Date.now() + 86400000), // tomorrow
        eligibility: "Both IIIT & Non-IIIT",
        tags: ["Test", "Notification", "Bot"]
    };

    const organizerName = "Felicity Team";

    console.log('🧪 Testing Discord Webhook...');
    console.log(`🔗 URL: ${webhookUrl.substring(0, 50)}...`);

    const result = await sendEventToDiscord(webhookUrl, mockEvent, organizerName);

    if (result.success) {
        console.log('✅ Success! Check your Discord channel.');
    } else {
        console.log('❌ Failed:', result.error);
    }
};

testWebhook();
