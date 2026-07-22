import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OfflineBanner } from '@tapajiro/ui';

describe('OfflineBanner', () => {
  it('is visible when isOffline is true', () => {
    render(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/sem conexão/i)).toBeInTheDocument();
  });

  it('is not visible when isOffline is false', () => {
    render(<OfflineBanner isOffline={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has correct styling', () => {
    render(<OfflineBanner isOffline={true} />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('bg-attention');
    expect(banner.className).toContain('fixed');
  });

  it('toggles visibility', () => {
    const { rerender } = render(<OfflineBanner isOffline={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<OfflineBanner isOffline={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
