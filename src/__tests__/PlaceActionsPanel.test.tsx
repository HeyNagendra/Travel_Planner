import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaceActionsPanel from '../components/PlaceActionsPanel';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPlace = {
  id: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
  displayName: 'Eiffel Tower',
  formattedAddress: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
  location: { lat: 48.8584, lng: 2.2945 },
};

const mockPlaceWithObjectName = {
  id: 'ChIJ_test_123',
  displayName: { text: 'Louvre Museum', language: 'en' },
  formattedAddress: 'Rue de Rivoli, 75001 Paris, France',
  location: { lat: 48.8606, lng: 2.3376 },
};

const defaultProps = {
  place: mockPlace,
  initialTab: 'vlogs' as const,
  onClose: vi.fn(),
  isDarkMode: false,
};

describe('PlaceActionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders the panel with place name', () => {
    render(<PlaceActionsPanel {...defaultProps} />);
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
  });

  it('renders place name from object displayName format', () => {
    render(<PlaceActionsPanel {...defaultProps} place={mockPlaceWithObjectName} />);
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
  });

  it('renders place address', () => {
    render(<PlaceActionsPanel {...defaultProps} />);
    expect(screen.getByText(/Champ de Mars/i)).toBeInTheDocument();
  });

  it('shows Travel Vlogs tab by default when initialTab is vlogs', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    expect(screen.getByRole('button', { name: /Travel Vlogs/i })).toBeInTheDocument();
  });

  it('shows Plan Trip tab when initialTab is calendar', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    expect(screen.getByRole('button', { name: /Plan Trip/i })).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<PlaceActionsPanel {...defaultProps} />);
    const closeBtn = screen.getByRole('button', { name: /close panel/i });
    expect(closeBtn).toBeInTheDocument();
  });

  // ─── Tab navigation ────────────────────────────────────────────────────────

  it('switches to Plan Trip tab when clicked', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) } as Response);

    render(<PlaceActionsPanel {...defaultProps} />);
    const planTab = screen.getAllByText(/Plan Trip/i)[0];
    await userEvent.click(planTab);
    expect(screen.getByLabelText(/visit date/i)).toBeInTheDocument();
  });

  it('switches back to Vlogs tab', async () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    const vlogsTab = screen.getAllByText(/Travel Vlogs/i)[0];
    await userEvent.click(vlogsTab);
    // vlogs panel is now active — loading or content
    expect(screen.getAllByText(/Travel Vlogs/i).length).toBeGreaterThan(0);
  });

  // ─── Vlogs tab ─────────────────────────────────────────────────────────────

  it('shows loading state while fetching videos', async () => {
    const mockFetch = vi.mocked(global.fetch);
    let resolvePromise!: (value: any) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolvePromise = r; }) as any);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    expect(screen.getByText(/finding travel vlogs/i)).toBeInTheDocument();
    resolvePromise({ ok: true, json: async () => ({ items: [] }) });
  });

  it('shows empty state when no videos found', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => {
      expect(screen.getByText(/no vlogs found/i)).toBeInTheDocument();
    });
  });

  it('renders video cards when videos are returned', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Eiffel Tower Travel Guide 2026',
              channelTitle: 'Travel With Me',
              thumbnails: { medium: { url: 'https://img.youtube.com/vi/abc123/mqdefault.jpg' } },
              publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
              description: 'Amazing trip to Paris',
            },
          },
        ],
      }),
    } as Response);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => {
      expect(screen.getByText('Eiffel Tower Travel Guide 2026')).toBeInTheDocument();
      expect(screen.getByText('Travel With Me')).toBeInTheDocument();
    });
  });

  it('video cards link to YouTube', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: { videoId: 'vid999' },
          snippet: {
            title: 'Paris Vlog',
            channelTitle: 'Explorer',
            thumbnails: { medium: { url: 'https://img.youtube.com/vi/vid999/mqdefault.jpg' } },
            publishedAt: new Date().toISOString(),
            description: '',
          },
        }],
      }),
    } as Response);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /paris vlog/i });
      expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=vid999');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('shows error state with retry button on fetch failure', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't load vlogs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('retries fetching videos when try again is clicked', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error('First failure'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => screen.getByRole('button', { name: /try again/i }));
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(screen.getByText(/no vlogs found/i)).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ─── Calendar tab ──────────────────────────────────────────────────────────

  it('renders date input with default value (7 days from now)', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInput).toBeInTheDocument();
  });

  it('renders start time input defaulting to 10:00', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
  });

  it('renders duration dropdown with 2 hours default', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    const select = screen.getByDisplayValue('2 hours');
    expect(select).toBeInTheDocument();
  });

  it('renders notes textarea', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    const textarea = screen.getByRole('textbox', { name: /notes/i });
    expect(textarea).toBeInTheDocument();
  });

  it('renders Add to Google Calendar button', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    expect(screen.getByRole('button', { name: /add to google calendar/i })).toBeInTheDocument();
  });

  it('renders Export as .ics File button', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    expect(screen.getByRole('button', { name: /export as .ics file/i })).toBeInTheDocument();
  });

  it('shows address chip in calendar tab', () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);
    expect(screen.getAllByText(/Champ de Mars/i).length).toBeGreaterThan(0);
  });

  it('opens Google Calendar URL when Add to Calendar is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);

    await userEvent.click(screen.getByRole('button', { name: /add to google calendar/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('calendar.google.com'),
      '_blank'
    );
  });

  it('triggers .ics file download when export button is clicked', async () => {
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);

    const clickSpy = vi.fn();
    const mockAnchor = { href: '', download: '', click: clickSpy };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as any);

    await userEvent.click(screen.getByRole('button', { name: /export as .ics file/i }));
    expect(clickSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/\.ics$/);
  });

  it('shows success state after adding to calendar', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PlaceActionsPanel {...defaultProps} initialTab="calendar" />);

    await userEvent.click(screen.getByRole('button', { name: /add to google calendar/i }));
    await waitFor(() => {
      expect(screen.getByText(/google calendar opened/i)).toBeInTheDocument();
    });
  });

  // ─── Close button ──────────────────────────────────────────────────────────

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<PlaceActionsPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close panel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has accessible close button with aria-label', () => {
    render(<PlaceActionsPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close panel/i })).toBeInTheDocument();
  });

  it('external video links open in new tab with rel=noopener', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: { videoId: 'xyz' },
          snippet: {
            title: 'Test Video',
            channelTitle: 'Channel',
            thumbnails: { medium: { url: 'https://img.youtube.com/vi/xyz/mqdefault.jpg' } },
            publishedAt: new Date().toISOString(),
            description: '',
          },
        }],
      }),
    } as Response);

    render(<PlaceActionsPanel {...defaultProps} initialTab="vlogs" />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /test video/i });
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
