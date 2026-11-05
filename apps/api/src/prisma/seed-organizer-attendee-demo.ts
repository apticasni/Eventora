import '../lib/loadEnv';
import bcrypt from 'bcryptjs';
import {
  BookingStatus,
  EventFormat,
  EventStatus,
  Prisma,
  PrismaClient,
  Role,
} from '@prisma/client';
import { issueTicketsIfMissing } from '../services/tickets';

const prisma = new PrismaClient();
const DEMO_MARKER = 'Eventora local organizer-attendee demo.';
const LOCAL_DATABASE = 'eventora_local';
const LOCAL_HOST = '127.0.0.1';
const LOCAL_PORT = '5433';

type DemoUser = {
  firstName: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  phone: string;
  interests: string[];
  city: string;
  state: string;
  company?: string;
};

const organizers: DemoUser[] = [
  {
    firstName: 'Ananya',
    name: 'Ananya Menon',
    email: 'ananya@malabarevents.example.com',
    role: 'ORGANIZER',
    bio: 'Founder of Malabar Events & Experiences, creating thoughtful cultural and business gatherings in Kochi.',
    phone: '+91 00000 41001',
    interests: ['Culture', 'Entrepreneurship', 'Community'],
    city: 'Kochi',
    state: 'Kerala',
    company: 'Malabar Events & Experiences',
  },
  {
    firstName: 'Rahul',
    name: 'Rahul Nair',
    email: 'rahul@nextwaveconferences.example.com',
    role: 'ORGANIZER',
    bio: 'Leads NextWave Conferences, bringing public-interest technology and product communities together in Thiruvananthapuram.',
    phone: '+91 00000 41002',
    interests: ['Technology', 'Public Service', 'Leadership'],
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    company: 'NextWave Conferences',
  },
  {
    firstName: 'Meera',
    name: 'Meera Thomas',
    email: 'meera@bloomcreativeevents.example.com',
    role: 'ORGANIZER',
    bio: 'Creative director at Bloom Creative Events, producing welcoming arts and design experiences in Kozhikode.',
    phone: '+91 00000 41003',
    interests: ['Arts', 'Design', 'Creative Learning'],
    city: 'Kozhikode',
    state: 'Kerala',
    company: 'Bloom Creative Events',
  },
  {
    firstName: 'Arjun',
    name: 'Arjun Varma',
    email: 'arjun@techbridgeevents.example.com',
    role: 'ORGANIZER',
    bio: 'Builds practical engineering and startup gatherings with TechBridge Events in Bengaluru.',
    phone: '+91 00000 41004',
    interests: ['Software', 'Startups', 'Open Source'],
    city: 'Bengaluru',
    state: 'Karnataka',
    company: 'TechBridge Events',
  },
  {
    firstName: 'Nisha',
    name: 'Nisha Joseph',
    email: 'nisha@horizonlearningevents.example.com',
    role: 'ORGANIZER',
    bio: 'Designs accessible learning experiences and career workshops at Horizon Learning & Events in Thrissur.',
    phone: '+91 00000 41005',
    interests: ['Education', 'Career Development', 'Accessibility'],
    city: 'Thrissur',
    state: 'Kerala',
    company: 'Horizon Learning & Events',
  },
];

const attendees: DemoUser[] = [
  {
    firstName: 'Aditi',
    name: 'Aditi Krishnan',
    email: 'aditi.attendee@example.com',
    role: 'ATTENDEE',
    bio: 'A curious product designer who enjoys practical workshops and meeting local creative communities.',
    phone: '+91 00000 42001',
    interests: ['Design', 'Technology', 'Arts'],
    city: 'Kochi',
    state: 'Kerala',
  },
  {
    firstName: 'Farhan',
    name: 'Farhan Ali',
    email: 'farhan.attendee@example.com',
    role: 'ATTENDEE',
    bio: 'An early-career analyst interested in responsible business, data, and community initiatives.',
    phone: '+91 00000 42002',
    interests: ['Business', 'Data', 'Community'],
    city: 'Kozhikode',
    state: 'Kerala',
  },
  {
    firstName: 'Diya',
    name: 'Diya Mathew',
    email: 'diya.attendee@example.com',
    role: 'ATTENDEE',
    bio: 'A visual storyteller who loves hands-on arts sessions and welcoming learning spaces.',
    phone: '+91 00000 42003',
    interests: ['Photography', 'Arts', 'Education'],
    city: 'Thiruvananthapuram',
    state: 'Kerala',
  },
  {
    firstName: 'Kiran',
    name: 'Kiran Das',
    email: 'kiran.attendee@example.com',
    role: 'ATTENDEE',
    bio: 'A software developer exploring open source, cloud tools, and thoughtful product engineering.',
    phone: '+91 00000 42004',
    interests: ['Software', 'Open Source', 'Startups'],
    city: 'Bengaluru',
    state: 'Karnataka',
  },
  {
    firstName: 'Sneha',
    name: 'Sneha Raj',
    email: 'sneha.attendee@example.com',
    role: 'ATTENDEE',
    bio: 'A learning facilitator interested in inclusive education, career growth, and local culture.',
    phone: '+91 00000 42005',
    interests: ['Education', 'Career Development', 'Culture'],
    city: 'Thrissur',
    state: 'Kerala',
  },
];

type EventDefinition = {
  title: string;
  slug: string;
  category: string;
  description: string;
  format: EventFormat;
  city: string | null;
  state: string;
  venue: string | null;
  daysFromNow: number;
  status: EventStatus;
  price: number;
  capacity: number;
  organizerIndex: number;
};

const events: EventDefinition[] = [
  { title: 'Malabar Future Forum: Building Better Cities', slug: 'malabar-kochi-future-forum', category: 'Business', description: 'A practical forum on creative enterprise, responsible growth, and the future of Kerala cities.', format: 'IN_PERSON', city: 'Kochi', state: 'Kerala', venue: 'Cochin Innovation Centre', daysFromNow: 1, status: 'PUBLISHED', price: 899, capacity: 2, organizerIndex: 0 },
  { title: 'Creative Cities and Local Culture', slug: 'malabar-creative-cities', category: 'Arts & Culture', description: 'Artists, makers, and community hosts share ways to support a thriving local creative scene.', format: 'HYBRID', city: 'Kochi', state: 'Kerala', venue: 'Pepper House', daysFromNow: 42, status: 'PUBLISHED', price: 450, capacity: 36, organizerIndex: 0 },
  { title: 'The Community Table: Stories from the Coast', slug: 'malabar-community-table', category: 'Community', description: 'An informal gathering for exchanging stories and ideas from coastal communities.', format: 'IN_PERSON', city: 'Kochi', state: 'Kerala', venue: 'Fort Kochi Reading Room', daysFromNow: -36, status: 'COMPLETED', price: 0, capacity: 28, organizerIndex: 0 },
  { title: 'Independent Business Foundations', slug: 'malabar-independent-business', category: 'Business', description: 'A friendly introduction to customer discovery, planning, and sustainable small-business practices.', format: 'ONLINE', city: null, state: 'Kerala', venue: null, daysFromNow: 75, status: 'DRAFT', price: 699, capacity: 40, organizerIndex: 0 },

  { title: 'Technology for the Public Good', slug: 'nextwave-public-good-tech', category: 'Technology', description: 'A conference exploring accessible digital services and technology that serves local communities.', format: 'IN_PERSON', city: 'Thiruvananthapuram', state: 'Kerala', venue: 'Technopark Convention Centre', daysFromNow: -62, status: 'COMPLETED', price: 1200, capacity: 80, organizerIndex: 1 },
  { title: 'Product Leadership Exchange', slug: 'nextwave-product-leadership', category: 'Business', description: 'Product leaders discuss research, prioritization, and building teams that learn from users.', format: 'HYBRID', city: 'Thiruvananthapuram', state: 'Kerala', venue: 'Kerala Startup Mission', daysFromNow: 27, status: 'PUBLISHED', price: 1499, capacity: 64, organizerIndex: 1 },
  { title: 'Data Storytelling for Better Decisions', slug: 'nextwave-data-storytelling', category: 'Technology', description: 'Practice turning analysis into clear, responsible stories for teams and communities.', format: 'ONLINE', city: null, state: 'Kerala', venue: null, daysFromNow: 58, status: 'PUBLISHED', price: 599, capacity: 50, organizerIndex: 1 },
  { title: 'Open Government and Digital Inclusion', slug: 'nextwave-digital-inclusion', category: 'Education', description: 'A discussion on digital inclusion, public information, and accessible online services.', format: 'IN_PERSON', city: 'Thiruvananthapuram', state: 'Kerala', venue: 'Kanakakkunnu Learning Hall', daysFromNow: 90, status: 'DRAFT', price: 0, capacity: 45, organizerIndex: 1 },

  { title: 'Visual Journalism: Finding the Everyday Story', slug: 'bloom-visual-journalism', category: 'Arts & Culture', description: 'A guided visual storytelling workshop with observation exercises and peer feedback.', format: 'IN_PERSON', city: 'Kozhikode', state: 'Kerala', venue: 'Malabar Cultural Centre', daysFromNow: 18, status: 'PUBLISHED', price: 499, capacity: 32, organizerIndex: 2 },
  { title: 'Kerala Design Weekend', slug: 'bloom-kerala-design-weekend', category: 'Workshops', description: 'A weekend of collaborative design activities, thoughtful talks, and creative connections.', format: 'HYBRID', city: 'Kozhikode', state: 'Kerala', venue: 'Kozhikode Design House', daysFromNow: 53, status: 'PUBLISHED', price: 1799, capacity: 70, organizerIndex: 2 },
  { title: 'Community Art Lab: Make and Share', slug: 'bloom-community-art-lab', category: 'Arts & Culture', description: 'A relaxed, all-levels studio session for making small works and sharing ideas.', format: 'IN_PERSON', city: 'Kozhikode', state: 'Kerala', venue: 'Mananchira Art Room', daysFromNow: -24, status: 'COMPLETED', price: 350, capacity: 24, organizerIndex: 2 },
  { title: 'Creative Practice for Beginners', slug: 'bloom-creative-practice', category: 'Education', description: 'Simple exercises for developing a regular creative practice and learning with others.', format: 'ONLINE', city: null, state: 'Kerala', venue: null, daysFromNow: 83, status: 'DRAFT', price: 399, capacity: 40, organizerIndex: 2 },

  { title: 'Cloud Native Engineering Day', slug: 'techbridge-cloud-native-bengaluru', category: 'Technology', description: 'A hands-on introduction to reliable cloud-native systems and modern engineering practices.', format: 'IN_PERSON', city: 'Bengaluru', state: 'Karnataka', venue: 'Bengaluru Tech Commons', daysFromNow: -48, status: 'COMPLETED', price: 1599, capacity: 90, organizerIndex: 3 },
  { title: 'AI Product Studio: From Idea to Prototype', slug: 'techbridge-ai-product-studio', category: 'Workshops', description: 'Small teams explore an AI product idea, test assumptions, and sketch a useful prototype.', format: 'HYBRID', city: 'Bengaluru', state: 'Karnataka', venue: 'Indiranagar Innovation Lab', daysFromNow: 33, status: 'PUBLISHED', price: 1999, capacity: 44, organizerIndex: 3 },
  { title: 'Open Source Maintainers Meetup', slug: 'techbridge-open-source-summit', category: 'Technology', description: 'A community-led meetup on sustainable maintenance, contribution pathways, and collaboration.', format: 'ONLINE', city: null, state: 'Karnataka', venue: null, daysFromNow: 68, status: 'PUBLISHED', price: 0, capacity: 100, organizerIndex: 3 },
  { title: 'Designing Useful Developer Tools', slug: 'techbridge-developer-tools', category: 'Business', description: 'Learn how developer tools teams listen to users and make complex workflows easier.', format: 'IN_PERSON', city: 'Bengaluru', state: 'Karnataka', venue: 'Bengaluru Tech Commons', daysFromNow: 105, status: 'DRAFT', price: 899, capacity: 50, organizerIndex: 3 },

  { title: 'Learning Design for Real Classrooms', slug: 'horizon-learning-design-lab', category: 'Education', description: 'Educators share practical methods for inclusive lesson design and active learning.', format: 'IN_PERSON', city: 'Thrissur', state: 'Kerala', venue: 'Thrissur Learning Hub', daysFromNow: 12, status: 'PUBLISHED', price: 699, capacity: 38, organizerIndex: 4 },
  { title: 'Career Relaunch: Skills, Stories, and Next Steps', slug: 'horizon-career-relaunch', category: 'Education', description: 'A supportive workshop to map transferable skills and plan a confident next career step.', format: 'HYBRID', city: 'Thrissur', state: 'Kerala', venue: 'Swaraj Round Community Hall', daysFromNow: 47, status: 'PUBLISHED', price: 450, capacity: 42, organizerIndex: 4 },
  { title: 'Teaching with Technology: A Practical Lab', slug: 'horizon-teaching-with-technology', category: 'Technology', description: 'Explore approachable digital tools that support collaboration and accessible learning.', format: 'ONLINE', city: null, state: 'Kerala', venue: null, daysFromNow: -31, status: 'COMPLETED', price: 0, capacity: 55, organizerIndex: 4 },
  { title: 'Mentoring Across Generations', slug: 'horizon-mentoring-generations', category: 'Community', description: 'A community conversation on supportive mentoring, peer learning, and shared experience.', format: 'IN_PERSON', city: 'Thrissur', state: 'Kerala', venue: 'Kerala Sahitya Academy Hall', daysFromNow: 96, status: 'DRAFT', price: 0, capacity: 48, organizerIndex: 4 },
];

const eventBySlug = new Map<string, { id: string; slug: string; title: string; status: EventStatus; startDate: Date; endDate: Date; price: number; isFree: boolean; currency: string; bookedSeats: number; totalCapacity: number }>();
const categoryByName = new Map<string, { id: string }>();

function localDatabaseUrl(): URL {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local demo seeding is disabled in production.');
  }
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required for local demo seeding.');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL is invalid; local demo seeding was not run.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.port !== LOCAL_PORT ||
    database !== LOCAL_DATABASE
  ) {
    throw new Error(`Refusing to seed: DATABASE_URL must target ${LOCAL_DATABASE} on localhost port ${LOCAL_PORT}.`);
  }
  return url;
}

function dateOffset(days: number, hour: number): Date {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function passwordForLocalDemo(firstName: string): string {
  // Local-only documented convention: first name followed by "@1234".
  return `${firstName}@1234`;
}

async function ensureUser(
  tx: Prisma.TransactionClient,
  profile: DemoUser,
  passwordHash: string,
) {
  const existing = await tx.user.findUnique({ where: { email: profile.email } });
  if (existing) {
    if (existing.role !== profile.role || !existing.bio?.startsWith(DEMO_MARKER)) {
      throw new Error('A non-demo account conflicts with a reserved demo login; no existing user was changed.');
    }
    return existing;
  }
  return tx.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      role: profile.role,
      passwordHash,
      bio: `${DEMO_MARKER} ${profile.bio}${profile.company ? ` Organization: ${profile.company}.` : ''} Based in ${profile.city}, ${profile.state}.`,
      phone: profile.phone,
      interests: profile.interests,
      isVerified: true,
    },
  });
}

async function createNotificationIfMissing(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string;
    eventId: string;
    key: string;
  },
) {
  const existing = await tx.inAppNotification.findUnique({
    where: { userId_key: { userId: data.userId, key: data.key } },
  });
  if (existing) return false;
  await tx.inAppNotification.create({ data });
  return true;
}

async function main() {
  const url = localDatabaseUrl();
  await prisma.$connect();
  const [identity] = await prisma.$queryRaw<Array<{
    database: string;
    address: string | null;
    port: number;
  }>>`
    SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port
  `;
  if (
    identity?.database !== LOCAL_DATABASE ||
    !identity.address?.startsWith('127.0.0.1') ||
    identity.port !== Number(LOCAL_PORT) ||
    url.hostname !== LOCAL_HOST
  ) {
    throw new Error('Refusing to seed: connected PostgreSQL identity is not the verified local Eventora database.');
  }
  console.log(`Verified local PostgreSQL target ${url.hostname}:${url.port}/${LOCAL_DATABASE}.`);

  const allUsers = [...organizers, ...attendees];
  const passwordHashes = new Map<string, string>();
  for (const profile of allUsers) {
    passwordHashes.set(profile.email, await bcrypt.hash(passwordForLocalDemo(profile.firstName), 12));
  }

  const created = await prisma.$transaction(async (tx) => {
    let usersCreated = 0;
    const userByEmail = new Map<string, { id: string; email: string; role: Role }>();
    for (const profile of allUsers) {
      const before = await tx.user.findUnique({ where: { email: profile.email }, select: { id: true } });
      const user = await ensureUser(tx, profile, passwordHashes.get(profile.email)!);
      userByEmail.set(user.email, user);
      usersCreated += Number(!before);
    }

    const categoryNames = [...new Set(events.map((event) => event.category))];
    for (const name of categoryNames) {
      const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const byName = await tx.category.findUnique({ where: { name } });
      const bySlug = byName ? null : await tx.category.findUnique({ where: { slug } });
      if (bySlug && bySlug.name !== name) {
        throw new Error('A different category uses a reserved demo category slug; no existing category was changed.');
      }
      const category = byName || bySlug || await tx.category.create({
        data: { name, slug, description: `${name} experiences and local development events.` },
      });
      categoryByName.set(name, category);
    }

    let eventsCreated = 0;
    for (let index = 0; index < events.length; index++) {
      const definition = events[index];
      const existing = await tx.event.findUnique({ where: { slug: definition.slug } });
      const organizer = organizers[definition.organizerIndex];
      const organizerRecord = userByEmail.get(organizer.email);
      const category = categoryByName.get(definition.category);
      if (!organizerRecord || !category) throw new Error('A demo event references a missing organizer or category.');

      if (existing) {
        if (
          !existing.description.startsWith(DEMO_MARKER) ||
          existing.organizerId !== organizerRecord.id
        ) {
          throw new Error('A non-demo event conflicts with a reserved demo slug; no existing event was changed.');
        }
        eventBySlug.set(existing.slug, existing);
        continue;
      }

      const startDate = dateOffset(definition.daysFromNow, 9 + (index % 7));
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      const isFree = definition.price === 0;
      const event = await tx.event.create({
        data: {
          title: definition.title,
          slug: definition.slug,
          description: `${DEMO_MARKER} ${definition.description}`,
          shortDescription: definition.description,
          categoryId: category.id,
          organizerId: organizerRecord.id,
          status: definition.status,
          format: definition.format,
          startDate,
          endDate,
          timezone: 'Asia/Kolkata',
          venueName: definition.venue,
          venueAddress: definition.venue ? `${definition.venue}, ${definition.city}` : null,
          city: definition.city,
          state: definition.state,
          country: 'India',
          onlineLink: definition.format === 'ONLINE' || definition.format === 'HYBRID'
            ? `https://meet.example.com/${definition.slug}`
            : null,
          totalCapacity: definition.capacity,
          bookedSeats: 0,
          price: definition.price,
          currency: 'INR',
          isFree,
          instructorName: organizer.name,
          instructorBio: organizer.bio,
          tags: [definition.category.toLowerCase(), 'local-demo'],
          schedule: [
            { time: '09:00', title: 'Welcome and introductions' },
            { time: '10:00', title: 'Guided session' },
            { time: '11:30', title: 'Questions and discussion' },
          ],
          requirements: ['Bring a notebook or a device for activities.'],
          whatYouLearn: ['Explore the topic through a guided activity.', 'Leave with practical next steps.'],
          isFeatured: index % 4 === 1,
        },
      });
      eventBySlug.set(event.slug, event);
      eventsCreated++;
    }

    let bookingsCreated = 0;
    let ticketsCreated = 0;
    let reviewsCreated = 0;
    let checkInsCreated = 0;
    let notificationsCreated = 0;
    let savedEventsCreated = 0;

    for (let index = 0; index < events.length; index++) {
      const definition = events[index];
      const event = eventBySlug.get(definition.slug);
      if (!event || definition.status === 'DRAFT') continue;
      if (!event.isFree && definition.status === 'COMPLETED') continue;

      const attendeeIndexes = [index % attendees.length];
      if (index === 0 || index % 3 === 1) {
        attendeeIndexes.push((index + 2) % attendees.length);
      }
      if (index === 1) attendeeIndexes.push(4);
      if (index === 8) attendeeIndexes.push((index + 2) % attendees.length);

      for (let attendeePosition = 0; attendeePosition < attendeeIndexes.length; attendeePosition++) {
        const attendee = attendees[attendeeIndexes[attendeePosition]];
        const user = userByEmail.get(attendee.email);
        if (!user) throw new Error('A demo registration references a missing attendee.');

        const existingBooking = await tx.booking.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: event.id } },
        });
        if (existingBooking) {
          if (!existingBooking.reference.startsWith('demo_')) {
            throw new Error('An existing non-demo registration conflicts with the demo relationship.');
          }
          continue;
        }

        const isCancelled = index === 8 && attendeePosition === 1;
        const isPending = index === 5 && attendeePosition === 0;
        const bookingStatus: BookingStatus = isCancelled
          ? 'CANCELLED'
          : event.isFree && !isPending
            ? 'CONFIRMED'
            : 'PENDING';
        const booking = await tx.booking.create({
          data: {
            userId: user.id,
            eventId: event.id,
            status: bookingStatus,
            seats: 1,
            totalAmount: event.isFree ? 0 : event.price,
            currency: event.currency,
            reference: `demo_${definition.slug}_${attendee.firstName.toLowerCase()}`,
            ...(isCancelled ? {
              cancelledAt: new Date(),
              cancellationReason: 'Fictional local development cancellation.',
            } : {}),
          },
        });
        bookingsCreated++;

        if (booking.status !== 'CANCELLED') {
          await tx.event.update({
            where: { id: event.id },
            data: { bookedSeats: { increment: booking.seats } },
          });
          event.bookedSeats += booking.seats;
        }

        if (booking.status === 'CONFIRMED') {
          const tickets = await issueTicketsIfMissing(tx, booking);
          ticketsCreated += tickets.length;
          notificationsCreated += Number(await createNotificationIfMissing(tx, {
            userId: user.id,
            type: 'REGISTRATION_CONFIRMED',
            title: 'Demo registration confirmed',
            message: `Your local demo registration for ${event.title} is confirmed.`,
            link: '/dashboard/bookings',
            eventId: event.id,
            key: `organizer-attendee-demo:registration:${definition.slug}:${user.id}`,
          }));

          if (definition.status === 'COMPLETED') {
            const existingReview = await tx.review.findUnique({
              where: { userId_eventId: { userId: user.id, eventId: event.id } },
            });
            if (!existingReview) {
              await tx.review.create({
                data: {
                  userId: user.id,
                  eventId: event.id,
                  rating: 4 + ((index + attendeePosition) % 2),
                  comment: `A thoughtful fictional review of ${event.title}. The session was welcoming and practical.`,
                },
              });
              reviewsCreated++;
            }

            if (attendeePosition === 0 && tickets[0]) {
              const existingCheckIn = await tx.checkIn.findUnique({
                where: { ticketId: tickets[0].id },
              });
              if (!existingCheckIn) {
                const organizerUser = userByEmail.get(organizers[definition.organizerIndex].email);
                if (!organizerUser) throw new Error('A demo check-in references a missing organizer.');
                await tx.checkIn.create({
                  data: {
                    ticketId: tickets[0].id,
                    eventId: event.id,
                    staffId: organizerUser.id,
                    method: 'QR',
                    checkedInAt: event.endDate,
                  },
                });
                await tx.ticket.update({
                  where: { id: tickets[0].id },
                  data: { isCheckedIn: true },
                });
                checkInsCreated++;
              }
            }
          }
        } else if (booking.status === 'CANCELLED') {
          notificationsCreated += Number(await createNotificationIfMissing(tx, {
            userId: user.id,
            type: 'REGISTRATION_CANCELLED',
            title: 'Demo registration cancelled',
            message: `Your local demo registration for ${event.title} was cancelled.`,
            link: '/dashboard/bookings',
            eventId: event.id,
            key: `organizer-attendee-demo:cancellation:${definition.slug}:${user.id}`,
          }));
        }
      }
    }

    const soldOutEvent = eventBySlug.get(events[0].slug);
    if (!soldOutEvent) throw new Error('The designated local demo sold-out event is missing.');
    for (const [position, attendeeIndex] of [1, 3, 4].entries()) {
      const user = userByEmail.get(attendees[attendeeIndex].email);
      if (!user) throw new Error('A demo waitlist entry references a missing attendee.');
      const existing = await tx.waitlistEntry.findUnique({
        where: { userId_eventId: { userId: user.id, eventId: soldOutEvent.id } },
      });
      if (!existing) {
        await tx.waitlistEntry.create({
          data: {
            userId: user.id,
            eventId: soldOutEvent.id,
            status: 'WAITING',
            position: position + 1,
          },
        });
      }
    }

    for (let attendeeIndex = 0; attendeeIndex < attendees.length; attendeeIndex++) {
      const user = userByEmail.get(attendees[attendeeIndex].email);
      if (!user) throw new Error('A saved event references a missing attendee.');
      const savedCandidates = events.filter((event) => event.status === 'PUBLISHED');
      for (const definition of [savedCandidates[attendeeIndex], savedCandidates[(attendeeIndex + 5) % savedCandidates.length]]) {
        const event = definition ? eventBySlug.get(definition.slug) : null;
        if (!event) continue;
        const existing = await tx.savedEvent.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: event.id } },
        });
        if (!existing) {
          await tx.savedEvent.create({ data: { userId: user.id, eventId: event.id } });
          savedEventsCreated++;
        }
      }
    }

    const notificationEvent = eventBySlug.get(events[1].slug);
    if (notificationEvent) {
      const user = userByEmail.get(attendees[0].email);
      if (user) {
        notificationsCreated += Number(await createNotificationIfMissing(tx, {
          userId: user.id,
          type: 'EVENT_UPDATED',
          title: 'Demo event details updated',
          message: `A fictional update is available for ${notificationEvent.title}.`,
          link: `/events/${notificationEvent.slug}`,
          eventId: notificationEvent.id,
          key: 'organizer-attendee-demo:event-update:malabar-creative-cities',
        }));
      }
    }

    return {
      usersCreated,
      eventsCreated,
      bookingsCreated,
      ticketsCreated,
      reviewsCreated,
      checkInsCreated,
      savedEventsCreated,
      notificationsCreated,
    };
  }, { maxWait: 15_000, timeout: 120_000 });

  console.log('Local organizer/attendee development seed completed.');
  console.log(`Created users: ${created.usersCreated} (5 organizers, 5 attendees when all were missing).`);
  console.log(`Created events: ${created.eventsCreated}; bookings: ${created.bookingsCreated}; no mock payment records were created.`);
  console.log(`Created tickets: ${created.ticketsCreated}; reviews: ${created.reviewsCreated}; check-ins: ${created.checkInsCreated}.`);
  console.log(`Created saved events: ${created.savedEventsCreated}; notifications: ${created.notificationsCreated}.`);
  console.log('Local-only password convention: each account first name followed by @1234. Passwords are bcrypt-hashed and never printed.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Local organizer/attendee demo seeding failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
