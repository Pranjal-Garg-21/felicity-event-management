const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://felicity_db:Garg2006@cluster0.5jojd.mongodb.net/?appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./models/User');
const Event = require('./models/Event');

async function runTest() {
  try {
    console.log('🚀 Starting Team Flow Test...');

    // 1. Find a team event
    let event = await Event.findOne({ type: 'Team' });
    if (!event) {
      console.log('⚠️ No dedicated "Team" type event found, looking for any event...');
      const events = await Event.find({});
      console.log(`Found ${events.length} total events:`);
      events.forEach(e => console.log(`- ${e.name} (${e.type}, ID: ${e._id})`));

      // Fallback to first available event regardless of type for debugging
      if (events.length > 0) event = events[0];
    }

    if (!event) {
      console.log('❌ Absolutely no events found in DB');
      process.exit(1);
    }
    console.log('✅ Using Event:', event.name, 'ID:', event._id, 'Type:', event.type);

    // 2. Find/Create Leader
    let leader = await User.findOne({ email: 'leader@test.com' });
    if (!leader) {
      leader = await User.create({
        firstName: 'Test', lastName: 'Leader', email: 'leader@test.com',
        password: 'password123', role: 'Participant', hasCompletedOnboarding: true
      });
    }

    // 3. Find/Create Member
    let member = await User.findOne({ email: 'member@test.com' });
    if (!member) {
      member = await User.create({
        firstName: 'Test', lastName: 'Member', email: 'member@test.com',
        password: 'password123', role: 'Participant', hasCompletedOnboarding: true
      });
    }

    console.log('👤 Leader:', leader.email, leader._id);
    console.log('👤 Member:', member.email, member._id);

    // 4. Force Create Tickets for Debugging if not present
    const addTicket = async (user, label) => {
      let ticket = user.eventTickets.find(t => t.eventId.toString() === event._id.toString());
      if (!ticket) {
        console.log(`✨ Creating ticket for ${label}...`);
        const crypto = require('crypto');
        const ticketId = `TICKET-${label.toUpperCase()}-${Date.now()}`;
        user.eventTickets.push({
          eventId: event._id,
          ticketId: ticketId,
          emailSent: true
        });
        await user.save();
        console.log(`✅ Created ${label} Ticket:`, ticketId);
      } else {
        console.log(`ℹ️ ${label} already has ticket:`, ticket.ticketId);
      }
    };

    await addTicket(leader, 'Leader');
    await addTicket(member, 'Member');

    // Refresh users
    leader = await User.findById(leader._id);
    member = await User.findById(member._id);

    console.log('\n🔍 Inspecting Member Tickets for Event:', event._id);
    // We'll skip actual API call and simulate DB operations here to inspect what *should* happen vs what *is* happening
    // OR verify existing tickets if any

    console.log('\n🔍 Inspecting Member Tickets for Event:', event._id);
    const memberWithTickets = await User.findById(member._id);
    const tickets = memberWithTickets.eventTickets.filter(t => t.eventId.toString() === event._id.toString());

    console.log('🎟️ Tickets found:', tickets.length);
    tickets.forEach(t => {
      console.log();
    });

    if (tickets.length > 0) {
      const ticketId = tickets[0].ticketId;
      console.log('\n🧪 Testing Scan Logic for Ticket:', ticketId);

      const userFound = await User.findOne({ 'eventTickets.ticketId': ticketId });
      console.log('User found by ticketId?', !!userFound);

      if (userFound) {
        const t = userFound.eventTickets.find(ticket => ticket.ticketId === ticketId);
        console.log('Ticket matched inside user?', !!t);
        console.log('Ticket Event ID matches?', t.eventId.toString() === event._id.toString());
        console.log('Event Organizer matches?', event.organizer.toString()); // Log organizer to check auth
      }
    }

  } catch (err) {
    console.error('❌ Test Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

runTest();
