import '../lib/loadEnv';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { BookingStatus, EventFormat, EventStatus, PaymentStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import { issueTicketsIfMissing } from '../services/tickets';

const prisma = new PrismaClient();
const DEMO_MARKER = 'Eventora local development demo dataset.';
const PASSWORD_LABEL = 'Local development demo password:';
const credentialsPath = path.resolve(__dirname, '../../../../demo-dataset-credentials.txt');

const categories = [
  { name: 'Technology', slug: 'technology', description: 'Software, data, AI, and emerging technology.', icon: 'Cpu', color: '#315b73' },
  { name: 'Workshops', slug: 'workshops', description: 'Practical, hands-on learning experiences.', icon: 'Wrench', color: '#a65d42' },
  { name: 'Arts & Culture', slug: 'arts-culture', description: 'Creative practice, visual arts, and culture.', icon: 'Palette', color: '#80558a' },
  { name: 'Business', slug: 'business', description: 'Entrepreneurship, leadership, and finance.', icon: 'Briefcase', color: '#697b45' },
  { name: 'Education', slug: 'education', description: 'Teaching, learning, and career development.', icon: 'BookOpen', color: '#b18742' },
  { name: 'Community', slug: 'community', description: 'Local initiatives and community building.', icon: 'Users', color: '#43816f' },
  { name: 'Wellness', slug: 'wellness', description: 'Mindfulness and sustainable wellbeing.', icon: 'Heart', color: '#af6573' },
];

const organizerProfiles = [
  ['Ananya Nair', 'ananya.nair', 'Kochi', ['Technology', 'Education'], 'A product engineer who makes complex technical topics approachable.'],
  ['Arjun Menon', 'arjun.menon', 'Kozhikode', ['Business', 'Community'], 'A community builder focused on thoughtful, sustainable local businesses.'],
  ['Meera Thomas', 'meera.thomas', 'Thiruvananthapuram', ['Arts & Culture', 'Workshops'], 'A multidisciplinary artist and facilitator of collaborative studios.'],
  ['Nikhil Varghese', 'nikhil.varghese', 'Thrissur', ['Technology', 'Business'], 'An independent software consultant and mentor for early-career teams.'],
  ['Devika Pillai', 'devika.pillai', 'Alappuzha', ['Wellness', 'Education'], 'A learning designer interested in accessible and welcoming experiences.'],
] as const;

const attendeeProfiles = [
  ['Aarav Krishnan', ['Technology', 'Business'], 'Curious about building useful products and learning from peers.'],
  ['Diya Balakrishnan', ['Arts & Culture', 'Photography'], 'Enjoys visual storytelling, local exhibitions, and creative collaboration.'],
  ['Ishaan Thomas', ['Technology', 'Education'], 'Exploring software development and practical ways to teach it.'],
  ['Anika Joseph', ['Wellness', 'Community'], 'Interested in inclusive communities and balanced routines.'],
  ['Rohan Nambiar', ['Business', 'Technology'], 'Learning about entrepreneurship, product strategy, and data.'],
  ['Kavya Suresh', ['Arts & Culture', 'Workshops'], 'A hobby illustrator who likes hands-on creative sessions.'],
  ['Aditya Das', ['Education', 'Technology'], 'Interested in accessible learning tools and digital literacy.'],
  ['Nila George', ['Community', 'Wellness'], 'Enjoys community projects, reading groups, and mindful movement.'],
  ['Kabir Mathew', ['Technology', 'Photography'], 'Learning web development and documenting everyday places.'],
  ['Tara Prasad', ['Business', 'Education'], 'Interested in mentoring, team culture, and small business operations.'],
  ['Neha Menon', ['Arts & Culture', 'Community'], 'A culture enthusiast who enjoys making things with other people.'],
  ['Joel Abraham', ['Technology', 'Workshops'], 'Prefers practical sessions and collaborative problem solving.'],
  ['Maya Narayanan', ['Wellness', 'Education'], 'Interested in reflective practices and lifelong learning.'],
  ['Rehan Ali', ['Business', 'Community'], 'Exploring social enterprises and responsible local commerce.'],
  ['Sana Varma', ['Arts & Culture', 'Photography'], 'Enjoys design, photography, and creative experimentation.'],
  ['Vivek Chandran', ['Technology', 'Business'], 'A curious analyst exploring AI and product development.'],
  ['Leela Kuriakose', ['Education', 'Community'], 'Interested in community-led teaching and peer learning.'],
  ['Farah Basheer', ['Wellness', 'Arts & Culture'], 'Enjoys yoga, writing, and creative wellbeing practices.'],
  ['Manu Raj', ['Technology', 'Workshops'], 'Building confidence with new tools through small projects.'],
  ['Riya Gopal', ['Business', 'Arts & Culture'], 'Interested in creative careers and independent work.'],
  ['Siddharth Rao', ['Education', 'Technology'], 'Learning about digital accessibility and responsible technology.'],
  ['Parvathy Mohan', ['Community', 'Workshops'], 'Likes volunteering, making, and bringing neighbours together.'],
  ['Zoya Hussain', ['Business', 'Wellness'], 'Exploring sustainable work habits and ethical business.'],
  ['Kiran Babu', ['Technology', 'Community'], 'A lifelong learner interested in open-source and local tech groups.'],
] as const;

type EventDefinition = {
  title: string;
  slug: string;
  categorySlug: string;
  format: EventFormat;
  city: string | null;
  venue: string | null;
  isFree: boolean;
  price: number;
  capacity?: number;
  tags: string[];
};

const eventDefinitions: EventDefinition[] = [
  { title: 'Building Your First Accessible Web App', slug: 'demo-accessible-web-app', categorySlug: 'technology', format: 'IN_PERSON', city: 'Kochi', venue: 'Maker Village', isFree: false, price: 799, tags: ['web', 'accessibility'] },
  { title: 'Watercolour Sketching: Kerala Landscapes', slug: 'demo-watercolour-kerala', categorySlug: 'arts-culture', format: 'IN_PERSON', city: 'Kozhikode', venue: 'Mananchira Art Room', isFree: true, price: 0, tags: ['painting', 'beginner'] },
  { title: 'Practical Data Storytelling with Python', slug: 'demo-data-storytelling', categorySlug: 'technology', format: 'ONLINE', city: null, venue: null, isFree: false, price: 1299, tags: ['python', 'data'] },
  { title: 'Community-Led Tourism: A Local Playbook', slug: 'demo-community-tourism', categorySlug: 'community', format: 'HYBRID', city: 'Alappuzha', venue: 'Canal-side Learning Hub', isFree: true, price: 0, tags: ['tourism', 'community'] },
  { title: 'Small Business Finance Without the Jargon', slug: 'demo-small-business-finance', categorySlug: 'business', format: 'IN_PERSON', city: 'Thiruvananthapuram', venue: 'Kerala Startup Mission', isFree: false, price: 599, tags: ['finance', 'business'] },
  { title: 'Teaching with Open Learning Resources', slug: 'demo-open-learning-resources', categorySlug: 'education', format: 'ONLINE', city: null, venue: null, isFree: true, price: 0, tags: ['teaching', 'open-education'] },
  { title: 'Mindful Movement for Desk Workers', slug: 'demo-mindful-movement', categorySlug: 'wellness', format: 'IN_PERSON', city: 'Thrissur', venue: 'Swaraj Round Studio', isFree: false, price: 399, tags: ['wellness', 'movement'] },
  { title: 'Phone Photography: Light and Composition', slug: 'demo-phone-photography', categorySlug: 'arts-culture', format: 'IN_PERSON', city: 'Kannur', venue: 'Coastal Arts Collective', isFree: false, price: 499, tags: ['photography', 'creative'] },
  { title: 'Prototype a Useful AI Assistant', slug: 'demo-ai-assistant-prototype', categorySlug: 'technology', format: 'HYBRID', city: 'Kochi', venue: 'Infopark Community Hall', isFree: false, price: 1499, capacity: 8, tags: ['AI', 'prototyping'] },
  { title: 'Design Systems for Small Product Teams', slug: 'demo-design-systems-small-teams', categorySlug: 'workshops', format: 'ONLINE', city: null, venue: null, isFree: false, price: 1099, tags: ['design', 'product'] },
  { title: 'Clay, Form, and Everyday Objects', slug: 'demo-clay-everyday-objects', categorySlug: 'arts-culture', format: 'IN_PERSON', city: 'Kochi', venue: 'Fort Kochi Community Studio', isFree: false, price: 899, tags: ['ceramics', 'beginner'] },
  { title: 'Starting a Social Enterprise in Kerala', slug: 'demo-social-enterprise-kerala', categorySlug: 'business', format: 'HYBRID', city: 'Kozhikode', venue: 'Beach Road Learning Centre', isFree: true, price: 0, tags: ['social-enterprise', 'planning'] },
  { title: 'Digital Safety for Families and Communities', slug: 'demo-digital-safety', categorySlug: 'community', format: 'IN_PERSON', city: 'Palakkad', venue: 'Town Library Hall', isFree: true, price: 0, tags: ['safety', 'digital-literacy'] },
  { title: 'From Idea to Weekend Prototype', slug: 'demo-weekend-prototype', categorySlug: 'technology', format: 'IN_PERSON', city: 'Bengaluru', venue: 'Indiranagar Makerspace', isFree: false, price: 1799, tags: ['prototyping', 'technology'] },
  { title: 'Public Speaking for Thoughtful Leaders', slug: 'demo-public-speaking-leaders', categorySlug: 'business', format: 'ONLINE', city: null, venue: null, isFree: false, price: 699, tags: ['leadership', 'communication'] },
  { title: 'Illustrated Journaling for Beginners', slug: 'demo-illustrated-journaling', categorySlug: 'arts-culture', format: 'IN_PERSON', city: 'Kottayam', venue: 'Letters & Lines Studio', isFree: true, price: 0, tags: ['journaling', 'illustration'] },
  { title: 'Designing Better Learning Activities', slug: 'demo-learning-activities', categorySlug: 'education', format: 'HYBRID', city: 'Ernakulam', venue: 'District Learning Lab', isFree: false, price: 549, tags: ['learning-design', 'education'] },
  { title: 'Open Source for Your First Contribution', slug: 'demo-first-open-source', categorySlug: 'technology', format: 'ONLINE', city: null, venue: null, isFree: true, price: 0, tags: ['open-source', 'coding'] },
  { title: 'Neighbourhood Food Stories and Memory', slug: 'demo-food-stories-memory', categorySlug: 'community', format: 'IN_PERSON', city: 'Kochi', venue: 'Mattancherry Reading Room', isFree: false, price: 299, tags: ['food', 'storytelling'] },
  { title: 'Personal Budgeting for Freelancers', slug: 'demo-budgeting-freelancers', categorySlug: 'business', format: 'ONLINE', city: null, venue: null, isFree: true, price: 0, tags: ['finance', 'freelance'] },
  { title: 'Intro to Generative Art with Creative Code', slug: 'demo-generative-art', categorySlug: 'arts-culture', format: 'HYBRID', city: 'Chennai', venue: 'T Nagar Creative Lab', isFree: false, price: 999, tags: ['creative-code', 'art'] },
  { title: 'First Aid for Community Event Hosts', slug: 'demo-event-host-first-aid', categorySlug: 'community', format: 'IN_PERSON', city: 'Thiruvananthapuram', venue: 'Museum Auditorium', isFree: true, price: 0, tags: ['events', 'safety'] },
  { title: 'Collaborative Note-Taking for Teams', slug: 'demo-team-note-taking', categorySlug: 'workshops', format: 'ONLINE', city: null, venue: null, isFree: false, price: 449, tags: ['collaboration', 'tools'] },
  { title: 'Yoga, Breath, and Sustainable Routines', slug: 'demo-yoga-sustainable-routines', categorySlug: 'wellness', format: 'IN_PERSON', city: 'Varkala', venue: 'Cliffside Community Room', isFree: false, price: 350, tags: ['yoga', 'wellness'] },
  { title: 'Career Portfolio Clinic for Early Careers', slug: 'demo-career-portfolio-clinic', categorySlug: 'education', format: 'HYBRID', city: 'Kochi', venue: 'Kaloor Skill Studio', isFree: true, price: 0, tags: ['career', 'portfolio'] },
  { title: 'Responsible AI: A Hands-on Discussion', slug: 'demo-responsible-ai', categorySlug: 'technology', format: 'ONLINE', city: null, venue: null, isFree: false, price: 799, tags: ['AI', 'ethics'] },
  { title: 'Traditional Patterns in Contemporary Design', slug: 'demo-patterns-contemporary-design', categorySlug: 'arts-culture', format: 'IN_PERSON', city: 'Thrissur', venue: 'Vadakkunnathan Arts Pavilion', isFree: false, price: 650, tags: ['craft', 'design'] },
  { title: 'Urban Gardening in Small Spaces', slug: 'demo-urban-gardening', categorySlug: 'community', format: 'IN_PERSON', city: 'Mumbai', venue: 'Dadar Neighbourhood Garden', isFree: true, price: 0, tags: ['gardening', 'community'] },
] as const;

const dayOffset = (days: number, hour = 10) => {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

function getEventStatus(index: number): EventStatus {
  if (index < 8) return 'COMPLETED';
  if (index < 23) return 'PUBLISHED';
  if (index < 25) return 'DRAFT';
  return 'CANCELLED';
}

function getEventStartOffset(index: number): number {
  if (index < 8) return -70 + index * 6;
  if (index < 23) return 2 + (index - 8) * 4;
  if (index < 25) return 14 + (index - 23) * 16;
  return [-4, 9, 28][index - 25];
}

function getBookingPlan(eventIndex: number, isFree: boolean, soldOut: boolean) {
  if (eventIndex < 8) {
    return Array.from({ length: 4 }, (_, slot) => ({
      slot,
      status: 'CONFIRMED' as BookingStatus,
      seats: slot === 0 ? 2 : 1,
    }));
  }
  if (soldOut) {
    return [2, 2, 2, 1, 1].map((seats, slot) => ({
      slot,
      status: 'CONFIRMED' as BookingStatus,
      seats,
    }));
  }
  return [
    { slot: 0, status: 'CONFIRMED' as BookingStatus, seats: 1 },
    { slot: 1, status: 'CONFIRMED' as BookingStatus, seats: 2 },
    { slot: 2, status: (isFree ? 'CONFIRMED' : 'PENDING') as BookingStatus, seats: 1 },
    { slot: 3, status: 'CANCELLED' as BookingStatus, seats: 1 },
    { slot: 4, status: (isFree ? 'CANCELLED' : 'REFUNDED') as BookingStatus, seats: 1 },
  ];
}

function safeLocalDatabaseUrl(): URL {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo dataset seeding is disabled in production.');
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
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port !== '5433' || database !== 'eventora_local') {
    throw new Error('Refusing to seed: DATABASE_URL must target eventora_local on localhost port 5433.');
  }
  return url;
}

function loadOrCreateDemoPassword(): string {
  if (existsSync(credentialsPath)) {
    const contents = readFileSync(credentialsPath, 'utf8');
    const password = contents.match(/^Local development demo password: (.+)$/m)?.[1];
    if (!password || password.length < 24) {
      throw new Error('The local demo credentials file exists but is not in the expected format; it was not overwritten.');
    }
    return password;
  }
  return randomBytes(32).toString('base64url');
}

function saveCredentials(password: string, emails: string[]) {
  const existing = existsSync(credentialsPath) ? readFileSync(credentialsPath, 'utf8') : '';
  const previousEmails = existing.match(/^Login: (.+)$/gm)?.map((line) => line.replace(/^Login: /, '')) || [];
  const allEmails = [...new Set([...previousEmails, ...emails])].sort();
  const content = [
    'Eventora fictional local development accounts',
    'For local development only. Do not use this password outside this local dataset.',
    `${PASSWORD_LABEL} ${password}`,
    '',
    ...allEmails.map((email) => `Login: ${email}`),
    '',
  ].join('\n');
  writeFileSync(credentialsPath, content, { encoding: 'utf8', mode: 0o600 });
}

async function ensureUser(
  tx: Prisma.TransactionClient,
  email: string,
  name: string,
  role: Role,
  passwordHash: string,
  profile: { bio: string; phone: string; interests: string[] },
  createdEmails: string[],
) {
  const existing = await tx.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role || !existing.bio?.startsWith(DEMO_MARKER)) {
      throw new Error(`A non-demo account conflicts with a reserved demo login; no existing data was changed.`);
    }
    return { user: existing, created: false };
  }
  const user = await tx.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      bio: `${DEMO_MARKER} ${profile.bio}`,
      phone: profile.phone,
      interests: profile.interests,
      isVerified: true,
    },
  });
  createdEmails.push(email);
  return { user, created: true };
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
  const url = safeLocalDatabaseUrl();
  await prisma.$connect();
  const [identity] = await prisma.$queryRaw<Array<{ database: string; address: string | null; port: number }>>`
    SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port
  `;
  if (
    identity?.database !== 'eventora_local' ||
    !identity.address?.startsWith('127.0.0.1') ||
    identity.port !== 5433 ||
    url.hostname !== '127.0.0.1'
  ) {
    throw new Error('Refusing to seed: connected PostgreSQL identity is not the verified local Eventora database.');
  }
  console.log(`Verified local PostgreSQL target ${url.hostname}:${url.port}/eventora_local.`);

  const password = loadOrCreateDemoPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const createdEmails: string[] = [];
  const counts = await prisma.$transaction(async (tx) => {
    const seededUsers = new Map<string, { id: string; role: Role; name: string }>();
    let usersCreated = 0;
    const admin = await ensureUser(
      tx,
      'local-admin@eventora-demo.example.com',
      'Eventora Local Demo Admin',
      'ADMIN',
      passwordHash,
      { bio: 'Local-only fictional administrator account.', phone: '+91 00000 10000', interests: ['Community', 'Technology'] },
      createdEmails,
    );
    seededUsers.set(admin.user.email, admin.user);
    usersCreated += Number(admin.created);

    for (let index = 0; index < organizerProfiles.length; index++) {
      const [name, handle, city, interests, bio] = organizerProfiles[index];
      const email = `${handle}@eventora-demo.example.com`;
      const result = await ensureUser(
        tx,
        email,
        name,
        'ORGANIZER',
        passwordHash,
        { bio: `${bio} Based in ${city}.`, phone: `+91 00000 ${20000 + index}`, interests: [...interests] },
        createdEmails,
      );
      seededUsers.set(email, result.user);
      usersCreated += Number(result.created);
    }

    for (let index = 0; index < attendeeProfiles.length; index++) {
      const [name, interests, bio] = attendeeProfiles[index];
      const email = `demo-attendee-${String(index + 1).padStart(2, '0')}@example.com`;
      const result = await ensureUser(
        tx,
        email,
        name,
        'ATTENDEE',
        passwordHash,
        { bio, phone: `+91 00000 ${30000 + index}`, interests: [...interests] },
        createdEmails,
      );
      seededUsers.set(email, result.user);
      usersCreated += Number(result.created);
    }

    const categoryBySlug = new Map<string, { id: string }>();
    for (const category of categories) {
      const saved = await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: {},
      });
      categoryBySlug.set(category.slug, saved);
    }

    const attendees = attendeeProfiles.map((_, index) =>
      seededUsers.get(`demo-attendee-${String(index + 1).padStart(2, '0')}@example.com`)!,
    );
    const organizers = organizerProfiles.map(([, handle]) =>
      seededUsers.get(`${handle}@eventora-demo.example.com`)!,
    );

    const events: Array<{
      id: string;
      slug: string;
      title: string;
      status: EventStatus;
      startDate: Date;
      endDate: Date;
      isFree: boolean;
      price: number;
      currency: string;
      bookedSeats: number;
      totalCapacity: number;
    }> = [];
    let eventsCreated = 0;
    for (let index = 0; index < eventDefinitions.length; index++) {
      const definition = eventDefinitions[index];
      const status = getEventStatus(index);
      const startDate = dayOffset(getEventStartOffset(index), 9 + (index % 7));
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      const soldOut = index === 8;
      const capacity = definition.capacity || 36 + (index % 5) * 8;
      const isFree = definition.isFree;
      const bookingPlan = status === 'PUBLISHED' || status === 'COMPLETED'
        ? getBookingPlan(index, isFree, soldOut)
        : [];
      const bookedSeats = bookingPlan
        .filter(({ status: bookingStatus }) => bookingStatus === 'CONFIRMED' || bookingStatus === 'PENDING')
        .reduce((total, booking) => total + booking.seats, 0);
      const category = categoryBySlug.get(definition.categorySlug);
      if (!category) throw new Error('A demo event references a missing category.');
      const organizer = organizers[index % organizers.length];
      const existing = await tx.event.findUnique({ where: { slug: definition.slug } });
      if (existing && !existing.description.startsWith(DEMO_MARKER)) {
        throw new Error('A non-demo event conflicts with a reserved demo event slug; no existing data was changed.');
      }
      const saved = existing || await tx.event.create({
        data: {
          title: definition.title,
          slug: definition.slug,
          description: `${DEMO_MARKER} Join a welcoming, practical session designed for curious learners. This fictional event includes guided activities, time for questions, and useful take-home resources.`,
          shortDescription: `A fictional local demo event: ${definition.title}.`,
          categoryId: category.id,
          organizerId: organizer.id,
          status,
          format: definition.format,
          startDate,
          endDate,
          timezone: 'Asia/Kolkata',
          venueName: definition.venue,
          venueAddress: definition.venue ? `${definition.venue}, ${definition.city}` : null,
          city: definition.city,
          state: definition.city ? 'Kerala' : null,
          country: 'India',
          onlineLink: definition.format !== 'IN_PERSON' ? `https://meet.example.com/${definition.slug}` : null,
          totalCapacity: capacity,
          bookedSeats,
          price: definition.price,
          currency: 'INR',
          isFree,
          instructorName: organizer.name,
          instructorBio: organizerProfiles[index % organizerProfiles.length][4],
          tags: [...definition.tags, 'local-demo'],
          schedule: [{ time: '09:00', title: 'Welcome and introductions' }, { time: '10:00', title: 'Guided session' }, { time: '11:30', title: 'Practice and discussion' }],
          requirements: ['Bring a notebook or a device for activities.'],
          whatYouLearn: ['Explore the topic through a guided activity.', 'Leave with practical next steps.'],
          isFeatured: index < 3,
          viewCount: 20 + index * 7,
        },
      });
      events.push(saved);
      eventsCreated += Number(!existing);
    }

    let bookingsCreated = 0;
    let paymentsCreated = 0;
    let ticketsCreated = 0;
    let reviewsCreated = 0;
    let checkInsCreated = 0;
    let notificationsCreated = 0;
    const bookingByEventAndSlot = new Map<string, { id: string; userId: string; status: BookingStatus; seats: number; reference: string }>();

    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];
      const definition = eventDefinitions[eventIndex];
      const soldOut = eventIndex === 8;
      if (event.status === 'PUBLISHED' || event.status === 'COMPLETED') {
        const plan = getBookingPlan(eventIndex, event.isFree, soldOut);
        for (const bookingPlan of plan) {
          const attendee = attendees[(eventIndex * 7 + bookingPlan.slot * 5) % attendees.length];
          const existingBooking = await tx.booking.findUnique({
            where: { userId_eventId: { userId: attendee.id, eventId: event.id } },
          });
          const booking = existingBooking || await tx.booking.create({
            data: {
              userId: attendee.id,
              eventId: event.id,
              status: bookingPlan.status,
              seats: bookingPlan.seats,
              totalAmount: event.isFree ? 0 : event.price * bookingPlan.seats,
              currency: event.currency,
              ...(bookingPlan.status === 'CANCELLED' ? { cancelledAt: new Date(), cancellationReason: 'Fictional demo cancellation.' } : {}),
            },
          });
          bookingByEventAndSlot.set(`${event.slug}:${bookingPlan.slot}`, booking);
          bookingsCreated += Number(!existingBooking);

          let paymentStatus: PaymentStatus | null = null;
          if (!event.isFree) {
            if (booking.status === 'CONFIRMED') paymentStatus = 'CAPTURED';
            else if (booking.status === 'PENDING') paymentStatus = 'PENDING';
            else if (booking.status === 'REFUNDED') paymentStatus = 'REFUNDED';
            else if (booking.status === 'CANCELLED') paymentStatus = 'FAILED';
          }
          if (paymentStatus) {
            const existingPayment = await tx.payment.findUnique({ where: { bookingId: booking.id } });
            const payment = existingPayment || await tx.payment.create({
              data: {
                bookingId: booking.id,
                razorpayOrderId: `demo_order_${event.slug}_${bookingPlan.slot}`,
                razorpayPaymentId: paymentStatus === 'CAPTURED' || paymentStatus === 'REFUNDED'
                  ? `demo_payment_${event.slug}_${bookingPlan.slot}`
                  : null,
                razorpaySignature: paymentStatus === 'CAPTURED' ? 'local-demo-signature' : null,
                amount: event.price * booking.seats,
                currency: event.currency,
                status: paymentStatus,
                webhookVerified: paymentStatus === 'CAPTURED' || paymentStatus === 'REFUNDED',
              },
            });
            paymentsCreated += Number(!existingPayment);
          }

          if (booking.status === 'CONFIRMED') {
            const before = await tx.ticket.count({ where: { bookingId: booking.id } });
            const tickets = await issueTicketsIfMissing(tx, {
              id: booking.id,
              seats: booking.seats,
              reference: booking.reference,
              eventId: booking.eventId,
            });
            ticketsCreated += Math.max(0, tickets.length - before);
            notificationsCreated += Number(await createNotificationIfMissing(tx, {
              userId: attendee.id,
              type: 'REGISTRATION_CONFIRMED',
              title: 'Demo registration confirmed',
              message: `Your fictional demo registration for ${event.title} is confirmed.`,
              link: '/dashboard/bookings',
              eventId: event.id,
              key: `demo-registration-confirmed:${event.slug}:${attendee.id}`,
            }));
          } else if (booking.status === 'CANCELLED') {
            notificationsCreated += Number(await createNotificationIfMissing(tx, {
              userId: attendee.id,
              type: 'REGISTRATION_CANCELLED',
              title: 'Demo registration cancelled',
              message: `Your fictional demo registration for ${event.title} was cancelled.`,
              link: '/dashboard/bookings',
              eventId: event.id,
              key: `demo-registration-cancelled:${event.slug}:${attendee.id}`,
            }));
          }
        }
      }
    }

    for (let eventIndex = 0; eventIndex < 8; eventIndex++) {
      const event = events[eventIndex];
      for (const slot of [0, 1]) {
        const booking = bookingByEventAndSlot.get(`${event.slug}:${slot}`);
        if (!booking || booking.status !== 'CONFIRMED') continue;
        const existingReview = await tx.review.findUnique({
          where: { userId_eventId: { userId: booking.userId, eventId: event.id } },
        });
        const review = existingReview || await tx.review.create({
          data: {
            userId: booking.userId,
            eventId: event.id,
            rating: 4 + ((eventIndex + slot) % 2),
            comment: `A thoughtful fictional demo review for ${event.title}. The session was practical and welcoming.`,
          },
        });
        reviewsCreated += Number(!existingReview);
        const certificate = await tx.certificate.upsert({
          where: { userId_eventId: { userId: booking.userId, eventId: event.id } },
          create: { userId: booking.userId, eventId: event.id },
          update: {},
        });
        void certificate;
      }
      if (eventIndex % 2 === 0) {
        const booking = bookingByEventAndSlot.get(`${event.slug}:0`);
        const ticket = booking
          ? await tx.ticket.findFirst({ where: { bookingId: booking.id }, orderBy: { seatNumber: 'asc' } })
          : null;
        if (ticket) {
          const existingCheckIn = await tx.checkIn.findUnique({ where: { ticketId: ticket.id } });
          const checkIn = existingCheckIn || await tx.checkIn.create({
            data: {
              ticketId: ticket.id,
              eventId: event.id,
              staffId: organizers[eventIndex % organizers.length].id,
              method: 'QR',
              checkedInAt: event.endDate,
            },
          });
          await tx.ticket.updateMany({
            where: { id: ticket.id, isCheckedIn: false },
            data: { isCheckedIn: true },
          });
          checkInsCreated += Number(!existingCheckIn);
        }
      }
    }

    const soldOutEvent = events[8];
    for (let index = 0; index < 4; index++) {
      const attendee = attendees[20 + index];
      const existing = await tx.waitlistEntry.findUnique({
        where: { userId_eventId: { userId: attendee.id, eventId: soldOutEvent.id } },
      });
      if (!existing) {
        await tx.waitlistEntry.create({
          data: {
            userId: attendee.id,
            eventId: soldOutEvent.id,
            status: index === 0 ? 'OFFERED' : 'WAITING',
            position: index + 1,
            offeredAt: index === 0 ? new Date() : null,
            offerExpiresAt: index === 0 ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
          },
        });
      }
    }

    for (const eventIndex of [9, 12, 15, 20]) {
      const event = events[eventIndex];
      for (const attendeeIndex of [0, 3, 7]) {
        const attendee = attendees[attendeeIndex];
        const saved = await tx.savedEvent.upsert({
          where: { userId_eventId: { userId: attendee.id, eventId: event.id } },
          create: { userId: attendee.id, eventId: event.id },
          update: {},
        });
        void saved;
      }
    }

    for (const eventIndex of [8, 9, 10, 12, 15]) {
      const event = events[eventIndex];
      const attendee = attendees[(eventIndex * 3) % attendees.length];
      const notificationTypes = [
        {
          type: 'EVENT_UPDATED',
          title: 'Demo event details updated',
          message: `Fictional demo update: review the latest details for ${event.title}.`,
          key: 'event-update',
        },
        {
          type: 'EVENT_REMINDER',
          title: 'Demo upcoming event reminder',
          message: `Fictional demo reminder: ${event.title} is coming up.`,
          key: 'event-reminder',
        },
      ];
      for (const notification of notificationTypes) {
        notificationsCreated += Number(await createNotificationIfMissing(tx, {
          ...notification,
          userId: attendee.id,
          link: `/events/${event.slug}`,
          eventId: event.id,
          key: `demo-${notification.key}:${event.slug}:${attendee.id}`,
        }));
      }
    }

    const proposalDefinitions = [
      ['Demo proposal: Community mapping for beginners', 'community', 'PENDING'],
      ['Demo proposal: Practical climate data storytelling', 'technology', 'APPROVED'],
      ['Demo proposal: A neighbourhood printmaking studio', 'arts-culture', 'REJECTED'],
      ['Demo proposal: Small-team product discovery', 'business', 'PENDING'],
      ['Demo proposal: Accessible teaching materials', 'education', 'APPROVED'],
    ] as const;
    let proposalsCreated = 0;
    for (let index = 0; index < proposalDefinitions.length; index++) {
      const [title, category, status] = proposalDefinitions[index];
      const organizer = organizers[index % organizers.length];
      const existing = await tx.proposal.findFirst({
        where: { title, organizerId: organizer.id },
      });
      if (!existing) {
        await tx.proposal.create({
          data: {
            title,
            description: `${DEMO_MARKER} A fictional proposal for a practical, welcoming community workshop.`,
            category,
            proposedDate: dayOffset(30 + index * 7),
            format: index % 2 === 0 ? 'IN_PERSON' : 'ONLINE',
            estimatedCapacity: 24 + index * 4,
            price: index % 2 === 0 ? 0 : 399 + index * 100,
            status,
            organizerId: organizer.id,
            adminNotes: status === 'APPROVED' ? 'Approved as fictional development data.' : null,
            rejectionReason: status === 'REJECTED' ? 'Fictional demo rejection for testing proposal states.' : null,
          },
        });
        proposalsCreated++;
      }
    }

    saveCredentials(password, createdEmails);

    return {
      usersCreated,
      categories: categories.length,
      eventsCreated,
      bookingsCreated,
      paymentsCreated,
      ticketsCreated,
      reviewsCreated,
      checkInsCreated,
      proposalsCreated,
      notificationsCreated,
    };
  }, { maxWait: 15_000, timeout: 120_000 });

  console.log('Local Eventora demo dataset seeding completed.');
  console.log(`Created users: ${counts.usersCreated} (1 admin, 5 organizers, 24 attendees when all were missing).`);
  console.log(`Categories: ${counts.categories}; events: ${counts.eventsCreated}; bookings: ${counts.bookingsCreated}.`);
  console.log(`Payments: ${counts.paymentsCreated}; tickets: ${counts.ticketsCreated}; reviews: ${counts.reviewsCreated}; check-ins: ${counts.checkInsCreated}.`);
  console.log(`Proposals: ${counts.proposalsCreated}; notifications created: ${counts.notificationsCreated}.`);
  console.log(`Local-only credentials saved in gitignored ${path.relative(process.cwd(), credentialsPath)}; password was not printed.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Local demo dataset seeding failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
