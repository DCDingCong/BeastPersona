# Fursona Atelier

<p align="right">
  <strong>Type:</strong>
  <a href="./README.md">中文</a> |
  <a href="./README.en.md">English</a>
</p>

**Version:** V1.0.0<br>
**Author:** DingC<br>
**License:** [MIT](./LICENSE)

<p align="center">
  <img src="./public/ai-fursona-mobile-style-v1.png" alt="Fursona Atelier mobile UI preview" width="760" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-111111?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-SDK-111111?logo=openai" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-Tested-6e9f18?logo=vitest&logoColor=white" />
</p>

Fursona Atelier is a mobile-first AI fursona design tool. Users answer a subtle quick quiz or a deeper branching questionnaire. The app first uses local rules to infer species candidates, lineage, conflicts, and visual constraints, then calls OpenAI to generate a structured character spec, a complete scene image, and a multi-view reference sheet.

## Preview

| Complete Scene | Reference Sheet |
| --- | --- |
| <img src="./public/sample-complete-scene.png" alt="Complete scene sample" width="420" /> | <img src="./public/sample-reference-sheet.png" alt="Reference sheet sample" width="420" /> |

## Highlights

- **Two quiz modes**: a fixed 12-question quick flow, plus a deeper branching question bank for detailed customization.
- **Subtle scoring**: users see narrative choices while the backend accumulates personality, aesthetic, world, material, lineage, and species signals.
- **Lineage switch**: keeps three generation types: `AI recommended`, `pure`, and `hybrid`.
- **Local rule engine**: creates a `scoreSnapshot`, species candidates, lineage recommendation, and conflict hints before AI generation.
- **Two image outputs**: complete scene and reference sheet are derived from the same structured spec to reduce character drift.
- **Result actions**: save images, copy setting text, and retry a single image.

> V1.0.0 focuses on the quick generation flow. The fine-grained question bank has not been fully tested yet and will be iterated in V2.0.

## Generation Rules

### Quiz And Scoring

- The quick quiz uses 12 subtle questions. Options do not directly expose labels such as fox, dragon, cyber, or hybrid.
- Each answer has weak weights and usually affects 3-5 tags, so one answer cannot decide the final species.
- The deep flow selects branch questions based on existing tags, covering base signals, lineage, mammals, mythic scales, special materials, visual design, world setting, and constraints.

### Combination Boosts

Strong results require multiple tags to appear together:

| Condition | Boost |
| --- | --- |
| `mystery >= 3` + `slim >= 2` + `fox >= 2` | Fox candidate boost |
| `loyal >= 3` + `wild >= 2` + `dark >= 2` | Wolf candidate boost |
| `control >= 3` + `mythic_bias >= 2` + `scale >= 2` | Dragon / qilin candidate boost |
| `cyber >= 3` + `mechanical_bias >= 2` | Mech lineage and hybrid tendency boost |

### Lineage Rules

- `AI recommended`: compares `hybrid_score`, `pure_score`, primary species lead, and visual conflicts.
- `Pure`: keeps one primary species at 100% and blocks obvious secondary traits such as horns, wings, scales, or mechanical mutations.
- `Hybrid`: allows up to 3 lineages. The primary lineage must stay at 55% or higher, and secondary traits must map to concrete body parts, materials, or equipment.
- When uncertain, the system prefers a clear-primary light hybrid instead of random mixing.

### Image And Copy Constraints

- Character copy, complete-scene prompt, and reference-sheet prompt are all derived from the same `character_spec_json`.
- Image prompts enforce `no visible text, no character name, no labels, no typography, no watermark`.
- The result page shows user-facing setting copy and does not expose per-question scores or internal inference details.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Vitest
- ESLint

## Project Structure

```text
src/app/page.tsx                         Mobile UI and interaction flow
src/app/api/generate/route.ts            AI generation endpoint
src/app/api/regenerate-image/route.ts    Single-image retry endpoint
src/data/quickQuestions.ts               Fixed 12-question quick bank
src/data/deepQuestionBank.ts             Local deep branching question bank
src/data/species.ts                      Species mapping and weights
src/data/scoringRules.ts                 Combination boosts and lineage thresholds
src/lib/scoring.ts                       Local scoring engine
src/lib/questionFlow.ts                  Deep branch selector
src/lib/conflicts.ts                     Setting conflict detection
src/lib/fursona.ts                       Fursona rule inference and fallback spec
src/lib/openai.ts                        OpenAI SDK configuration
public/                                  Static images for GitHub and frontend use
assets/                                  Product visual references
docs/                                   PRD, question-bank, and implementation docs
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
```

`.env.local.example` contains GitHub-safe placeholder values only. The real `.env.local` file is ignored by `.gitignore`; do not commit your real key, custom base URL, or any secret.

Install dependencies and start the dev server:

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

For a stable local preview:

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

## API Flow

```text
Fixed Q12 or deep branching question bank
↓
Local scoring engine creates scoreSnapshot
↓
Pre-generation review and conflict detection
↓
Rule engine infers species and lineage
↓
OpenAI text model generates character_spec_json
↓
Two image prompts are derived from the same JSON
↓
OpenAI image model generates complete scene and reference sheet in parallel
↓
The result page receives character spec, complete image, and reference image
```

### `POST /api/generate`

Generates the structured character spec, complete scene, and reference sheet. If `OPENAI_API_KEY` is missing, the endpoint returns a clear error instead of fake demo data.

### `POST /api/regenerate-image`

Receives an existing prompt and redraws one image without regenerating the character spec.

## Not Included Yet

- Result persistence / history
- Community feed
- Multi-character relationship graph
- Fine-grained post-generation editing
- Inpainting / partial redraw
- Live2D / VTuber output
- Commission marketplace

## Notes

- Do not commit `.env.local`, API keys, or any secrets.
- If you use an OpenAI-compatible provider, make sure it supports both the Responses API and Images API.
- Image generation cost, latency, and final quality depend on the selected model and provider. `gpt-image-2` is recommended.
- Image quality variance, unstable details, or style drift are usually limitations of the image model rather than local rule inference errors.
- The fine-grained question bank has not been fully tested yet and will be iterated in V2.0.
- The UI is mobile-first. Desktop is mainly a centered phone preview.
