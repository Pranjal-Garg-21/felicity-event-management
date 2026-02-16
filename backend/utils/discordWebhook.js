const axios = require('axios');

/**
 * Send a Discord webhook notification when a new event is published.
 * 
 * @param {string} webhookUrl - The Discord webhook URL
 * @param {object} event - The event object
 * @param {string} organizerName - The organizer's display name
 * @returns {object} { success: boolean, error?: string }
 */
const sendEventToDiscord = async (webhookUrl, event, organizerName) => {
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook URL configured' };
  }

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

    if (event.startDate) {
      fields.push({ 
        name: '🕐 Date', 
        value: new Date(event.startDate).toLocaleDateString('en-IN', { 
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

    console.log(`✅ Discord webhook sent for event: ${event.name}`);
    return { success: true };
  } catch (err) {
    console.error('❌ Discord webhook error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEventToDiscord };
