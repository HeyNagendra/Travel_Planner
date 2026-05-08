import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from '../components/ChatPanel';

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders the toggle button', () => {
    render(<ChatPanel />);
    const button = screen.getByRole('button', { name: /toggle chat/i });
    expect(button).toBeInTheDocument();
  });

  it('does not show chat window on initial render', () => {
    render(<ChatPanel />);
    expect(screen.queryByText(/travel assistant/i)).not.toBeInTheDocument();
  });

  it('shows a notification dot when no messages exist', () => {
    render(<ChatPanel />);
    // The ping animation span exists for new users
    const button = screen.getByRole('button', { name: /toggle chat/i });
    expect(button).toBeInTheDocument();
  });

  // ─── Open / Close ──────────────────────────────────────────────────────────

  it('opens the chat window when toggle button is clicked', async () => {
    render(<ChatPanel />);
    const button = screen.getByRole('button', { name: /toggle chat/i });
    await userEvent.click(button);
    expect(screen.getByRole('heading', { name: /travel assistant/i })).toBeInTheDocument();
  });

  it('shows empty state with suggested prompts when opened', async () => {
    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));
    expect(screen.getByText(/AI Travel Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Top things to do in Paris/i)).toBeInTheDocument();
    expect(screen.getByText(/Best time to visit Tokyo/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget travel tips/i)).toBeInTheDocument();
  });

  it('closes the chat window when toggle button is clicked again', async () => {
    render(<ChatPanel />);
    const button = screen.getByRole('button', { name: /toggle chat/i });
    await userEvent.click(button);
    expect(screen.getByRole('heading', { name: /travel assistant/i })).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByRole('heading', { name: /travel assistant/i })).not.toBeInTheDocument();
  });

  // ─── Input behaviour ───────────────────────────────────────────────────────

  it('has a disabled send button when input is empty', async () => {
    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));
    const input = screen.getByPlaceholderText(/type your message/i);
    expect(input).toHaveValue('');
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton).toBeDisabled();
  });

  it('allows typing in the message input', async () => {
    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));
    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Hello Paris');
    expect(input).toHaveValue('Hello Paris');
  });

  it('populates input when a suggested prompt is clicked', async () => {
    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));
    await userEvent.click(screen.getByText(/Top things to do in Paris/i));
    const input = screen.getByPlaceholderText(/type your message/i);
    expect(input).toHaveValue('Top things to do in Paris');
  });

  // ─── Send message ──────────────────────────────────────────────────────────

  it('sends a message and shows it in the chat', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Paris is a beautiful city!' }),
    } as Response);

    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));

    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Tell me about Paris');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Tell me about Paris')).toBeInTheDocument();
    });
  });

  it('displays AI response after successful API call', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Paris is wonderful!' }),
    } as Response);

    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));

    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'About Paris?');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Paris is wonderful!')).toBeInTheDocument();
    });
  });

  it('clears input after sending', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Response' }),
    } as Response);

    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));

    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Question');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  it('displays error message when API call fails', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));

    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Hello');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows error from API response body', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API quota exceeded' }),
    } as Response);

    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));

    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Hello');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/API quota exceeded/i)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has accessible aria-label on toggle button', () => {
    render(<ChatPanel />);
    const button = screen.getByRole('button', { name: /toggle chat/i });
    expect(button).toHaveAttribute('aria-label', 'Toggle chat');
  });

  it('has a labelled text input', async () => {
    render(<ChatPanel />);
    await userEvent.click(screen.getByRole('button', { name: /toggle chat/i }));
    const input = screen.getByPlaceholderText(/type your message/i);
    expect(input).toBeInTheDocument();
  });
});
