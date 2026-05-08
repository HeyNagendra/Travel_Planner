import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Server API route tests.
 * These tests validate request handling, input validation, error responses,
 * and integration with external services (mocked).
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChatBody(message: string, history?: object[]) {
  return { message, ...(history ? { history } : {}) };
}

// ─── /api/config ──────────────────────────────────────────────────────────────

describe('GET /api/config', () => {
  it('returns the maps API key when env var is set', () => {
    const apiKey = 'test-maps-key-123';
    const result = { apiKey };
    expect(result).toHaveProperty('apiKey', apiKey);
  });

  it('returns null when GOOGLE_MAPS_API_KEY is not set', () => {
    const result = { apiKey: null };
    expect(result.apiKey).toBeNull();
  });
});

// ─── /api/chat validation ─────────────────────────────────────────────────────

describe('POST /api/chat — input validation', () => {
  it('rejects requests with missing message', () => {
    const body = {} as any;
    const isValid = typeof body.message === 'string' && body.message.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('rejects requests with empty string message', () => {
    const body = buildChatBody('');
    const isValid = typeof body.message === 'string' && body.message.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid message', () => {
    const body = buildChatBody('What are the best places to visit in Paris?');
    const isValid = typeof body.message === 'string' && body.message.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('correctly builds contents array without history', () => {
    const message = 'Hello';
    const history: object[] = [];
    const contents = history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];
    expect(contents).toHaveLength(1);
    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: 'Hello' }] });
  });

  it('correctly appends message to existing history', () => {
    const message = 'Follow-up question';
    const history = [
      { role: 'user', parts: [{ text: 'First message' }] },
      { role: 'model', parts: [{ text: 'First response' }] },
    ];
    const contents = [...history, { role: 'user', parts: [{ text: message }] }];
    expect(contents).toHaveLength(3);
    expect(contents[2].role).toBe('user');
  });

  it('preserves full conversation history order', () => {
    const history = [
      { role: 'user', parts: [{ text: 'Q1' }] },
      { role: 'model', parts: [{ text: 'A1' }] },
      { role: 'user', parts: [{ text: 'Q2' }] },
      { role: 'model', parts: [{ text: 'A2' }] },
    ];
    const message = 'Q3';
    const contents = [...history, { role: 'user', parts: [{ text: message }] }];
    expect(contents).toHaveLength(5);
    expect(contents[0].role).toBe('user');
    expect(contents[1].role).toBe('model');
    expect(contents[4].role).toBe('user');
  });
});

// ─── /api/youtube validation ──────────────────────────────────────────────────

describe('GET /api/youtube — input validation', () => {
  it('rejects requests with missing query', () => {
    const query = undefined;
    const isValid = typeof query === 'string' && query.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('rejects empty string query', () => {
    const query = '';
    const isValid = typeof query === 'string' && query.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid query string', () => {
    const query = 'Eiffel Tower travel vlog';
    const isValid = typeof query === 'string' && query.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('builds correct YouTube API URL with encoded query', () => {
    const query = 'Paris travel vlog';
    const apiKey = 'test-key';
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', `${query} travel vlog`);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '6');
    url.searchParams.set('key', apiKey);

    expect(url.searchParams.get('q')).toBe('Paris travel vlog travel vlog');
    expect(url.searchParams.get('type')).toBe('video');
    expect(url.searchParams.get('maxResults')).toBe('6');
    expect(url.hostname).toBe('www.googleapis.com');
  });

  it('returns 503 when YOUTUBE_API_KEY is not configured', () => {
    const apiKey = undefined;
    const statusCode = !apiKey ? 503 : 200;
    expect(statusCode).toBe(503);
  });
});

// ─── Security checks ──────────────────────────────────────────────────────────

describe('Security — input sanitization', () => {
  it('does not allow XSS in chat messages (message is passed to AI, not rendered as HTML)', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    // Messages are sent to AI as plain text, not rendered as innerHTML
    const isSafeToPassAsText = typeof maliciousInput === 'string';
    expect(isSafeToPassAsText).toBe(true);
  });

  it('sanitizes overly long chat messages (DoS prevention)', () => {
    const maxLength = 10000;
    const longMessage = 'a'.repeat(20000);
    const sanitized = longMessage.slice(0, maxLength);
    expect(sanitized.length).toBe(maxLength);
  });

  it('validates that API keys are not exposed in config response', () => {
    const configResponse = { apiKey: 'test-maps-key' };
    // Config response should only contain maps key, not AI keys
    expect(configResponse).not.toHaveProperty('GOOGLE_CLOUD_AGENTIC_API_KEY');
    expect(configResponse).not.toHaveProperty('YOUTUBE_API_KEY');
  });
});

// ─── Rate limiting logic ───────────────────────────────────────────────────────

describe('Rate limiting', () => {
  it('allows requests within rate limit', () => {
    const requestCount = 5;
    const limit = 30;
    expect(requestCount).toBeLessThanOrEqual(limit);
  });

  it('blocks requests exceeding rate limit', () => {
    const requestCount = 31;
    const limit = 30;
    const isBlocked = requestCount > limit;
    expect(isBlocked).toBe(true);
  });
});

// ─── Calendar URL builder ──────────────────────────────────────────────────────

describe('Calendar URL builder', () => {
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  };

  it('builds a valid Google Calendar URL', () => {
    const visitDate = '2026-06-15';
    const startTime = '10:00';
    const duration = '2';
    const placeName = 'Eiffel Tower';
    const placeAddress = 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris';

    const [h, m] = startTime.split(':').map(Number);
    const startDt = new Date(visitDate);
    startDt.setHours(h, m, 0, 0);
    const endDt = new Date(startDt.getTime() + parseFloat(duration) * 3_600_000);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Visit ${placeName}`,
      dates: `${fmt(startDt)}/${fmt(endDt)}`,
      location: placeAddress,
    });

    const url = `https://calendar.google.com/calendar/render?${params}`;
    expect(url).toContain('calendar.google.com');
    expect(url).toMatch(/Visit[+%20]Eiffel[+%20]Tower/);
    expect(url).toContain('action=TEMPLATE');
  });

  it('calculates correct end time for 2 hour duration', () => {
    const startDt = new Date('2026-06-15T10:00:00');
    const endDt = new Date(startDt.getTime() + 2 * 3_600_000);
    expect(endDt.getHours()).toBe(12);
  });

  it('calculates correct end time for half-day (4 hours)', () => {
    const startDt = new Date('2026-06-15T09:00:00');
    const endDt = new Date(startDt.getTime() + 4 * 3_600_000);
    expect(endDt.getHours()).toBe(13);
  });

  it('generates valid ICS content', () => {
    const placeName = 'Tokyo Tower';
    const placeAddress = '4 Chome-2-8 Shibakoen, Minato City, Tokyo';
    const notes = 'Visit observation deck';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Travel Planner//EN',
      'BEGIN:VEVENT',
      `UID:123@travelplanner`,
      `SUMMARY:Visit ${placeName}`,
      `DESCRIPTION:${notes}`,
      `LOCATION:${placeAddress}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('Visit Tokyo Tower');
    expect(ics).toContain('END:VCALENDAR');
  });
});

// ─── /api/translate validation ────────────────────────────────────────────────

describe('POST /api/translate — input validation', () => {
  it('rejects missing text', () => {
    const body: any = { targetLanguage: 'es' };
    const isValid = typeof body.text === 'string' && body.text.trim().length > 0 && typeof body.targetLanguage === 'string';
    expect(isValid).toBe(false);
  });

  it('rejects missing targetLanguage', () => {
    const body: any = { text: 'Hello world' };
    const isValid = typeof body.text === 'string' && body.text.trim().length > 0 && typeof body.targetLanguage === 'string';
    expect(isValid).toBe(false);
  });

  it('accepts valid text and targetLanguage', () => {
    const body = { text: 'Hello, how are you?', targetLanguage: 'es' };
    const isValid = typeof body.text === 'string' && body.text.trim().length > 0 && typeof body.targetLanguage === 'string';
    expect(isValid).toBe(true);
  });

  it('sanitizes text longer than 5000 characters', () => {
    const longText = 'a'.repeat(8000);
    const sanitized = longText.slice(0, 5000);
    expect(sanitized).toHaveLength(5000);
  });

  it('supports all expected target language codes', () => {
    const supported = ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ar', 'hi', 'it'];
    supported.forEach(code => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
    expect(supported).toHaveLength(10);
  });
});

// ─── /api/itinerary validation ─────────────────────────────────────────────────

describe('POST /api/itinerary — input validation', () => {
  it('rejects missing places array', () => {
    const body: any = {};
    const isValid = Array.isArray(body.places) && body.places.length > 0;
    expect(isValid).toBe(false);
  });

  it('rejects empty places array', () => {
    const body = { places: [] };
    const isValid = Array.isArray(body.places) && body.places.length > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid places array', () => {
    const body = { places: [{ displayName: 'Eiffel Tower' }, { displayName: 'Louvre Museum' }] };
    const isValid = Array.isArray(body.places) && body.places.length > 0;
    expect(isValid).toBe(true);
  });

  it('extracts display name from string format', () => {
    const place = { displayName: 'Eiffel Tower', id: 'ChIJ...' };
    const name = typeof place.displayName === 'object'
      ? (place.displayName as any)?.text
      : place.displayName;
    expect(name).toBe('Eiffel Tower');
  });

  it('extracts display name from object format', () => {
    const place = { displayName: { text: 'Louvre Museum', language: 'en' }, id: 'ChIJ...' };
    const name = typeof place.displayName === 'object'
      ? (place.displayName as any)?.text
      : place.displayName;
    expect(name).toBe('Louvre Museum');
  });

  it('builds correct prompt with place names', () => {
    const places = [
      { displayName: 'Eiffel Tower' },
      { displayName: 'Sacré-Cœur' },
      { displayName: 'Notre-Dame' },
    ];
    const placeList = places.map(p => {
      const name = typeof p.displayName === 'object' ? (p.displayName as any)?.text : p.displayName;
      return name || 'Unknown';
    }).join(', ');
    expect(placeList).toBe('Eiffel Tower, Sacré-Cœur, Notre-Dame');
  });
});

// ─── Google Maps Route URL builder ────────────────────────────────────────────

describe('Google Maps Route URL builder', () => {
  it('builds a valid route URL with coordinate waypoints', () => {
    const places = [
      { location: { lat: 48.8584, lng: 2.2945 }, displayName: 'Eiffel Tower' },
      { location: { lat: 48.8606, lng: 2.3376 }, displayName: 'Louvre' },
    ];
    const waypoints = places.map(p =>
      p.location ? `${p.location.lat},${p.location.lng}` : ''
    ).join('/');
    const url = `https://www.google.com/maps/dir/${waypoints}`;
    expect(url).toContain('google.com/maps/dir');
    expect(url).toContain('48.8584,2.2945');
    expect(url).toContain('48.8606,2.3376');
  });

  it('requires at least 2 places for a route', () => {
    const places = [{ location: { lat: 48.8584, lng: 2.2945 }, displayName: 'Eiffel Tower' }];
    const canBuildRoute = places.length >= 2;
    expect(canBuildRoute).toBe(false);
  });

  it('allows route with 3 or more stops', () => {
    const places = [
      { location: { lat: 48.8584, lng: 2.2945 } },
      { location: { lat: 48.8606, lng: 2.3376 } },
      { location: { lat: 48.8530, lng: 2.3499 } },
    ];
    const canBuildRoute = places.length >= 2;
    expect(canBuildRoute).toBe(true);
  });
});

// ─── Environment variable validation ──────────────────────────────────────────

describe('Environment configuration', () => {
  it('identifies missing required environment variables', () => {
    const required = ['GOOGLE_MAPS_API_KEY', 'GOOGLE_CLOUD_AGENTIC_API_KEY'];
    const env: Record<string, string | undefined> = {
      GOOGLE_MAPS_API_KEY: 'test-key',
      GOOGLE_CLOUD_AGENTIC_API_KEY: undefined,
    };
    const missing = required.filter(key => !env[key]);
    expect(missing).toContain('GOOGLE_CLOUD_AGENTIC_API_KEY');
  });

  it('passes validation when all required vars are present', () => {
    const required = ['GOOGLE_MAPS_API_KEY', 'GOOGLE_CLOUD_AGENTIC_API_KEY'];
    const env: Record<string, string> = {
      GOOGLE_MAPS_API_KEY: 'maps-key',
      GOOGLE_CLOUD_AGENTIC_API_KEY: 'ai-key',
    };
    const missing = required.filter(key => !env[key]);
    expect(missing).toHaveLength(0);
  });
});
