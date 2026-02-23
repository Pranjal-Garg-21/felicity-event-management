const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Email providers configuration in order of priority
const getTransporterConfigs = () => {
  const configs = [];

  // 1. Brevo (Preferred)
  if (process.env.BREVO_SMTP_KEY && process.env.BREVO_SENDER_EMAIL) {
    configs.push({
      name: 'Brevo SMTP',
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SENDER_EMAIL,
        pass: process.env.BREVO_SMTP_KEY
      }
    });
  }

  // 2. Gmail / Generic SMTP (Fallback)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    configs.push({
      name: 'Gmail/Fallback SMTP',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  return configs;
};

/**
 * Robust email sender that tries multiple transport configurations
 * if the primary one fails.
 */
const sendMailRobustly = async (mailOptions) => {
  const configs = getTransporterConfigs();

  if (configs.length === 0) {
    console.error('❌ No email providers configured');
    return { success: false, error: 'No email providers configured' };
  }

  let lastError = null;

  for (const config of configs) {
    try {
      console.log(`📡 Attempting to send email via ${config.name}...`);

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: config.tls
      });

      // Verify connection
      await transporter.verify();

      // Override 'from' if it's a specific provider that requires a fixed sender
      if (config.name === 'Brevo SMTP') {
        mailOptions.from = `"Felicity Events" <${process.env.BREVO_SENDER_EMAIL}>`;
      } else if (config.name === 'Gmail/Fallback SMTP') {
        mailOptions.from = `"Felicity Events" <${process.env.EMAIL_USER}>`;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully via ${config.name}! Message ID: ${info.messageId}`);

      return {
        success: true,
        provider: config.name,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error(`⚠️ ${config.name} failed:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }

  console.error('❌ All email providers failed to send email.');
  return {
    success: false,
    error: lastError ? lastError.message : 'Unknown error'
  };
};

// Legacy support for createTransporter if needed elsewhere
const createTransporter = () => {
  const configs = getTransporterConfigs();
  if (configs.length === 0) return null;

  // Return the first available config as a transporter
  const config = configs[0];
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: config.tls
  });
};

// Generate ticket HTML template
const generateTicketHTML = (ticketData) => {
  const {
    participantName,
    participantEmail,
    eventName,
    eventType,
    eventDate,
    eventTime,
    venue,
    organizerName,
    registrationFee,
    ticketId,
    eligibility,
    qrDataUrl
  } = ticketData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .ticket-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-bottom: 20px;
        }
        .ticket-header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
        }
        .ticket-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .ticket-header p {
          margin: 5px 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .ticket-body {
          background: white;
          border-radius: 10px;
          padding: 25px;
        }
        .ticket-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        .ticket-row:last-child {
          border-bottom: none;
        }
        .ticket-label {
          font-weight: 600;
          color: #666;
        }
        .ticket-value {
          color: #333;
          font-weight: 500;
          text-align: right;
        }
        .ticket-id {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin-top: 20px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          letter-spacing: 1px;
          color: #667eea;
          font-weight: 700;
        }
        .important-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin-top: 20px;
          border-radius: 5px;
        }
        .important-note h3 {
          margin: 0 0 10px 0;
          color: #856404;
          font-size: 16px;
        }
        .important-note p {
          margin: 0;
          color: #856404;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .emoji {
          font-size: 24px;
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="ticket-header">
          <div class="emoji">🎟️</div>
          <h1>Event Registration Confirmed!</h1>
          <p>Your ticket for ${eventName}</p>
        </div>
        
        <div class="ticket-body">
          <div class="ticket-row">
            <span class="ticket-label">👤 Participant Name:</span>
            <span class="ticket-value">${participantName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">📧 Email:</span>
            <span class="ticket-value">${participantEmail}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">🎭 Event:</span>
            <span class="ticket-value">${eventName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">📅 Date:</span>
            <span class="ticket-value">${eventDate}</span>
          </div>
          ${eventTime ? `
          <div class="ticket-row">
            <span class="ticket-label">🕒 Time:</span>
            <span class="ticket-value">${eventTime}</span>
          </div>
          ` : ''}
          <div class="ticket-row">
            <span class="ticket-label">📍 Venue:</span>
            <span class="ticket-value">${venue || 'TBA'}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">🎪 Organizer:</span>
            <span class="ticket-value">${organizerName}</span>
          </div>
          ${eventType ? `
          <div class="ticket-row">
            <span class="ticket-label">🎯 Type:</span>
            <span class="ticket-value">${eventType}</span>
          </div>
          ` : ''}
          ${eligibility ? `
          <div class="ticket-row">
            <span class="ticket-label">✅ Eligibility:</span>
            <span class="ticket-value">${eligibility}</span>
          </div>
          ` : ''}
          <div class="ticket-row">
            <span class="ticket-label">💰 Registration Fee:</span>
            <span class="ticket-value">₹${registrationFee || 0}</span>
          </div>
          
            <div class="ticket-id">
              TICKET ID: ${ticketId}
            </div>
            ${qrDataUrl ? `
            <div style="text-align:center; margin-top:20px; padding:15px; background:#f8f9ff; border-radius:10px; border:1px solid #e0e7ff;">
              <p style="margin:0 0 10px 0; font-weight:700; color:#667eea; font-size:14px;">📱 Your QR Ticket</p>
              <img src="cid:ticket_qr" alt="Ticket QR Code" width="200" height="200" style="display:block; margin:0 auto; border-radius:8px; border:2px solid #667eea;" />
              <p style="margin:10px 0 0 0; font-size:11px; color:#888;">Show this QR code at the venue for verification</p>
            </div>
            ` : ''}
        </div>
      </div>
      
      <div class="important-note">
        <h3>⚠️ Important Instructions</h3>
        <p>• Please carry this ticket (printed or digital) to the event venue</p>
        <p>• Arrive at least 15 minutes before the event starts</p>
        <p>• Keep your Ticket ID handy for verification</p>
        <p>• For any queries, contact the event organizer</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply to this email.</p>
        <p>© ${new Date().getFullYear()} Campus Event Management System</p>
      </div>
    </body>
    </html>
  `;
};

// Send event ticket email
const sendEventTicket = async (participantData, eventData) => {
  try {
    console.log('📨 Attempting to send email to:', participantData.email);

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log('🎟️ Generated Ticket ID:', ticketId);

    // Format date and time
    const eventDate = new Date(eventData.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTime = eventData.startDate ?
      `${new Date(eventData.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(eventData.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : null;

    const ticketData = {
      participantName: `${participantData.firstName} ${participantData.lastName}`,
      participantEmail: participantData.email,
      eventName: eventData.name,
      eventType: eventData.type,
      eventDate: eventDate,
      eventTime: eventTime,
      venue: eventData.venue,
      organizerName: eventData.organizerName,
      registrationFee: eventData.registrationFee,
      eligibility: eventData.eligibility,
      ticketId: ticketId,
      qrDataUrl: null
    };

    // Generate QR code
    let qrBuffer = null;
    try {
      const qrPayload = JSON.stringify({
        ticketId,
        eventId: eventData.id || eventData._id,
        email: participantData.email,
        eventName: eventData.name,
        type: eventData.type
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#667eea', light: '#ffffff' }
      });
      ticketData.qrDataUrl = qrDataUrl;
      qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400 });
      console.log('✅ QR code generated successfully');
    } catch (qrErr) {
      console.error('❌ QR generation failed:', qrErr.message);
    }

    // Prepare mail options
    const mailOptions = {
      to: participantData.email,
      subject: `🎟️ Event Ticket - ${eventData.name}`,
      html: generateTicketHTML(ticketData),
      text: `Event Registration Confirmed! Ticket ID: ${ticketId}`
    };

    if (qrBuffer) {
      mailOptions.attachments = [{
        filename: `ticket-qr-${ticketId}.png`,
        content: qrBuffer,
        contentType: 'image/png',
        cid: 'ticket_qr'
      }];
    }

    // Send robustly
    const result = await sendMailRobustly(mailOptions);

    if (result.success) {
      return {
        success: true,
        ticketId: ticketId,
        messageId: result.messageId,
        provider: result.provider
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }

  } catch (error) {
    console.error('❌ Error in sendEventTicket:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate team ticket HTML template
const generateTeamTicketHTML = (ticketData) => {
  const {
    memberName,
    memberEmail,
    teamName,
    pocName,
    pocEmail,
    allMembers,
    eventName,
    eventDate,
    eventTime,
    venue,
    organizerName,
    registrationFee,
    totalFee,
    ticketId,
    eligibility,
    qrDataUrl
  } = ticketData;

  const membersList = allMembers.map(m => `<li style="padding:4px 0;">${m.name} (${m.email})</li>`).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .ticket-container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 20px; }
        .ticket-header { text-align: center; color: white; margin-bottom: 30px; }
        .ticket-header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .ticket-header p { margin: 5px 0; font-size: 16px; opacity: 0.9; }
        .ticket-body { background: white; border-radius: 10px; padding: 25px; }
        .ticket-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-label { font-weight: 600; color: #666; }
        .ticket-value { color: #333; font-weight: 500; text-align: right; }
        .ticket-id { background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 1px; color: #667eea; font-weight: 700; }
        .team-section { background: #f0f4ff; border-radius: 8px; padding: 15px; margin-top: 15px; border-left: 4px solid #667eea; }
        .team-section h3 { margin: 0 0 10px 0; color: #667eea; font-size: 16px; }
        .team-section ul { margin: 0; padding-left: 20px; }
        .important-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px; }
        .important-note h3 { margin: 0 0 10px 0; color: #856404; font-size: 16px; }
        .important-note p { margin: 0; color: #856404; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .emoji { font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="ticket-header">
          <div class="emoji">👥🎟️</div>
          <h1>Team Registration Confirmed!</h1>
          <p>Your team ticket for ${eventName}</p>
        </div>
        
        <div class="ticket-body">
          <div class="ticket-row">
            <span class="ticket-label">👤 Member Name:</span>
            <span class="ticket-value">${memberName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">📧 Email:</span>
            <span class="ticket-value">${memberEmail}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">👥 Team Name:</span>
            <span class="ticket-value">${teamName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">🎭 Event:</span>
            <span class="ticket-value">${eventName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">📅 Date:</span>
            <span class="ticket-value">${eventDate}</span>
          </div>
          ${eventTime ? `
          <div class="ticket-row">
            <span class="ticket-label">🕒 Time:</span>
            <span class="ticket-value">${eventTime}</span>
          </div>
          ` : ''}
          <div class="ticket-row">
            <span class="ticket-label">📍 Venue:</span>
            <span class="ticket-value">${venue || 'TBA'}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">🎪 Organizer:</span>
            <span class="ticket-value">${organizerName}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">📞 POC:</span>
            <span class="ticket-value">${pocName} (${pocEmail})</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">💰 Total Team Fee:</span>
            <span class="ticket-value">₹${totalFee || 0}</span>
          </div>
          
          <div class="team-section">
            <h3>👥 Team Members</h3>
            <ul>${membersList}</ul>
          </div>
          
          <div class="ticket-id">
            TICKET ID: ${ticketId}
          </div>
          ${qrDataUrl ? `
          <div style="text-align:center; margin-top:20px; padding:15px; background:#f8f9ff; border-radius:10px; border:1px solid #e0e7ff;">
            <p style="margin:0 0 10px 0; font-weight:700; color:#667eea; font-size:14px;">📱 Your QR Ticket</p>
            <img src="cid:ticket_qr" alt="Ticket QR Code" width="200" height="200" style="display:block; margin:0 auto; border-radius:8px; border:2px solid #667eea;" />
            <p style="margin:10px 0 0 0; font-size:11px; color:#888;">Show this QR code at the venue for verification</p>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="important-note">
        <h3>⚠️ Important Instructions</h3>
        <p>• All team members must carry this ticket (printed or digital) to the venue</p>
        <p>• Arrive at least 15 minutes before the event starts</p>
        <p>• Keep your Ticket ID handy for verification</p>
        <p>• For any queries, contact the event organizer or your team POC</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply to this email.</p>
        <p>© ${new Date().getFullYear()} Campus Event Management System</p>
      </div>
    </body>
    </html>
  `;
};

// Send team event ticket emails to all team members
const sendTeamEventTickets = async (teamData, eventData) => {
  try {
    console.log('📨 Sending team tickets for team:', teamData.teamName);

    // Format date and time
    const eventDate = new Date(eventData.startDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const eventTime = eventData.startDate
      ? `${new Date(eventData.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(eventData.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : null;

    const results = [];

    // Send email to each team member
    for (const member of teamData.members) {
      try {
        const memberTicketId = member.ticketId;
        let qrDataUrl = null;
        let qrBuffer = null;

        try {
          const qrPayload = JSON.stringify({
            ticketId: memberTicketId,
            eventId: eventData.id || eventData._id,
            email: member.email,
            teamName: teamData.teamName,
            eventName: eventData.name,
            type: 'Team'
          });
          qrDataUrl = await QRCode.toDataURL(qrPayload, {
            type: 'image/png', width: 300, margin: 2,
            color: { dark: '#667eea', light: '#ffffff' }
          });
          qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400 });
        } catch (qrErr) {
          console.error(`❌ QR generation failed for ${member.email}:`, qrErr.message);
        }

        const ticketData = {
          memberName: member.name,
          memberEmail: member.email,
          teamName: teamData.teamName,
          pocName: teamData.pocName,
          pocEmail: teamData.pocEmail,
          allMembers: teamData.members,
          eventName: eventData.name,
          eventDate,
          eventTime,
          venue: eventData.venue,
          organizerName: eventData.organizerName,
          registrationFee: eventData.registrationFee,
          totalFee: teamData.totalFee,
          ticketId: memberTicketId,
          eligibility: eventData.eligibility,
          qrDataUrl
        };

        const mailOptions = {
          to: member.email,
          subject: `👥🎟️ Team Ticket - ${eventData.name} | Team: ${teamData.teamName}`,
          html: generateTeamTicketHTML(ticketData),
          text: `Team Ticket Confirmed! Ticket ID: ${memberTicketId}`
        };

        if (qrBuffer) {
          mailOptions.attachments = [{
            filename: `team-ticket-qr-${memberTicketId}.png`,
            content: qrBuffer,
            contentType: 'image/png',
            cid: 'ticket_qr'
          }];
        }

        const result = await sendMailRobustly(mailOptions);
        results.push({ email: member.email, success: result.success, messageId: result.messageId, provider: result.provider });
      } catch (memberErr) {
        console.error(`❌ Member error ${member.email}:`, memberErr.message);
        results.push({ email: member.email, success: false, error: memberErr.message });
      }
    }

    const sentCount = results.filter(r => r.success).length;
    return {
      success: sentCount > 0,
      sentCount,
      totalMembers: teamData.members.length,
      results
    };
  } catch (error) {
    console.error('❌ Error in sendTeamEventTickets:', error);
    return { success: false, error: error.message };
  }
};

// Send team invitation email
const sendTeamInvitation = async (invitationData) => {
  try {
    const {
      memberEmail,
      teamName,
      eventName,
      inviteLink
    } = invitationData;

    const mailOptions = {
      to: memberEmail,
      subject: `🎯 Team Invitation: ${teamName} - ${eventName}`,
      html: generateInvitationEmailHTML(invitationData) // Helper function added below
    };

    const result = await sendMailRobustly(mailOptions);

    if (result.success) {
      console.log(`✅ Team invitation email sent to ${memberEmail} via ${result.provider}`);
      return { success: true, messageId: result.messageId, provider: result.provider };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`❌ Error in sendTeamInvitation:`, error);
    return { success: false, error: error.message };
  }
};

// Helper for invitation HTML (moved original logic here)
const generateInvitationEmailHTML = (invitationData) => {
  const {
    memberEmail,
    memberName,
    teamName,
    teamLeaderName,
    teamLeaderEmail,
    eventName,
    eventDate,
    eventVenue,
    inviteCode,
    inviteLink,
    registrationFee
  } = invitationData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .invite-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .invite-code { background: #667eea; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .footer { background: #f8f9ff; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>👥 Team Invitation</h1></div>
        <div class="content">
          <p>Hi ${memberName || 'there'},</p>
          <p><strong>${teamLeaderName}</strong> has invited you to join <strong>"${teamName}"</strong> for <strong>${eventName}</strong>.</p>
          <div class="invite-box">
            <div class="info-row"><strong>Event:</strong><span>${eventName}</span></div>
            <div class="info-row"><strong>Team:</strong><span>${teamName}</span></div>
            <div class="info-row"><strong>Date:</strong><span>${new Date(eventDate).toLocaleDateString()}</span></div>
            ${eventVenue ? `<div class="info-row"><strong>Venue:</strong><span>${eventVenue}</span></div>` : ''}
          </div>
          <div class="invite-code">${inviteCode}</div>
          <div style="text-align: center;"><a href="${inviteLink}" class="button" style="color:white;">✅ Accept Invitation</a></div>
        </div>
        <div class="footer"><p>Campus Event Management System</p></div>
      </div>
    </body>
    </html>
  `;
};

// Send Event Cancellation Email
const sendEventCancellationEmail = async (event, participantEmail, participantName) => {
  try {
    const mailOptions = {
      to: participantEmail,
      subject: `🚫 Event Cancelled: ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background-color: #f44336; color: white; padding: 25px; text-align: center; }
            .content { padding: 30px; }
            .details { background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ef5350; }
            .footer { background-color: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1 style="margin:0;">🚫 Event Cancelled</h1></div>
            <div class="content">
              <p>Hi <strong>${participantName || 'Participant'}</strong>,</p>
              <p>The event <strong>"${event.name}"</strong> has been cancelled.</p>
              <div class="details">
                <p>📅 <strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p>📍 <strong>Venue:</strong> ${event.venue}</p>
              </div>
              <p>We apologize for any inconvenience caused.</p>
            </div>
            <div class="footer"><p>Campus Event Management System</p></div>
          </div>
        </body>
        </html>
      `
    };

    const result = await sendMailRobustly(mailOptions);
    return { success: result.success, messageId: result.messageId, provider: result.provider };
  } catch (error) {
    console.error(`❌ Error in sendEventCancellationEmail:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEventTicket,
  sendTeamEventTickets,
  sendTeamInvitation,
  sendEventCancellationEmail
};
