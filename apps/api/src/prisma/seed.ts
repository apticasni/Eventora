import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const IMAGES = {
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
  tech2: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
  design: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop',
  design2: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop',
  wellness: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
  photo: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&auto=format&fit=crop',
  music: 'https://images.unsplash.com/photo-1501386761578-eaa54b4fd2fa?w=800&auto=format&fit=crop',
  cooking: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop',
  leadership: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop',
  avatar1: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop',
  avatar2: 'https://images.unsplash.com/photo-1494790108755-2616b6bca7f0?w=200&auto=format&fit=crop',
  avatar3: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&auto=format&fit=crop',
};

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error(
      'This demo seed deletes all existing Eventora data. Set ALLOW_DESTRUCTIVE_SEED=true only on a disposable database.',
    );
  }

  const requiredPassword = (key: string) => {
    const password = process.env[key];
    if (!password || password.length < 12) {
      throw new Error(`${key} must be set to a password of at least 12 characters.`);
    }
    return password;
  };
  const adminPassword = requiredPassword('ADMIN_PASSWORD');
  const organizerPassword = requiredPassword('SEED_ORGANIZER_PASSWORD');
  const attendeePassword = requiredPassword('SEED_ATTENDEE_PASSWORD');
  if (new Set([adminPassword, organizerPassword, attendeePassword]).size !== 3) {
    throw new Error('Use a different password for each seeded account role.');
  }

  console.log('🌱 Seeding Eventora database...');

  // Clean up existing data
  await prisma.checkIn.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME || 'Eventora Admin',
      email: process.env.ADMIN_EMAIL || 'admin@eventora.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      isVerified: true,
      bio: 'Platform administrator for Eventora.',
      avatar: IMAGES.avatar1,
    },
  });

  // Create Organizers
  const org1Hash = await bcrypt.hash(organizerPassword, 12);
  const organizer1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@eventora.com',
      passwordHash: org1Hash,
      role: 'ORGANIZER',
      isVerified: true,
      bio: 'Senior UX Designer & Workshop Facilitator with 8 years of experience. Passionate about design thinking and human-centered design.',
      avatar: IMAGES.avatar2,
      interests: ['Design', 'Technology', 'Photography'],
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul@eventora.com',
      passwordHash: org1Hash,
      role: 'ORGANIZER',
      isVerified: true,
      bio: 'Tech entrepreneur and full-stack developer. Co-founder of two successful startups. Mentors aspiring developers.',
      avatar: IMAGES.avatar3,
      interests: ['Technology', 'Business', 'Leadership'],
    },
  });

  // Create Attendees
  const attHash = await bcrypt.hash(attendeePassword, 12);
  const attendee1 = await prisma.user.create({
    data: {
      name: 'Aisha Khan',
      email: 'aisha@example.com',
      passwordHash: attHash,
      role: 'ATTENDEE',
      isVerified: true,
      interests: ['Design', 'Photography'],
    },
  });

  const attendee2 = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'vikram@example.com',
      passwordHash: attHash,
      role: 'ATTENDEE',
      isVerified: true,
      interests: ['Technology', 'Business'],
    },
  });

  console.log('✅ Users created');

  // Create Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Technology', slug: 'technology', icon: '💻', description: 'Coding, AI, Web Dev, and more', color: '#3B82F6' } }),
    prisma.category.create({ data: { name: 'Design', slug: 'design', icon: '🎨', description: 'UI/UX, Graphic Design, Motion', color: '#8B5CF6' } }),
    prisma.category.create({ data: { name: 'Business', slug: 'business', icon: '📊', description: 'Entrepreneurship, Marketing, Finance', color: '#10B981' } }),
    prisma.category.create({ data: { name: 'Health & Wellness', slug: 'health-wellness', icon: '🧘', description: 'Yoga, Mindfulness, Nutrition', color: '#F59E0B' } }),
    prisma.category.create({ data: { name: 'Photography', slug: 'photography', icon: '📷', description: 'Portrait, Landscape, Editing', color: '#EF4444' } }),
    prisma.category.create({ data: { name: 'Music', slug: 'music', icon: '🎵', description: 'Instruments, Production, Theory', color: '#EC4899' } }),
    prisma.category.create({ data: { name: 'Cooking', slug: 'cooking', icon: '👩‍🍳', description: 'Cuisines, Techniques, Nutrition', color: '#F97316' } }),
    prisma.category.create({ data: { name: 'Leadership', slug: 'leadership', icon: '🚀', description: 'Management, Communication, Growth', color: '#06B6D4' } }),
  ]);

  const [techCat, designCat, bizCat, wellnessCat, photoCat, musicCat, cookingCat, leadershipCat] = categories;

  console.log('✅ Categories created');

  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Create Events
  const events = await Promise.all([
    // Featured Events
    prisma.event.create({
      data: {
        title: 'React & Next.js Masterclass 2024',
        slug: 'react-nextjs-masterclass-2024',
        description: 'Deep dive into modern React patterns, Next.js 14 App Router, Server Components, and TypeScript. This intensive 2-day workshop covers everything from hooks to performance optimization. You will build a production-ready application from scratch.',
        shortDescription: 'Master React 18, Next.js 14 App Router, and TypeScript in this intensive 2-day workshop.',
        coverImage: IMAGES.tech,
        categoryId: techCat.id,
        organizerId: organizer2.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(15),
        endDate: future(16),
        venueName: 'Bengaluru Tech Hub',
        venueAddress: '100 MG Road, Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        totalCapacity: 60,
        bookedSeats: 45,
        price: 4999,
        currency: 'INR',
        isFree: false,
        instructorName: 'Rahul Verma',
        instructorBio: 'Senior Developer, 10+ years building React applications at scale.',
        instructorAvatar: IMAGES.avatar3,
        tags: ['React', 'Next.js', 'TypeScript', 'JavaScript'],
        whatYouLearn: ['React 18 concurrent features', 'Next.js 14 App Router', 'TypeScript best practices', 'State management patterns', 'Performance optimization'],
        requirements: ['Basic JavaScript knowledge', 'A laptop with Node.js installed'],
        isFeatured: true,
        viewCount: 1240,
        schedule: [
          { day: 'Day 1', sessions: [{ time: '09:00', title: 'React Fundamentals & Hooks' }, { time: '14:00', title: 'Next.js App Router Deep Dive' }] },
          { day: 'Day 2', sessions: [{ time: '09:00', title: 'TypeScript & Type Safety' }, { time: '14:00', title: 'Performance & Deployment' }] },
        ],
      },
    }),

    prisma.event.create({
      data: {
        title: 'Figma UI/UX Design Intensive',
        slug: 'figma-ui-ux-design-intensive',
        description: 'Transform your design skills with this hands-on Figma workshop. Learn design systems, auto-layout, components, prototyping, and how to collaborate effectively with developers. Perfect for beginners and intermediate designers looking to level up.',
        shortDescription: 'Hands-on Figma workshop covering design systems, prototyping, and developer collaboration.',
        coverImage: IMAGES.design,
        categoryId: designCat.id,
        organizerId: organizer1.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(8),
        endDate: future(8),
        venueName: 'Mumbai Design Studio',
        venueAddress: '42 Bandra West, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        totalCapacity: 30,
        bookedSeats: 28,
        price: 2999,
        currency: 'INR',
        isFree: false,
        instructorName: 'Priya Sharma',
        instructorBio: 'Senior UX Designer at a top product company, Figma advocate and educator.',
        instructorAvatar: IMAGES.avatar2,
        tags: ['Figma', 'UI/UX', 'Design Systems', 'Prototyping'],
        whatYouLearn: ['Figma fundamentals and shortcuts', 'Design systems and components', 'Auto-layout mastery', 'Prototyping and animations', 'Handoff to developers'],
        requirements: ['No prior Figma experience needed', 'Laptop required'],
        isFeatured: true,
        viewCount: 980,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Startup Pitch & Fundraising Workshop',
        slug: 'startup-pitch-fundraising-workshop',
        description: 'Learn how to craft a compelling investor pitch, build financial models, and navigate the early-stage fundraising landscape. Featuring live pitch practice with real investor feedback and a networking dinner with 5+ active angel investors.',
        shortDescription: 'Craft your investor pitch and learn fundraising from active angel investors.',
        coverImage: IMAGES.business,
        categoryId: bizCat.id,
        organizerId: organizer2.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(22),
        endDate: future(22),
        venueName: 'Delhi Startup Hub',
        venueAddress: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        totalCapacity: 50,
        bookedSeats: 20,
        price: 3499,
        currency: 'INR',
        isFree: false,
        instructorName: 'Rahul Verma',
        instructorBio: 'Serial entrepreneur, angel investor, and startup mentor.',
        instructorAvatar: IMAGES.avatar3,
        tags: ['Startup', 'Fundraising', 'Pitch', 'Entrepreneurship'],
        whatYouLearn: ['Story structure for pitches', 'Financial modeling basics', 'Term sheet negotiation', 'Finding the right investors'],
        isFeatured: true,
        viewCount: 760,
      },
    }),

    // Online Events
    prisma.event.create({
      data: {
        title: 'Python for Data Science — Free Bootcamp',
        slug: 'python-data-science-free-bootcamp',
        description: 'A free 3-hour online bootcamp introducing Python for data analysis. Cover NumPy, Pandas, and Matplotlib. Get started on your data science journey with hands-on exercises and real datasets.',
        shortDescription: 'Free 3-hour intro to Python for data analysis with NumPy, Pandas, and Matplotlib.',
        coverImage: IMAGES.tech2,
        categoryId: techCat.id,
        organizerId: organizer2.id,
        status: 'PUBLISHED',
        format: 'ONLINE',
        startDate: future(5),
        endDate: future(5),
        onlineLink: 'https://meet.google.com/eventora-python',
        totalCapacity: 500,
        bookedSeats: 312,
        price: 0,
        currency: 'INR',
        isFree: true,
        instructorName: 'Rahul Verma',
        instructorAvatar: IMAGES.avatar3,
        tags: ['Python', 'Data Science', 'Pandas', 'Free'],
        whatYouLearn: ['Python basics for data analysis', 'NumPy arrays', 'Pandas DataFrames', 'Data visualization with Matplotlib'],
        isFeatured: false,
        viewCount: 3400,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Mindful Leadership: Leading with Empathy',
        slug: 'mindful-leadership-empathy',
        description: 'In this half-day virtual workshop, explore how mindfulness practices can transform your leadership style. Learn techniques to manage stress, improve team communication, and make decisions with clarity and compassion.',
        shortDescription: 'Transform your leadership style with mindfulness and empathy practices.',
        coverImage: IMAGES.leadership,
        categoryId: leadershipCat.id,
        organizerId: organizer1.id,
        status: 'PUBLISHED',
        format: 'ONLINE',
        startDate: future(12),
        endDate: future(12),
        onlineLink: 'https://zoom.us/eventora-leadership',
        totalCapacity: 100,
        bookedSeats: 67,
        price: 1999,
        currency: 'INR',
        isFree: false,
        instructorName: 'Priya Sharma',
        instructorAvatar: IMAGES.avatar2,
        tags: ['Leadership', 'Mindfulness', 'Management', 'Communication'],
        isFeatured: false,
        viewCount: 540,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Mobile Photography Masterclass',
        slug: 'mobile-photography-masterclass',
        description: 'Elevate your smartphone photography to professional levels. Learn composition, lighting, editing with Lightroom Mobile, and how to build a stunning portfolio that can attract clients and followers.',
        shortDescription: 'Transform your smartphone into a professional photography tool.',
        coverImage: IMAGES.photo,
        categoryId: photoCat.id,
        organizerId: organizer1.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(30),
        endDate: future(30),
        venueName: 'Pune Art Center',
        venueAddress: '15 Koregaon Park, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        totalCapacity: 20,
        bookedSeats: 12,
        price: 2499,
        currency: 'INR',
        isFree: false,
        instructorName: 'Priya Sharma',
        instructorAvatar: IMAGES.avatar2,
        tags: ['Photography', 'Mobile', 'Lightroom', 'Portfolio'],
        isFeatured: false,
        viewCount: 420,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Italian Cooking Masterclass',
        slug: 'italian-cooking-masterclass',
        description: 'Discover the secrets of authentic Italian cuisine in this hands-on cooking class. Make fresh pasta from scratch, learn classic sauces, and enjoy a full 3-course meal with wine pairing. Small group size ensures personalized attention.',
        shortDescription: 'Make fresh pasta and classic Italian dishes in this intimate cooking class.',
        coverImage: IMAGES.cooking,
        categoryId: cookingCat.id,
        organizerId: organizer1.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(18),
        endDate: future(18),
        venueName: "Chef's Studio Mumbai",
        venueAddress: '7 Linking Road, Bandra, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        totalCapacity: 12,
        bookedSeats: 10,
        price: 3999,
        currency: 'INR',
        isFree: false,
        instructorName: 'Marco Rossi',
        instructorBio: 'Trained in Bologna, Italy. 15 years of culinary experience.',
        tags: ['Cooking', 'Italian', 'Pasta', 'Wine'],
        whatYouLearn: ['Fresh pasta from scratch', 'Classic Italian sauces', 'Wine and food pairing', 'Italian culinary traditions'],
        isFeatured: false,
        viewCount: 890,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Electronic Music Production with Ableton',
        slug: 'electronic-music-production-ableton',
        description: 'Get started with Ableton Live and learn to produce professional-quality electronic music. Cover sampling, synthesis, sound design, mixing, and mastering. Walk away with a complete track ready for release.',
        shortDescription: 'Produce your first electronic track with Ableton Live — from idea to release.',
        coverImage: IMAGES.music,
        categoryId: musicCat.id,
        organizerId: organizer2.id,
        status: 'PUBLISHED',
        format: 'ONLINE',
        startDate: future(25),
        endDate: future(25),
        onlineLink: 'https://zoom.us/eventora-music',
        totalCapacity: 40,
        bookedSeats: 18,
        price: 2299,
        currency: 'INR',
        isFree: false,
        instructorName: 'DJ Matrix',
        instructorBio: 'Music producer with 10 million streams. Ableton certified trainer.',
        tags: ['Music', 'Ableton', 'Production', 'Electronic'],
        isFeatured: false,
        viewCount: 310,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Morning Yoga & Mindfulness Retreat',
        slug: 'morning-yoga-mindfulness-retreat',
        description: 'Start your weekend with intention. This immersive morning retreat combines Hatha yoga, pranayama breathing, and guided meditation. All levels welcome. Includes a nourishing herbal breakfast.',
        shortDescription: 'Weekend morning yoga, pranayama, and guided meditation with herbal breakfast.',
        coverImage: IMAGES.wellness,
        categoryId: wellnessCat.id,
        organizerId: organizer1.id,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        startDate: future(7),
        endDate: future(7),
        venueName: 'Serenity Wellness Center',
        venueAddress: 'Indiranagar, Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        totalCapacity: 25,
        bookedSeats: 25,
        price: 1499,
        currency: 'INR',
        isFree: false,
        instructorName: 'Ananya Rao',
        instructorBio: 'Certified yoga instructor with 12 years of practice and teaching.',
        tags: ['Yoga', 'Mindfulness', 'Wellness', 'Meditation'],
        isFeatured: true,
        viewCount: 1100,
      },
    }),

    // Past events for reviews and certificates
    prisma.event.create({
      data: {
        title: 'JavaScript Fundamentals Workshop',
        slug: 'javascript-fundamentals-workshop',
        description: 'A comprehensive introduction to JavaScript for beginners. Covers variables, functions, DOM manipulation, and modern ES6+ features.',
        shortDescription: 'Introduction to JavaScript for beginners.',
        coverImage: IMAGES.tech,
        categoryId: techCat.id,
        organizerId: organizer2.id,
        status: 'COMPLETED',
        format: 'ONLINE',
        startDate: past(20),
        endDate: past(20),
        onlineLink: 'https://zoom.us/past-event',
        totalCapacity: 100,
        bookedSeats: 80,
        price: 0,
        currency: 'INR',
        isFree: true,
        instructorName: 'Rahul Verma',
        instructorAvatar: IMAGES.avatar3,
        tags: ['JavaScript', 'Web Development', 'Beginner'],
        isFeatured: false,
        viewCount: 2100,
      },
    }),

    prisma.event.create({
      data: {
        title: 'Design Thinking for Product Managers',
        slug: 'design-thinking-product-managers',
        description: 'Apply design thinking principles to product development. Learn empathy mapping, ideation, prototyping, and validation through interactive exercises.',
        shortDescription: 'Apply design thinking to ship better products.',
        coverImage: IMAGES.design2,
        categoryId: designCat.id,
        organizerId: organizer1.id,
        status: 'COMPLETED',
        format: 'IN_PERSON',
        startDate: past(30),
        endDate: past(30),
        venueName: 'Innovation Hub',
        city: 'Hyderabad',
        state: 'Telangana',
        totalCapacity: 40,
        bookedSeats: 35,
        price: 2499,
        currency: 'INR',
        isFree: false,
        instructorName: 'Priya Sharma',
        instructorAvatar: IMAGES.avatar2,
        tags: ['Design Thinking', 'Product Management', 'UX'],
        isFeatured: false,
        viewCount: 760,
      },
    }),

    // Draft event
    prisma.event.create({
      data: {
        title: 'Advanced Machine Learning with Python',
        slug: 'advanced-machine-learning-python',
        description: 'Deep dive into supervised and unsupervised learning, neural networks, and deployment using scikit-learn, TensorFlow, and FastAPI.',
        shortDescription: 'Advanced ML workshop covering neural networks and model deployment.',
        coverImage: IMAGES.tech2,
        categoryId: techCat.id,
        organizerId: organizer2.id,
        status: 'DRAFT',
        format: 'ONLINE',
        startDate: future(45),
        endDate: future(47),
        totalCapacity: 30,
        bookedSeats: 0,
        price: 5999,
        currency: 'INR',
        isFree: false,
        instructorName: 'Rahul Verma',
        instructorAvatar: IMAGES.avatar3,
        tags: ['Machine Learning', 'Python', 'TensorFlow', 'AI'],
        isFeatured: false,
        viewCount: 0,
      },
    }),
  ]);

  console.log('✅ Events created');

  // Create confirmed bookings for past events
  const jsEvent = events[9]; // JavaScript Fundamentals (past, free)
  const dtEvent = events[10]; // Design Thinking (past, paid)

  const booking1 = await prisma.booking.create({
    data: {
      userId: attendee1.id,
      eventId: jsEvent.id,
      seats: 1,
      totalAmount: 0,
      status: 'CONFIRMED',
      reference: 'EVT-JS-001',
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      userId: attendee2.id,
      eventId: jsEvent.id,
      seats: 1,
      totalAmount: 0,
      status: 'CONFIRMED',
      reference: 'EVT-JS-002',
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      userId: attendee1.id,
      eventId: dtEvent.id,
      seats: 1,
      totalAmount: 2499,
      status: 'CONFIRMED',
      reference: 'EVT-DT-001',
    },
  });

  // Create tickets for past bookings
  await prisma.ticket.create({ data: { bookingId: booking1.id, seatNumber: 1, code: 'TKT-JS-001', qrCode: null } });
  await prisma.ticket.create({ data: { bookingId: booking2.id, seatNumber: 1, code: 'TKT-JS-002', qrCode: null } });
  await prisma.ticket.create({ data: { bookingId: booking3.id, seatNumber: 1, code: 'TKT-DT-001', qrCode: null } });

  // Create reviews for past events
  await prisma.review.create({
    data: {
      userId: attendee1.id,
      eventId: jsEvent.id,
      rating: 5,
      comment: 'Excellent workshop! Rahul explains concepts clearly and the hands-on exercises were very helpful. Highly recommend for beginners.',
    },
  });

  await prisma.review.create({
    data: {
      userId: attendee2.id,
      eventId: jsEvent.id,
      rating: 4,
      comment: 'Great content and well-structured. Would have loved more time for Q&A. Overall a fantastic learning experience.',
    },
  });

  await prisma.review.create({
    data: {
      userId: attendee1.id,
      eventId: dtEvent.id,
      rating: 5,
      comment: "Priya's design thinking workshop completely changed how I approach product problems. The empathy mapping exercise was eye-opening!",
    },
  });

  console.log('✅ Bookings and reviews created');

  // Create a sample proposal
  await prisma.proposal.create({
    data: {
      title: 'Kubernetes for Developers',
      description: 'A practical workshop on deploying and managing containerized applications with Kubernetes. Covers pods, deployments, services, and Helm charts.',
      category: 'Technology',
      proposedDate: future(60),
      format: 'ONLINE',
      estimatedCapacity: 50,
      price: 3999,
      organizerId: organizer2.id,
      status: 'PENDING',
    },
  });

  console.log('✅ Proposals created');
  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('Seed account passwords are supplied through environment variables and are never logged.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
