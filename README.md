PromptGen is a professional prompt workspace for building reusable AI prompts.

## Features
- Prompt templates for common workflows
- Persona, context, format, and tone controls
- Continuity mode that reuses recent outputs
- Local prompt history stored in the browser
- One-click copy and open actions for popular AI tools

## Getting Started
Install dependencies:

```bash
npm install
```

Create an `.env.local` file with your API key (see `.env.example`):

```bash
GEMINI_API_KEY=your_key_here
```

Optional production settings:

```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
GEMINI_REQUEST_TIMEOUT_MS=20000
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

## Production
Build and start the app:

```bash
npm run build
npm run start
```

## Notes
- Prompt history stays local in your browser storage.
- The Gemini API route applies a simple in-memory rate limit per client IP.
- Update `src/app/api/gemini/route.ts` if you want to use a different model.
