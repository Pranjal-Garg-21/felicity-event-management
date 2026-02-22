const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Create email transporter
const createTransporter = () => {
  // Check for Brevo credentials (Preferred for Deployed Version)
  if (process.env.BREVO_SMTP_KEY && process.env.BREVO_SENDER_EMAIL) {
    console.log('📧 Using Brevo SMTP for production-grade email delivery');
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.BREVO_SENDER_EMAIL,
        pass: process.env.BREVO_SMTP_KEY
      }
    });
  }

  // Fallback to Gmail or generic SMTP if provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('📧 Using SMTP (Gmail/Generic) with user:', process.env.EMAIL_USER);

    return nodemailer.createTransport({
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
  } else {
    console.log('⚠️ No email credentials found (BREVO_SMTP_KEY or EMAIL_USER), email sending disabled');
    return null;
  }
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

    const transporter = createTransporter();

    if (!transporter) {
      console.log('⚠️ Email transporter not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

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

    // Generate QR code as base64 data URL for all event types
    let qrBuffer = null;
    try {
      const qrPayload = JSON.stringify({
        ticketId,
        eventId: eventData.id || eventData._id,
        email: participantData.email,
        eventName: eventData.name,
        type: eventData.type
      });

      // Generate as data URL for embedding in HTML (works in all email clients)
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#667eea', light: '#ffffff' }
      });
      ticketData.qrDataUrl = qrDataUrl;

      // Also generate buffer for file attachment
      qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400 });
      console.log('✅ QR code generated successfully, data URL length:', qrDataUrl.length);
    } catch (qrErr) {
      console.error('❌ QR generation failed:', qrErr.message);
    }

    // Prepare mail options with QR embedded in HTML
    const mailOptions = {
      from: `"Felicity Events" <${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER}>`,
      to: participantData.email,
      subject: `🎟️ Event Ticket - ${eventData.name}`,
      html: generateTicketHTML(ticketData),
      text: `
        Event Registration Confirmed!
        
        Ticket ID: ${ticketId}
        Participant: ${ticketData.participantName}
        Email: ${participantData.email}
        Event: ${eventData.name}
        Date: ${eventDate}
        ${eventTime ? `Time: ${eventTime}` : ''}
        Venue: ${eventData.venue || 'TBA'}
        Organizer: ${eventData.organizerName}
        Registration Fee: ₹${eventData.registrationFee || 0}
        
        Important: Please carry this ticket to the event venue.
        
        This is an automated email. Please do not reply.
      `
    };

    // Attach QR as inline CID image (works in Gmail) + downloadable file
    if (qrBuffer) {
      mailOptions.attachments = [
        {
          filename: `ticket-qr-${ticketId}.png`,
          content: qrBuffer,
          contentType: 'image/png',
          cid: 'ticket_qr' // Referenced in HTML as <img src="cid:ticket_qr">
        }
      ];
    }

    console.log('📤 Sending email...');

    // Verify transporter connection first
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      return {
        success: false,
        error: `SMTP connection failed: ${verifyError.message}`
      };
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('� Response:', info.response);

    return {
      success: true,
      ticketId: ticketId,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending ticket email:', error);
    console.error('Error details:', error.message);

    // Don't throw error - registration should succeed even if email fails
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
    console.log('📨 Attempting to send team tickets for team:', teamData.teamName);

    const transporter = createTransporter();

    if (!transporter) {
      console.log('⚠️ Email transporter not configured');
      return { success: false, error: 'Email service not configured' };
    }

    // Verify transporter connection first
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified for team emails');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      return { success: false, error: `SMTP connection failed: ${verifyError.message}` };
    }

    // Generate a shared ticket ID for the team - REMOVED to use individual tickets
    // const ticketId = `TEAM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // console.log('🎟️ Generated Team Ticket ID:', ticketId);

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
        // Use individual ticket ID from member data
        const memberTicketId = member.ticketId;

        // Generate QR for this member
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
          console.log(`✅ QR generated for team member: ${member.email} (TicketID: ${memberTicketId})`);
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
          from: `"Felicity Events" <${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER}>`,
          to: member.email,
          subject: `👥🎟️ Team Ticket - ${eventData.name} | Team: ${teamData.teamName}`,
          html: generateTeamTicketHTML(ticketData),
          text: `
            Team Registration Confirmed!
            
            Ticket ID: ${memberTicketId}
            Team: ${teamData.teamName}
            Member: ${member.name} (${member.email})
            Event: ${eventData.name}
            Date: ${eventDate}
            ${eventTime ? `Time: ${eventTime}` : ''}
            Venue: ${eventData.venue || 'TBA'}
            Organizer: ${eventData.organizerName}
            POC: ${teamData.pocName} (${teamData.pocEmail})
            Total Fee: ₹${teamData.totalFee || 0}
            
            Team Members: ${teamData.members.map(m => `${m.name} (${m.email})`).join(', ')}
            
            Important: All team members must carry this ticket to the event venue.
          `
        };

        // Attach QR as inline CID image (works in Gmail) + downloadable file
        if (qrBuffer) {
          mailOptions.attachments = [
            {
              filename: `team-ticket-qr-${memberTicketId}.png`,
              content: qrBuffer,
              contentType: 'image/png',
              cid: 'ticket_qr' // Referenced in HTML as <img src="cid:ticket_qr">
            }
          ];
        }

        console.log(`📤 Sending team ticket to: ${member.name} <${member.email}>...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${member.email}, Message ID: ${info.messageId}`);
        results.push({ email: member.email, success: true, messageId: info.messageId });
      } catch (memberErr) {
        console.error(`❌ Failed to send email to ${member.email}:`, memberErr.message);
        results.push({ email: member.email, success: false, error: memberErr.message });
      }
    }

    const allSent = results.every(r => r.success);
    const sentCount = results.filter(r => r.success).length;
    console.log(`📧 Team emails: ${sentCount}/${teamData.members.length} sent successfully`);

    return {
      success: allSent,
      partial: !allSent && sentCount > 0,

      sentCount,
      totalMembers: teamData.members.length,
      results
    };

  } catch (error) {
    console.error('❌ Error sending team ticket emails:', error);
    return { success: false, error: error.message };
  }
};

// Send team invitation email
const sendTeamInvitation = async (invitationData) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('⚠️ Email transporter not available, skipping invitation email');
      return { success: false, message: 'Email service not configured' };
    }

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

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px;
          }
          .invite-box {
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .invite-code {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 3px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .footer {
            background: #f8f9ff;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👥 Team Invitation</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #333;">
              Hi ${memberName || 'there'},
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              <strong>${teamLeaderName}</strong> (${teamLeaderEmail}) has invited you to join their team 
              <strong>"${teamName}"</strong> for the event <strong>${eventName}</strong>.
            </p>
            
            <div class="invite-box">
              <h3 style="margin-top: 0; color: #667eea;">📋 Event Details</h3>
              <div class="info-row">
                <strong>Event:</strong>
                <span>${eventName}</span>
              </div>
              <div class="info-row">
                <strong>Team:</strong>
                <span>${teamName}</span>
              </div>
              <div class="info-row">
                <strong>Team Leader:</strong>
                <span>${teamLeaderName}</span>
              </div>
              <div class="info-row">
                <strong>Date:</strong>
                <span>${new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</span>
              </div>
              ${eventVenue ? `
              <div class="info-row">
                <strong>Venue:</strong>
                <span>${eventVenue}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <strong>Registration Fee:</strong>
                <span>₹${registrationFee || 0} per member</span>
              </div>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-top: 20px;">
              <strong>Your Invite Code:</strong>
            </p>
            <div class="invite-code">
              ${inviteCode}
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Use this code to accept your invitation
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button" style="color: white;">
                ✅ Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              <strong>What happens next?</strong><br>
              • Click the button above or use the invite code<br>
              • You'll be added to the team<br>
              • Once all members accept, tickets will be generated<br>
              • You'll receive your event ticket via email
            </p>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              If you don't want to join this team, you can safely ignore this email.
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from the Event Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Event Management System" <${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@events.com'}>`,
      to: memberEmail,
      subject: `🎯 Team Invitation: ${teamName} - ${eventName}`,
      html: emailHTML
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Team invitation email sent to ${memberEmail}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error(`❌ Error sending team invitation to ${invitationData.memberEmail}:`, error);
    return { success: false, error: error.message };
  }
};

// Send Event Cancellation Email
const sendEventCancellationEmail = async (event, participantEmail, participantName) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Transporter not configured' };

    const mailOptions = {
      from: `"Felicity Events" <${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER}>`,
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
            <div class="header">
              <h1 style="margin:0;">🚫 Event Cancelled</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${participantName || 'Participant'}</strong>,</p>
              
              <p>We regret to inform you that the event <strong>"${event.name}"</strong> scheduled for <strong>${new Date(event.startDate).toLocaleDateString()}</strong> has been cancelled by the organizer.</p>
              
              <div class="details">
                <h3 style="margin-top:0; color:#c62828;">Event Details:</h3>
                <p style="margin:5px 0;">📅 <strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p style="margin:5px 0;">📍 <strong>Venue:</strong> ${event.venue}</p>
                <p style="margin:5px 0;">🎪 <strong>Organizer:</strong> ${event.organizer?.organizerName || 'Available on Dashboard'}</p>
              </div>

              <p>Since this was a free event, no refund is required. We apologize for any inconvenience caused and hope to see you at future events.</p>
              
              <p>If you have any questions, please contact the organizer directly.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply.</p>
              <p>© ${new Date().getFullYear()} Campus Event Management System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Cancellation email sent to ${participantEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Error sending cancellation email to ${participantEmail}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEventTicket,
  sendTeamEventTickets,
  sendTeamInvitation,
  sendEventCancellationEmail
};
