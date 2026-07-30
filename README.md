<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a2d777e7-b577-415f-bd69-96c4da2957ac

## Run Locally

**Prerequisites:** Node.js, a PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — any random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `GEMINI_API_KEY` — your Gemini API key, if using AI features
3. Create the schema and seed demo data:
   `npm run migrate`
4. Run the app:
   `npm run dev`
5. Run the test suite:
   `npm test`
