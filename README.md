# Travel Planner Maps

An AI-powered travel planning app built with React, Google Maps, and Gemini AI. Explore destinations, discover nearby places, watch travel vlogs, generate AI itineraries, translate content, and chat with an AI travel assistant — all in one interface.

---

## Google Services Used

| Service | How It's Used |
|---|---|
| **Google Maps JavaScript API** | Full-screen interactive map with vector rendering, dark/light mode, Street View |
| **Google Places API (UI Kit)** | `gmp-place-search` for nearby discovery, `gmp-place-details-compact` for rich place cards |
| **Google Gemini AI** (`gemini-3-flash-preview`) | AI travel chat assistant + AI trip itinerary generation from saved places |
| **YouTube Data API v3** | Travel vlog search — server-proxied to keep key secure |
| **Google Calendar** | Pre-filled event creation via URL (no OAuth required) |
| **Google Maps Directions** | Multi-stop route planner opens all saved places as a route in Google Maps |
| **Google Cloud Translation API** | Translate AI chat responses to 10 languages (with Gemini fallback) |

---

## Features

### Interactive Google Maps
- Full-screen Google Maps integration with vector rendering
- Dark / light mode toggle (follows system preference, manually overridable)
- Street View support via Pegman drag
- Color-coded markers: indigo (search results), amber (saved), rose (selected)

### Place Discovery
- Nearby search powered by Google Places UI Kit (`gmp-place-search`)
- Filter by category: Tourist Attractions, Museums, Parks, Restaurants, Cafes
- Tap any marker or list result to open a rich place details popup
- Quick-jump city buttons: Paris, London, NYC, Tokyo, SF, Milan
- Full city dropdown with 21 popular destinations worldwide

### Saved Itinerary + Route Planner
- Save places to a personal trip list with one click
- Saved tab shows compact place cards with photo, name, and address
- **Open Route in Google Maps** — one click opens all saved places as a multi-stop driving/walking route in Google Maps
- **Generate AI Trip Plan** — sends all saved places to Gemini AI to generate a detailed day-by-day itinerary with timing, activities, and practical tips (appears in the AI chat panel)

### YouTube Travel Vlogs
- Click **Vlogs** on any place popup to open the Travel Vlogs panel
- Searches YouTube for `<place name> travel vlog` via YouTube Data API v3 (proxied server-side)
- Shows up to 6 video results with thumbnail, title, channel name, and publish date
- Click any card to open the video directly on YouTube
- Error state with retry button; loading and empty states handled

### Google Calendar Integration (no OAuth required)
- Click **Plan** on any place popup to open the Plan Trip panel
- Pick a visit date, start time, and duration (30 min → full day)
- Add optional notes
- **Add to Google Calendar** — opens Google Calendar in a new tab with all details pre-filled
- **Export as .ics** — downloads a standard iCalendar file for Apple Calendar, Outlook, etc.

### AI Travel Assistant (Chat)
- Floating chat button (bottom-right) opens an animated chat panel
- Powered by **Google Gemini** (`gemini-3-flash-preview`) via Vertex AI / Google Agentic API
- Full conversation history for contextual multi-turn replies
- Suggested prompts on first open
- **AI Trip Itinerary Generation** — triggered from the Saved Places tab, Gemini generates a complete day-by-day itinerary for all saved places
- **Translation** — select any of 10 languages (Spanish, French, German, Japanese, Chinese, Korean, Portuguese, Arabic, Hindi, Italian) to translate AI responses using **Google Cloud Translation API** (Gemini fallback if key not set)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, dark mode via `.dark` class |
| Animation | Motion (Framer Motion v12) |
| Maps | Google Maps JS API via `@vis.gl/react-google-maps`, Places UI Kit web components |
| AI | `@google/genai` SDK — Gemini / Vertex AI |
| Backend | Express.js + tsx (TypeScript runtime) |
| Security | Helmet (CSP/HSTS), express-rate-limit (30 req/min), input sanitization |
| Testing | Vitest + Testing Library (91 tests) |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud project with the following APIs enabled

### Required API Keys

| Variable | Purpose | Where to get it |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Maps, Places UI Kit | [Google Cloud Console → Maps](https://console.cloud.google.com/google/maps-apis) |
| `GOOGLE_CLOUD_AGENTIC_API_KEY` | Gemini AI Chat & Itinerary | Google AI Studio / Agentic API |
| `YOUTUBE_API_KEY` | Travel Vlogs | [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) |
| `GOOGLE_TRANSLATE_API_KEY` | Translation (optional) | [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com) — falls back to Gemini if not set |

### Google Cloud APIs to Enable
1. **Maps JavaScript API**
2. **Places API (New)**
3. **YouTube Data API v3** — Travel Vlogs feature
4. **Gemini API** (`generativelanguage.googleapis.com`) — AI chat and itinerary
5. **Cloud Translation API** *(optional)* — falls back to Gemini translation if not enabled

### Setup

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your keys:
   ```bash
   cp .env.example .env
   ```

   ```env
   GOOGLE_MAPS_API_KEY=your_maps_key
   GOOGLE_CLOUD_AGENTIC_API_KEY=your_gemini_key
   YOUTUBE_API_KEY=your_youtube_key
   GOOGLE_TRANSLATE_API_KEY=your_translate_key   # optional

   # Optional — for Vertex AI mode
   GOOGLE_CLOUD_PROJECT=your_project_id
   GOOGLE_CLOUD_LOCATION=global
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## Project Structure

```
├── server.ts              # Express server — API routes, YouTube proxy, AI chat, translation
├── src/
│   ├── App.tsx            # Root component, API key check, theme management
│   ├── main.tsx           # React entry point
│   ├── index.css          # Tailwind config, dark mode tokens
│   └── components/
│       ├── MapComponent.tsx      # Map, markers, InfoWindow, route planner, itinerary trigger
│       ├── PlaceActionsPanel.tsx # YouTube Vlogs + Google Calendar slide-in panel
│       ├── ChatPanel.tsx         # AI assistant chat + translation + itinerary display
│       └── AboutModal.tsx        # About / info modal
├── src/__tests__/         # 91 Vitest tests
├── .env.example
├── Dockerfile
├── vite.config.ts
└── package.json
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/config` | GET | Returns the Maps API key to the frontend |
| `/api/config` | POST | Saves the Maps API key to `.env` |
| `/api/chat` | POST | Proxies messages to Gemini AI with full conversation history |
| `/api/youtube` | GET | Proxies YouTube Data API v3 search (key kept server-side) |
| `/api/translate` | POST | Translates text via Google Cloud Translation API (Gemini fallback) |
| `/api/itinerary` | POST | Generates a day-by-day trip plan from saved places using Gemini AI |

---

## Security

- **Helmet** — sets Content-Security-Policy, HSTS, X-Frame-Options, and other security headers
- **Rate limiting** — 30 requests/minute per IP on all `/api/` routes
- **Input sanitization** — chat messages capped at 10,000 chars; translate text capped at 5,000 chars
- **JSON body limit** — 50 KB max request body
- **API keys never exposed** — all third-party keys (YouTube, Translate) are server-side only

---

## Deployment (Google Cloud Run)

```bash
gcloud run deploy travel-planner \
  --source . \
  --region us-central1 \
  --set-env-vars GOOGLE_MAPS_API_KEY=...,GOOGLE_CLOUD_AGENTIC_API_KEY=...,YOUTUBE_API_KEY=... \
  --quiet
```
