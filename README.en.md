# Fursona Atelier

<p align="right">
  <strong>Language:</strong>
  <a href="./README.md">中文</a> |
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="./public/ai-fursona-mobile-style-v1.png" alt="Fursona Atelier mobile UI preview" width="760" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-111111?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-SDK-111111?logo=openai" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-Tested-6e9f18?logo=vitest&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue" />
</p>

**Version:** V1.2.0<br>
**Author:** DingC<br>
**License:** [MIT](./LICENSE)

Fursona Atelier is a mobile-first AI fursona design tool. Users answer a subtle quick quiz or a deeper branching questionnaire to describe personality, aesthetics, world-building preferences, and design boundaries. The app first uses a local rule engine to infer species candidates, lineage, and conflicts, then calls OpenAI to generate a structured character spec, a complete scene image, and a multi-view reference sheet.

## Highlights

- **Mobile-first experience**: the main flow is designed for phone-sized interaction, with desktop acting as a centered preview.
- **Two quiz modes**: a fixed 12-question quick flow plus a deeper branching bank for detailed customization.
- **Subtle scoring**: users see narrative choices while the backend accumulates personality, aesthetic, world, material, lineage, and species signals.
- **Local rule engine**: creates a `scoreSnapshot`, species candidates, lineage recommendation, and conflict hints before AI generation.
- **Lineage control**: supports `AI recommended`, `pure`, and `hybrid` generation modes to reduce random trait mixing.
- **Editable confirmation step**: before generation, users can edit positioning, height, body type, keywords, visual details, and image prompts. Edits are applied to the current generation.
- **Two runtime modes**: the open-source branch works without accounts, while the deployment branch enables local email/password accounts, credits, and private history.
- **Local persistence**: SQLite stores users, credits, jobs, and character specs; generated images stay in a private local data directory.
- **Asynchronous queue**: concurrent requests are processed in database order, failed jobs are refunded, and expired leases can be recovered.
- **Two consistent image outputs**: the complete scene and reference sheet are derived from the same structured spec to reduce character drift.
- **Board-style reference sheet**: the reference output is guided toward a vertical character sheet with front/back views, expression grid, detail close-ups, outfit variations, items, palette, personal-space scene, and turnaround strip.
- **Result actions**: save images, copy setting text, and retry a single image.

## Preview

| Complete Scene | Reference Sheet |
| --- | --- |
| <img src="./public/sample-complete-scene.png" alt="Complete scene sample" width="420" /> | <img src="./public/sample-reference-sheet.png" alt="Reference sheet sample" width="420" /> |

## Generation Flow

```text
Fixed Q12 or deep branching question bank
-> Local scoring engine creates scoreSnapshot
-> Pre-generation review and conflict detection
-> Rule engine infers species and lineage
-> Confirmation page edits the character spec and image prompts
-> Generate or confirm character_spec_json
-> Two image prompts are derived from the same JSON
-> OpenAI image model generates complete scene and reference sheet in parallel
-> SQLite stores the job and character spec; images are stored privately on disk
-> Result and history views load the character spec and both images
```

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Node.js SQLite
- Vitest
- ESLint

## Project Structure

```text
src/app/page.tsx                         Mobile UI and interaction flow
src/app/api/auth/                         Local signup, login, and logout
src/app/api/generate/jobs/                Asynchronous generation jobs
src/app/api/assets/                       Authenticated image delivery
src/app/api/generate/schema.ts           Structured character-spec JSON Schema
src/app/api/regenerate-image/jobs/       Single-image redraw jobs
src/data/quickQuestions.ts               Fixed 12-question quick bank
src/data/deepQuestionBank.ts             Local deep branching question bank
src/data/species.ts                      Species mapping and weights
src/data/scoringRules.ts                 Combination boosts and lineage thresholds
src/lib/scoring.ts                       Local scoring engine
src/lib/questionFlow.ts                  Deep branch selector
src/lib/conflicts.ts                     Setting conflict detection
src/lib/characterSpecEditing.ts          Confirmation-page draft merge logic
src/lib/fursona.ts                       Fursona rule inference and fallback spec
src/lib/openai.ts                        OpenAI SDK configuration
src/lib/localDatabase.ts                 SQLite schema and transactions
src/lib/localAuth.ts                     Password hashing and database sessions
src/lib/asyncJobs.ts                     Credit reservation and queue leases
src/lib/generationStorage.ts             Private local image storage
public/                                  Static images for GitHub and frontend use
assets/                                  Product visual references
docs/                                    PRD, question-bank, and implementation docs
```

## Local Setup

Copy the environment template:

```powershell
Copy-Item .env.local.example .env.local
```

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
APP_MODE=anonymous
LOCAL_DATA_DIR=./data
INITIAL_USER_CREDITS=3
```

`.env.local.example` contains GitHub-safe placeholder values only. The real `.env.local` file is ignored by `.gitignore`; do not commit your real key, custom base URL, or any secret.

Node.js 22.13 or newer is required; Node.js 24 is recommended. Install dependencies and start the dev server:

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

For a stable production preview:

```powershell
npm.cmd run build
npm.cmd run preview
```

## Commands

| Command | Description |
| --- | --- |
| `npm.cmd run dev` | Start the development server |
| `npm.cmd run build` | Build for production |
| `npm.cmd run preview` | Preview the production build on `127.0.0.1:3000` |
| `npm.cmd run start` | Start the built production app |
| `npm.cmd test` | Run Vitest |
| `npm.cmd run lint` | Run ESLint |

## Runtime Modes and Branches

- `main` defaults to `APP_MODE=anonymous`: no login or credits are shown, and history belongs to the local shared workspace.
- `codex/public-deployment` defaults to `APP_MODE=multi-user`: local email/password accounts, initial credits, generation charges, and user-owned history are enabled.
- `APP_MODE` can override the branch default. Multi-user mode does not require an external database service.

SQLite, sessions, and generated images are stored in `data/` by default. This directory is ignored by Git and should be backed up as a unit. When exposing the app through a tunnel, use HTTPS.

## API

### `POST /api/auth/signup` / `login` / `logout`

Local authentication for multi-user mode. Passwords are hashed with `scrypt`; browsers receive only an HttpOnly session cookie.

### `POST /api/generate/jobs`

Creates an asynchronous generation job. Anonymous mode does not charge credits; multi-user mode reserves one credit transactionally and refunds it on failure.

### `GET /api/generate/jobs/[jobId]`

Returns queue position, job state, and the completed result. Multi-user mode enforces owner access.

### `POST /api/regenerate-image/jobs`

Creates a redraw job using prompts loaded from the saved result instead of trusting browser-provided history data.

## Rule Summary

- The quick quiz uses 12 subtle questions. Options do not directly expose labels such as fox, dragon, cyber, or hybrid.
- Each answer has weak weights and usually affects 3-5 tags, so one answer cannot decide the final species.
- Strong results require tag combinations, such as `mystery + slim + fox` for fox candidates or `control + mythic_bias + scale` for dragon or qilin candidates.
- `Pure` keeps one primary species and blocks obvious secondary traits. `Hybrid` allows up to 3 lineages, with secondary traits mapped to concrete body parts, materials, or equipment.
- Complete-scene prompts enforce `no visible text, no character name, no labels, no typography, no watermark`.
- Reference-sheet prompts use a vertical A4 board layout and may include short headings or tiny labels, but avoid long paragraphs, signatures, and watermarks.
- Confirmation-page edits automatically append `User edited requirements` to image prompts so user edits affect generation.

## Not Included Yet

- Community feed
- Email verification and password recovery
- Multi-character relationship graph
- Fine-grained post-generation editing (pre-generation editing is supported on the confirmation page)
- Inpainting / partial redraw
- Live2D / VTuber output
- Commission marketplace

## Notes

- Do not commit `.env.local`, API keys, or any secrets.
- The `data/` directory contains accounts, sessions, credits, and generated images. Never expose it as a static directory.
- If you use an OpenAI-compatible provider, make sure it supports both the Responses API and Images API.
- Image generation cost, latency, and final quality depend on the selected model and provider. `gpt-image-2` is recommended.
- Image quality variance, unstable details, or style drift are usually limitations of the image model rather than local rule inference errors.
- V1.2.0 targets a single-machine Next.js deployment. Do not share one SQLite file between multiple servers.
