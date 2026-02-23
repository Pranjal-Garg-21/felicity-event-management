const axios = require('axios');

/**
 * Send a Discord webhook notification when a new event is published.
 * 
 * @param {string} webhookUrl - The Discord webhook URL
 * @param {object} event - The event object
 * @param {string} organizerName - The organizer's display name
 * @returns {object} { success: boolean, error?: string }
 */
const sendEventToDiscord = async (clubWebhookUrl, event, organizerName) => {
  // Use the global fixed webhook URL if defined in environment variables, 
  // otherwise fallback to the club-specific URL provided.
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || clubWebhookUrl;

  // Debug log to file
  const fs = require('fs');
  const logMsg = `[${new Date().toISOString()}] TRIGGERED: Event: ${event?.name}, Status: ${event?.status}, URL: ${webhookUrl ? 'SET' : 'MISSING'}\n`;
  fs.appendFileSync('discord_debug.log', logMsg);

  if (!webhookUrl) {
    console.log('ℹ️ Discord notifications disabled (No webhook URL found in process.env.DISCORD_WEBHOOK_URL)');
    return { success: false, error: 'No Discord webhook URL configured' };
  }

  console.log(`📡 Attempting to post event "${event.name}" to Discord...`);
  console.log(`🔗 Webhook URL (truncated): ${webhookUrl.substring(0, 50)}...`);

  try {
    // Build a rich embed for Discord
    const typeEmoji = event.type === 'Team' ? '👥' : event.type === 'Merchandise' ? '🛍️' : '📅';
    const feeText = event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free';

    const fields = [
      { name: '📅 Type', value: event.type || 'Normal', inline: true },
      { name: '💰 Fee', value: feeText, inline: true },
      { name: '👥 Spots', value: `${event.registrationLimit || 'Unlimited'}`, inline: true },
    ];

    if (event.venue) {
      fields.push({ name: '📍 Venue', value: event.venue, inline: true });
    }

    // Date logic: use eventSessions if legacy startDate is missing
    let displayDate = event.startDate;
    if (!displayDate && event.eventSessions && event.eventSessions.length > 0) {
      displayDate = event.eventSessions[0].startDate;
    }

    if (displayDate) {
      fields.push({
        name: '🕐 Date',
        value: new Date(displayDate).toLocaleDateString('en-IN', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        inline: true
      });
    }

    if (event.registrationDeadline) {
      fields.push({
        name: '⏰ Registration Deadline',
        value: new Date(event.registrationDeadline).toLocaleDateString('en-IN', {
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        inline: false
      });
    }

    if (event.eligibility) {
      fields.push({ name: '✅ Eligibility', value: event.eligibility, inline: false });
    }

    if (event.tags && event.tags.length > 0) {
      fields.push({ name: '🏷️ Tags', value: event.tags.join(', '), inline: false });
    }

    // Team event details
    if (event.type === 'Team' && event.teamDetails) {
      fields.push({
        name: '👥 Team Size',
        value: `${event.teamDetails.minTeamSize} - ${event.teamDetails.maxTeamSize} members`,
        inline: true
      });
    }

    const embed = {
      title: `${typeEmoji} ${event.name}`,
      description: event.description ? (event.description.length > 300 ? event.description.substring(0, 300) + '...' : event.description) : 'No description',
      color: event.type === 'Team' ? 0x9C27B0 : event.type === 'Merchandise' ? 0xFF9800 : 0x667eea,
      fields,
      footer: {
        text: `Published by ${organizerName || 'Organizer'} • Felicity Event Management`
      },
      timestamp: new Date().toISOString()
    };

    const payload = {
      username: 'Felicity Events Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3176/3176382.png',
      content: `🎉 **New Event Published!** Check it out:`,
      embeds: [embed]
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const successLog = `[${new Date().toISOString()}] SUCCESS: Event "${event.name}" posted to Discord\n`;
    fs.appendFileSync('discord_debug.log', successLog);
    console.log(`✅ Discord notification sent via ${process.env.DISCORD_WEBHOOK_URL ? 'Global' : 'Club'} Webhook for: ${event.name}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    const errorLog = `[${new Date().toISOString()}] ERROR: Event "${event.name}" failed to post. Error: ${errorMsg}\n`;
    fs.appendFileSync('discord_debug.log', errorLog);
    console.error('❌ Discord webhook error:', errorMsg);
    return { success: false, error: err.message };
  }
};

/**
 * Send a Discord notification for a forum announcement.
 * 
 * @param {object} event - The event object
 * @param {string} organizerName - The organizer's name
 * @param {string} content - The announcement content
 * @returns {object} { success: boolean, error?: string }
 */
const sendAnnouncementToDiscord = async (event, organizerName, content) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook URL configured' };
  }

  try {
    const embed = {
      title: `📢 New Announcement for ${event.name}`,
      description: content.length > 1000 ? content.substring(0, 1000) + '...' : content,
      color: 0xFF5722, // Vibrant Orange
      fields: [
        { name: '👤 From', value: organizerName || 'Organizer', inline: true },
        { name: '📅 Event', value: event.name, inline: true }
      ],
      footer: {
        text: 'Felicity Event Management • Forum Announcement'
      },
      timestamp: new Date().toISOString()
    };

    const payload = {
      username: 'Felicity Announcement Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
      content: `⚡ **New Announcement Post in ${event.name}!**`,
      embeds: [embed]
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ Discord announcement notification sent for event: ${event.name}`);
    return { success: true };
  } catch (err) {
    console.error('❌ Discord announcement webhook error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEventToDiscord, sendAnnouncementToDiscord };
