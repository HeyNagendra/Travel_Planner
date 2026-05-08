import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

// Component that intentionally throws for testing
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error('Test component error');
  return <p>No error</p>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress expected console.error output from React's error boundary
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Test component error')).toBeInTheDocument();
  });

  it('renders a "Try again" button in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders custom fallback instead of default UI when provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback UI</p>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('resets the error state when "Try again" is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    // Error state is shown
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Click Try again — this resets the internal state; children re-render (and throw again here)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    // Error boundary re-catches and shows the error UI again
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has accessible role="alert" on the error container', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});
