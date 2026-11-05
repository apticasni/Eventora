import '../lib/loadEnv';
import { URL } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';
import { demoCategories, demoEvents, getDemoEventDates } from './demoEventData';

function getLocalDatabaseUrl(): URL {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Additive demo event seeding is disabled in production.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for local demo seeding.');
  let url: URL;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL is invalid; demo event seeding was not run.');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname) && url.port === '5433';
  const composeHost = url.hostname === 'postgres' && url.port === '5432';
  if (database !== 'eventora_local' || (!localHost && !composeHost)) {
    throw new Error('Refusing to seed: this script only accepts the local eventora_local database.');
  }
  return url;
}

async function main() {
  getLocalDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const [identity] = await prisma.$queryRaw<Array<{ database: string; port: number }>>`
      SELECT current_database() AS database, inet_server_port() AS port
    `;
    if (identity?.database !== 'eventora_local' || identity.port !== 5432) {
      throw new Error('Refusing to seed: connected PostgreSQL identity is not the local Eventora database.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const organizer = await tx.user.findFirst({
        where: { role: 'ORGANIZER' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, email: true },
      });
      if (!organizer) {
        throw new Error('No existing ORGANIZER account was found; no demo data was written.');
      }

      const categoriesAdded = await tx.category.createMany({
        data: demoCategories.map((category) => ({ ...category })),
        skipDuplicates: true,
      });
      const savedCategories = await tx.category.findMany({
        where: {
          OR: [
            { slug: { in: demoCategories.map(({ slug }) => slug) } },
            { name: { in: demoCategories.map(({ name }) => name) } },
          ],
        },
        select: { id: true, name: true, slug: true },
      });
      const categories = new Map(
        demoCategories.map((requested) => {
          const category = savedCategories.find(
            (saved) => saved.slug === requested.slug || saved.name === requested.name,
          );
          if (!category) throw new Error(`Could not resolve category ${requested.name}.`);
          return [requested.slug, category] as const;
        }),
      );

      const now = new Date();
      const eventRows: Prisma.EventCreateManyInput[] = demoEvents.map((event) => {
        const category = categories.get(event.categorySlug);
        if (!category) throw new Error(`Missing category for demo event ${event.slug}.`);
        const { startDate, endDate } = getDemoEventDates(now, event.daysFromNow, event.durationHours);
        return {
          slug: event.slug,
          title: event.title,
          shortDescription: event.shortDescription,
          description: event.description,
          categoryId: category.id,
          organizerId: organizer.id,
          status: 'PUBLISHED',
          format: event.format,
          startDate,
          endDate,
          timezone: 'Asia/Kolkata',
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          city: event.city,
          state: event.state,
          country: 'India',
          onlineLink: event.onlineLink,
          totalCapacity: event.totalCapacity,
          bookedSeats: 0,
          price: event.price,
          currency: 'INR',
          isFree: event.price === 0,
          instructorName: event.instructorName,
          instructorBio: event.instructorBio,
          tags: [...event.tags, event.eventType],
          requirements: event.requirements,
          whatYouLearn: event.whatYouLearn,
          isFeatured: false,
        };
      });

      const inserted = await tx.event.createMany({
        data: eventRows,
        skipDuplicates: true,
      });
      const slugs = demoEvents.map(({ slug }) => slug);
      const present = await tx.event.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true },
      });

      return {
        categoriesAdded: categoriesAdded.count,
        addedEvents: inserted.count,
        events: present,
      };
    });

    console.log('Verified local Eventora database. Existing organizer account used; no users were created or changed.');
    console.log(`Categories newly added: ${result.categoriesAdded} of ${demoCategories.length}`);
    console.log(`Demo events newly added: ${result.addedEvents}`);
    console.log(`Demo event records present: ${result.events.length}`);
    for (const event of demoEvents) {
      console.log(`- ${event.title} [${event.slug}]`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Local demo event seeding failed. Check the local database connection and existing organizer data.');
  process.exitCode = 1;
});
