# Travel Planner Maps

An AI-powered travel planning app built with React, Google Maps, and Gemini AI. Explore destinations, discover nearby places, watch travel vlogs, plan your itinerary, and chat with an AI travel assistant — all in one interface.

---

## Features

### Interactive Google Maps
- Full-screen Google Maps integration with vector rendering
- Dark / light mode toggle (follows system preference, manually overridable)
- Street View support via Pegman drag
- Color-coded map markers: indigo (search results), amber (saved), rose (selected)

### Place Discovery
- Nearby search powered by the Google Places UI Kit (`gmp-place-search`)
- Filter by category: Tourist Attractions, Museums, Parks, Restaurants, Cafes
- Tap any marker or list result to open a rich place details popup
- Quick-jump city buttons: Paris, London, NYC, Tokyo, SF, Milan
- Full city dropdown with 21 popular destinations worldwide

### Saved Itinerary
- Save places to a personal trip list with one click
- Saved tab shows compact place cards with photo, name, and address
- Remove places individually; list persists during the session

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
- **Add to Google Calendar** — opens Google Calendar in a new tab with all details pre-filled (title, location, time, notes)
- **Export as .ics** — downloads a standard iCalendar file compatible with Apple Calendar, Outlook, and any other calendar app

### AI Travel Assistant (Chat)
- Floating chat button (bottom-right corner) opens a chat panel
- Powered by Google Gemini (`gemini-3-flash-preview`) via Vertex AI / Google Agentic API
- Full conversation history passed with each message for contextual replies
- Suggested prompts on first open: "Top things to do in Paris", "Best time to visit Tokyo", "Budget travel tips"
- Error messages surfaced inline if the API is unreachable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, dark mode via `.dark` class |
| Animation | Motion (Framer Motion v12) |
| Maps | Google Maps JS API via `@vis.gl/react-google-maps`, Places UI Kit web components |
| AI Chat | `@google/genai` SDK — Gemini / Vertex AI |
| Backend | Express.js + tsx (TypeScript server) |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud project with the following APIs enabled

### Required API Keys

| Key | Purpose | Where to get it |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Maps, Places UI Kit | [Google Cloud Console → Maps](https://console.cloud.google.com/google/maps-apis) |
| `GOOGLE_CLOUD_AGENTIC_API_KEY` | Gemini AI Chat | Google AI Studio / Google Cloud Agentic API |
| `YOUTUBE_API_KEY` | Travel Vlogs feature | [Google Cloud Console → YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) |

### Google Cloud APIs to Enable
1. **Maps JavaScript API**
2. **Places API (New)**
3. **Geocoding API** *(optional — for free-text address search)*
4. **YouTube Data API v3** — for the Vlogs feature
5. **Gemini API** (`generativelanguage.googleapis.com`) — for AI chat

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

   # Optional — for Vertex AI mode (uses ADC instead of API key)
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
├── server.ts              # Express server — API routes, YouTube proxy, AI chat
├── src/
│   ├── App.tsx            # Root component, API key check, theme management
│   ├── main.tsx           # React entry point
│   ├── index.css          # Tailwind config, dark mode tokens, Maps UI Kit theming
│   └── components/
│       ├── MapComponent.tsx      # Main map, markers, InfoWindow, place discovery
│       ├── PlaceActionsPanel.tsx # YouTube Vlogs + Google Calendar slide-in panel
│       ├── ChatPanel.tsx         # AI travel assistant chat
│       └── AboutModal.tsx        # About / info modal
├── .env.example           # Environment variable template
├── vite.config.ts
└── package.json
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/config` | GET | Returns the Maps API key to the frontend |
| `/api/config` | POST | Saves the Maps API key to `.env` |
| `/api/chat` | POST | Proxies messages to Gemini AI with conversation history |
| `/api/youtube` | GET | Proxies YouTube Data API v3 search (keeps key server-side) |
