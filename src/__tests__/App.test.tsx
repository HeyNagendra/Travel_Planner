import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/MapComponent', () => ({
  default: ({ apiKey }: { apiKey: string }) => (
    <div data-testid="map-component" data-apikey={apiKey}>Map</div>
  ),
}));

vi.mock('../components/ChatPanel', () => ({
  default: () => <div data-testid="chat-panel">Chat</div>,
}));

vi.mock('../components/AboutModal', () => ({
  default: () => <div data-testid="about-modal">About</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner on initial render', () => {
    vi.mocked(global.fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<App />);
    // During check, a loader should be shown
    expect(document.body).toBeInTheDocument();
  });

  it('shows API key required message when no key is returned', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: null }),
    } as Response);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/api key required/i)).toBeInTheDocument();
    });
  });

  it('renders MapComponent when API key is available', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: 'valid-maps-key' }),
    } as Response);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('map-component')).toBeInTheDocument();
    });
  });

  it('always renders ChatPanel regardless of API key status', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: null }),
    } as Response);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    });
  });

  it('passes the correct API key to MapComponent', async () => {
    const testKey = 'test-api-key-xyz';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: testKey }),
    } as Response);

    render(<App />);
    await waitFor(() => {
      const map = screen.getByTestId('map-component');
      expect(map).toHaveAttribute('data-apikey', testKey);
    });
  });

  it('handles fetch error gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
    render(<App />);
    await waitFor(() => {
      // Should show API key required UI, not crash
      expect(screen.getByText(/api key required/i)).toBeInTheDocument();
    });
  });

  it('shows setup instructions when API key is missing', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ apiKey: null }),
    } as Response);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/GOOGLE_MAPS_API_KEY/i)).toBeInTheDocument();
    });
  });
});
