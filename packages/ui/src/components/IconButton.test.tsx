import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { IconButton } from '@tapajiro/ui';

describe('IconButton', () => {
  it('requires an accessible name (aria-label)', () => {
    render(
      <IconButton aria-label="Fechar">
        <span>X</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('has 44x44 minimum touch target at md size', () => {
    render(
      <IconButton aria-label="Ação">
        <span>+</span>
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <IconButton disabled aria-label="Desabilitado">
        <span>X</span>
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies ghost variant by default', () => {
    render(
      <IconButton aria-label="Teste">
        <span>+</span>
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
  });

  it('applies primary variant styles', () => {
    render(
      <IconButton variant="primary" aria-label="Primário">
        <span>+</span>
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-action-primary');
  });

  it('shows spinner when loading', () => {
    render(
      <IconButton loading aria-label="Carregando">
        <span>+</span>
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton onClick={onClick} aria-label="Ação">
        <span>+</span>
      </IconButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has focus-visible outline', () => {
    render(
      <IconButton aria-label="Foco">
        <span>+</span>
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible:outline-2');
  });
});
