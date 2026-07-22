import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@tapajiro/ui';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole('button', { name: /clique aqui/i })).toBeInTheDocument();
  });

  it('applies primary variant styles by default', () => {
    render(<Button>Teste</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-action-primary');
    expect(button.className).toContain('text-white');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secundário</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border-action-primary');
    expect(button.className).toContain('text-action-primary');
  });

  it('applies tertiary variant styles', () => {
    render(<Button variant="tertiary">Tertiary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('text-action-primary');
  });

  it('applies attention variant styles', () => {
    render(<Button variant="attention">Attention</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-attention');
    expect(button.className).toContain('text-text-primary');
  });

  it('applies danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-danger');
    expect(button.className).toContain('text-white');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Teste</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Carregando</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Teste
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has minimum 44px touch target for md size', () => {
    render(<Button>Teste</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
  });

  it('has minimum 44px touch target for sm size', () => {
    render(<Button size="sm">Pequeno</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
  });

  it('has minimum 44px touch target for lg size', () => {
    render(<Button size="lg">Grande</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
  });
});
