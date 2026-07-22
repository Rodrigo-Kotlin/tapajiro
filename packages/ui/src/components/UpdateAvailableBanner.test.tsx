import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UpdateAvailableBanner } from '@tapajiro/ui';

describe('UpdateAvailableBanner', () => {
  it('is visible when isVisible is true', () => {
    render(<UpdateAvailableBanner isVisible={true} onUpdate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/nova versão/i)).toBeInTheDocument();
  });

  it('is not visible when isVisible is false', () => {
    render(<UpdateAvailableBanner isVisible={false} onUpdate={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls onUpdate when update button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<UpdateAvailableBanner isVisible={true} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('does not auto-reload on render', () => {
    const { rerender } = render(<UpdateAvailableBanner isVisible={false} onUpdate={vi.fn()} />);
    rerender(<UpdateAvailableBanner isVisible={true} onUpdate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    render(<UpdateAvailableBanner isVisible={true} onUpdate={vi.fn()} />);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('bg-action-primary');
    expect(banner.className).toContain('fixed');
  });

  it('disables button when isUpdating is true', () => {
    render(<UpdateAvailableBanner isVisible={true} isUpdating={true} onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /atualizar/i })).toBeDisabled();
  });

  it('shows spinner when isUpdating is true', () => {
    render(<UpdateAvailableBanner isVisible={true} isUpdating={true} onUpdate={vi.fn()} />);
    const button = screen.getByRole('button', { name: /atualizar/i });
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not call onUpdate when isUpdating and button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<UpdateAvailableBanner isVisible={true} isUpdating={true} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('banner remains visible when isUpdating is true', () => {
    const { rerender } = render(
      <UpdateAvailableBanner isVisible={true} isUpdating={false} onUpdate={vi.fn()} />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<UpdateAvailableBanner isVisible={true} isUpdating={true} onUpdate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('enables button when isUpdating transitions back to false', () => {
    const { rerender } = render(
      <UpdateAvailableBanner isVisible={true} isUpdating={true} onUpdate={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /atualizar/i })).toBeDisabled();
    rerender(<UpdateAvailableBanner isVisible={true} isUpdating={false} onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /atualizar/i })).not.toBeDisabled();
  });
});
