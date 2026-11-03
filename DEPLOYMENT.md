# Eventora deployment

## Database and migrations

Create a PostgreSQL project in Neon and copy its **direct** connection string into
`DATABASE_URL`. Keep the URL in the API service's secret environment variables; do
not add it to source control, frontend variables, or screenshots. The API uses Prisma
with PostgreSQL. The initial migration in `apps/api/prisma/migrations` is additive,
but it is intended for a new, empty database.

Before deploying an existing database, take a backup and compare its schema with
`apps/api/prisma/schema.prisma`. This repository had no migration history at setup.
Do not run the initial migration against an existing schema: baseline it with
`prisma migrate resolve --applied <migration-name>` only after confirming that its
schema already matches. Do not use `prisma db push` in production.

Profile photos are resized to 320 pixels and stored as bounded JPEG data URLs in
the existing PostgreSQL `User.avatar` field, so they persist across API restarts
without relying on Render's ephemeral filesystem.

For a new empty database, apply the checked-in migrations once from the API
workspace after setting `DATABASE_URL`:

```powershell
npm run db:generate
npm run db:migrate
```

`npm run db:migrate` uses `prisma migrate deploy` and never resets data. The demo
seed is not part of deployment. It deletes all application rows and now refuses to
run unless `ALLOW_DESTRUCTIVE_SEED=true` is explicitly set; use only with a
disposable database. The seed also requires unique 12-character
`ADMIN_PASSWORD`, `SEED_ORGANIZER_PASSWORD`, and `SEED_ATTENDEE_PASSWORD` values
and never prints their values.

## Render API

Create a Render Web Service from this repository and use the included `render.yaml`
Blueprint. It builds the shared package and API, starts the Express service, and
checks `/health`. Set the prompted secret values in Render's environment settings:

- `DATABASE_URL`: Neon direct PostgreSQL connection string.
- `JWT_SECRET`: unique random secret, at least 32 characters.
- `FRONTEND_URL`: exact Vercel production origin, for example
  `https://<your-app>.vercel.app` (no trailing slash). Comma-separated exact
  origins are supported when additional trusted origins are needed.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: Razorpay
  **Test Mode** values.

Render supplies `PORT`. Do not add secrets to the Blueprint or commit `.env` files.
The API health check also verifies its PostgreSQL connection.

## Vercel frontend

Import the same repository into Vercel and set the project Root Directory to
`apps/web`. The included `apps/web/vercel.json` installs from the workspace root
and builds the shared and web packages. Use Node.js 22.

Set these Vercel environment variables for every environment that should run the
application, then redeploy (the `NEXT_PUBLIC_*` values are embedded at build time):

- `NEXT_PUBLIC_API_URL`: deployed Render URL ending in `/api`, e.g.
  `https://<your-api>.onrender.com/api`.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: the same Razorpay Test Mode key ID as the API.
- `NEXT_PUBLIC_APP_NAME`: `Eventora`.

The API allows credentials and production auth cookies use `SameSite=None; Secure`
for the cross-origin frontend/backend setup. Keep `FRONTEND_URL` restricted to
trusted Vercel origins. The API accepts only `rzp_test_` key IDs so live Razorpay
credentials cannot silently switch this deployment into live payments.

## Razorpay Test Mode webhook

In the Razorpay Test Mode dashboard, create a webhook pointing to
`https://<your-api>.onrender.com/api/payments/webhook`. Subscribe to
`payment.captured` and `payment.failed`, choose a webhook secret, and set that
secret as `RAZORPAY_WEBHOOK_SECRET` in Render. Set the Test Mode key ID and secret
in both deployments as described above. Never set live Razorpay keys for this
configuration.

## External setup still required

Deployment cannot be completed from this workspace: it has no Render/Vercel
authorization, and the local Neon URL is a sample endpoint rather than a usable
database credential. Provide a real Neon direct connection string and authorize
the Render and Vercel GitHub integrations when ready. Review the initial migration
target before applying it; existing database data must be backed up and preserved.
