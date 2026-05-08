/**
 * Shared TypeScript interfaces and types used across the application.
 */

/** Plain latitude/longitude coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Google Maps Place object returned by the Places API / UI Kit.
 * Properties are lazy-loaded — use fetchFields() to populate them.
 */
export interface GooglePlace {
  id?: string;
  name?: string;
  displayName?: string | { text: string; language?: string };
  formattedAddress?: string;
  vicinity?: string;
  /** Can be a plain LatLng or a google.maps.LatLng instance (lat/lng are functions) */
  location?: google.maps.LatLng | LatLng;
  fetchFields?: (options: { fields: string[] }) => Promise<void>;
  place_id?: string;
}

/** Simplified place stored in the trip itinerary (serialisable, no Maps SDK objects) */
export interface ItineraryItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLng;
}

/** YouTube Data API v3 search result item */
export interface VideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string; width?: number; height?: number } };
    publishedAt: string;
    description: string;
  };
}

/** AI chat message (mirrors Gemini content format) */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
  translatedText?: string;
}

/** Translation language option */
export interface TranslateLanguage {
  code: string;
  label: string;
}

/** City quick-nav entry */
export interface City {
  name: string;
  lat: number;
  lng: number;
}

/** PlaceActionsPanel tab identifier */
export type PlaceActionTab = 'vlogs' | 'calendar';

/** Sidebar tab identifier */
export type SidebarTab = 'search' | 'saved';

/** Custom event fired from MapComponent to trigger the AI chat with a message */
export interface TriggerChatDetail {
  message: string;
}
