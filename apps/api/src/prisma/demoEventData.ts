import { EventFormat, EventStatus } from '@prisma/client';

export const demoCategories = [
  {
    name: 'Technology',
    slug: 'technology',
    icon: '💻',
    description: 'Software, data, and emerging technology workshops.',
    color: '#3B82F6',
  },
  {
    name: 'Design',
    slug: 'design',
    icon: '🎨',
    description: 'Product design, user research, and visual craft.',
    color: '#8B5CF6',
  },
  {
    name: 'Business',
    slug: 'business',
    icon: '📊',
    description: 'Practical sessions for founders and growing teams.',
    color: '#10B981',
  },
  {
    name: 'Creative Arts',
    slug: 'creative-arts',
    icon: '✍️',
    description: 'Hands-on creative practice, photography, and storytelling.',
    color: '#F97316',
  },
] as const;

export interface DemoEventDefinition {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categorySlug: (typeof demoCategories)[number]['slug'];
  format: EventFormat;
  daysFromNow: number;
  durationHours: number;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  state: string | null;
  onlineLink: string | null;
  totalCapacity: number;
  price: number;
  instructorName: string;
  instructorBio: string;
  eventType: 'workshop' | 'masterclass';
  tags: string[];
  requirements: string[];
  whatYouLearn: string[];
}

export const demoEvents: DemoEventDefinition[] = [
  {
    slug: 'eventora-demo-ai-product-lab',
    title: 'AI Product Lab: From Prototype to Practical Tool',
    shortDescription: 'Build and evaluate a useful AI-powered product prototype in a guided studio.',
    description: 'A practical workshop for product builders exploring how to turn a promising AI feature into a dependable user experience. Map a real workflow, prototype an interaction, and evaluate quality, limitations, and responsible rollout with an experienced facilitator.',
    categorySlug: 'technology',
    format: EventFormat.IN_PERSON,
    daysFromNow: 18,
    durationHours: 4,
    venueName: '91springboard Koramangala',
    venueAddress: '80 Feet Road, Koramangala 8th Block',
    city: 'Bengaluru',
    state: 'Karnataka',
    onlineLink: null,
    totalCapacity: 24,
    price: 2499,
    instructorName: 'Ananya Rao',
    instructorBio: 'Ananya is a product lead who helps teams evaluate AI features and build practical, responsible user experiences.',
    eventType: 'workshop',
    tags: ['AI', 'product', 'prototyping'],
    requirements: ['Bring a laptop.', 'No machine-learning experience is required.'],
    whatYouLearn: ['Map an AI product workflow.', 'Prototype a user-facing interaction.', 'Plan a practical quality review.'],
  },
  {
    slug: 'eventora-demo-data-storytelling',
    title: 'Data Storytelling with Python and Observable Charts',
    shortDescription: 'Turn a small dataset into a clear, compelling visual narrative.',
    description: 'Learn a repeatable process for exploring a dataset, choosing an appropriate visual form, and explaining the result to a non-technical audience. The session combines short demonstrations with guided exercises and peer review.',
    categorySlug: 'technology',
    format: EventFormat.ONLINE,
    daysFromNow: 26,
    durationHours: 3,
    venueName: null,
    venueAddress: null,
    city: null,
    state: null,
    onlineLink: null,
    totalCapacity: 40,
    price: 1499,
    instructorName: 'Karthik Menon',
    instructorBio: 'Karthik teaches data communication and helps analysts make complex findings clear to broad audiences.',
    eventType: 'masterclass',
    tags: ['data', 'Python', 'visualization'],
    requirements: ['Basic spreadsheet familiarity.', 'A laptop with a modern browser.'],
    whatYouLearn: ['Ask useful questions of a dataset.', 'Choose readable chart types.', 'Present findings with context.'],
  },
  {
    slug: 'eventora-demo-product-design-sprint',
    title: 'Product Design Sprint: Research to Clickable Prototype',
    shortDescription: 'Practice a focused design process from user problem to testable prototype.',
    description: 'Work in a small team to frame a customer problem, sketch alternative solutions, and assemble a clickable prototype. The facilitator introduces lightweight research techniques and gives structured feedback throughout the day.',
    categorySlug: 'design',
    format: EventFormat.IN_PERSON,
    daysFromNow: 32,
    durationHours: 6,
    venueName: 'WeWork Galaxy',
    venueAddress: '43 Residency Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    onlineLink: null,
    totalCapacity: 20,
    price: 3299,
    instructorName: 'Priya Nair',
    instructorBio: 'Priya is a product designer and facilitator focused on inclusive research and rapid prototyping.',
    eventType: 'workshop',
    tags: ['UX', 'product design', 'prototyping'],
    requirements: ['Bring a laptop.', 'No prior design-tool experience is required.'],
    whatYouLearn: ['Frame a focused design challenge.', 'Sketch and compare interface ideas.', 'Prepare a prototype for user feedback.'],
  },
  {
    slug: 'eventora-demo-design-systems',
    title: 'Design Systems in Practice: Tokens, Components, and Handoffs',
    shortDescription: 'Create a small, maintainable design-system foundation for a product team.',
    description: 'Explore how design tokens, accessible component patterns, and clear documentation help teams ship consistent interfaces. Participants will audit a sample interface and build a compact component specification.',
    categorySlug: 'design',
    format: EventFormat.ONLINE,
    daysFromNow: 45,
    durationHours: 3,
    venueName: null,
    venueAddress: null,
    city: null,
    state: null,
    onlineLink: null,
    totalCapacity: 35,
    price: 1799,
    instructorName: 'Rahul Shah',
    instructorBio: 'Rahul is a design systems specialist who helps product teams build accessible, maintainable interface libraries.',
    eventType: 'masterclass',
    tags: ['design systems', 'accessibility', 'UI'],
    requirements: ['Familiarity with a design or interface tool is helpful.'],
    whatYouLearn: ['Name and organize reusable tokens.', 'Document component behavior and states.', 'Improve designer-engineer handoffs.'],
  },
  {
    slug: 'eventora-demo-founder-finance',
    title: 'Founder Finance Essentials: Runway, Pricing, and Planning',
    shortDescription: 'Build a practical view of cash runway and early-stage pricing decisions.',
    description: 'A hands-on introduction to the financial questions early founders face. Use a simple planning model to explore cash runway, operating assumptions, and pricing scenarios, then leave with a short list of metrics to review regularly.',
    categorySlug: 'business',
    format: EventFormat.IN_PERSON,
    daysFromNow: 54,
    durationHours: 4,
    venueName: 'The Executive Centre, BKC',
    venueAddress: 'Level 12, One BKC, Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    onlineLink: null,
    totalCapacity: 28,
    price: 2199,
    instructorName: 'Devika Iyer',
    instructorBio: 'Devika advises early-stage founders on operating plans, cash runway, and sustainable pricing.',
    eventType: 'masterclass',
    tags: ['founders', 'finance', 'pricing'],
    requirements: ['Bring a laptop or notebook.', 'No accounting background is required.'],
    whatYouLearn: ['Estimate runway from operating assumptions.', 'Compare early pricing scenarios.', 'Choose a small set of useful operating metrics.'],
  },
  {
    slug: 'eventora-demo-brand-storytelling',
    title: 'Brand Storytelling for Small Businesses',
    shortDescription: 'Clarify your brand message and turn it into a consistent customer story.',
    description: 'Develop a clear narrative for a small business or independent practice. Through guided prompts and practical examples, participants will shape a value proposition, identify audience needs, and draft messaging for a landing page or campaign.',
    categorySlug: 'business',
    format: EventFormat.ONLINE,
    daysFromNow: 67,
    durationHours: 2,
    venueName: null,
    venueAddress: null,
    city: null,
    state: null,
    onlineLink: null,
    totalCapacity: 45,
    price: 999,
    instructorName: 'Meera Joshi',
    instructorBio: 'Meera is a brand strategist who works with independent businesses on clear customer-focused messaging.',
    eventType: 'workshop',
    tags: ['branding', 'marketing', 'storytelling'],
    requirements: ['Bring an idea or existing business to use in exercises.'],
    whatYouLearn: ['Describe a clear customer value proposition.', 'Build a concise brand narrative.', 'Adapt messaging to a landing page.'],
  },
  {
    slug: 'eventora-demo-street-photography',
    title: 'Street Photography: Light, Composition, and Observation',
    shortDescription: 'Practice seeing everyday city scenes through light and composition.',
    description: 'A guided photo walk and review for curious photographers. Learn to notice changing light, build stronger frames, and approach public spaces respectfully. The workshop closes with a small-group image review and editing discussion.',
    categorySlug: 'creative-arts',
    format: EventFormat.IN_PERSON,
    daysFromNow: 76,
    durationHours: 3,
    venueName: 'Kala Ghoda Arts Precinct',
    venueAddress: 'Fort, South Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    onlineLink: null,
    totalCapacity: 16,
    price: 1299,
    instructorName: 'Arjun Das',
    instructorBio: 'Arjun is a documentary photographer and educator who leads small-group photo walks in Indian cities.',
    eventType: 'workshop',
    tags: ['photography', 'composition', 'creative'],
    requirements: ['Bring a camera or a smartphone with a camera.', 'Comfortable walking shoes recommended.'],
    whatYouLearn: ['Read natural light in public spaces.', 'Compose stronger candid frames.', 'Review images with constructive critique.'],
  },
  {
    slug: 'eventora-demo-creative-writing',
    title: 'Creative Writing Studio: Characters, Scenes, and Voice',
    shortDescription: 'Explore short-form storytelling through playful guided writing exercises.',
    description: 'A welcoming writing studio for beginners and returning writers. Use timed prompts to develop a character, write a vivid scene, and experiment with voice. Sharing is optional, and feedback focuses on encouragement and craft.',
    categorySlug: 'creative-arts',
    format: EventFormat.IN_PERSON,
    daysFromNow: 91,
    durationHours: 2,
    venueName: 'Atta Galatta',
    venueAddress: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    onlineLink: null,
    totalCapacity: 18,
    price: 899,
    instructorName: 'Leena Thomas',
    instructorBio: 'Leena is a writer and workshop leader who teaches approachable techniques for short-form fiction.',
    eventType: 'workshop',
    tags: ['writing', 'storytelling', 'creative'],
    requirements: ['Bring a notebook or laptop.', 'No previous writing experience is needed.'],
    whatYouLearn: ['Create a character with a clear point of view.', 'Use sensory detail to shape a scene.', 'Experiment with narrative voice.'],
  },
  {
    slug: 'eventora-demo-ceramic-form',
    title: 'Ceramic Form and Surface: A Beginner Hand-Building Session',
    shortDescription: 'Learn foundational hand-building techniques and decorate a small clay form.',
    description: 'Discover the tactile basics of working with clay in a small-group studio session. Practice pinching, slab construction, and simple surface decoration while learning how drying and firing affect a finished piece.',
    categorySlug: 'creative-arts',
    format: EventFormat.IN_PERSON,
    daysFromNow: 108,
    durationHours: 3,
    venueName: 'The Pottery Lab',
    venueAddress: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    onlineLink: null,
    totalCapacity: 12,
    price: 1899,
    instructorName: 'Nandita Rao',
    instructorBio: 'Nandita is a ceramic artist who teaches hand-building, surface decoration, and studio practice to beginners.',
    eventType: 'workshop',
    tags: ['ceramics', 'hand-building', 'craft'],
    requirements: ['All clay and basic tools are provided.', 'Wear clothes suitable for a hands-on studio.'],
    whatYouLearn: ['Prepare and shape clay by hand.', 'Apply simple surface textures.', 'Understand basic drying and firing stages.'],
  },
];

export function getDemoEventDates(now: Date, daysFromNow: number, durationHours: number) {
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() + daysFromNow);
  startDate.setUTCHours(10, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setUTCHours(endDate.getUTCHours() + durationHours);

  return { startDate, endDate };
}
