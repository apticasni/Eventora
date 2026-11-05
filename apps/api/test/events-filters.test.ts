import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventsRouter } from '../src/routes/events';
import { errorHandler } from '../src/middleware/errorHandler';
import { prisma } from '../src/lib/prisma';

let server: Server | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
    server = undefined;
  }
});

async function startEventsServer(): Promise<string> {
  const app = express();
  app.use('/api/events', eventsRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe('event discovery filters', () => {
  it('applies topic and workshop type filters to published database events', async () => {
    const findMany = vi.spyOn(prisma.event, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.event, 'count').mockResolvedValue(0);
    vi.spyOn(prisma, '$transaction').mockImplementation(((operations: Promise<unknown>[]) =>
      Promise.all(operations)) as never);
    const origin = await startEventsServer();

    const response = await fetch(`${origin}/api/events?category=design&type=workshop`);
    expect(response.status).toBe(200);
    expect(findMany.mock.calls[0][0]?.where).toEqual({
      status: 'PUBLISHED',
      category: { slug: 'design' },
      tags: { has: 'workshop' },
    });
  });

  it('rejects unknown discovery types instead of returning an unfiltered catalog', async () => {
    const origin = await startEventsServer();
    const response = await fetch(`${origin}/api/events?type=conference`);
    expect(response.status).toBe(400);
  });
});
