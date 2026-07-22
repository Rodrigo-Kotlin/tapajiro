import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  Button,
  IconButton,
  StatusBadge,
  EmptyState,
  AppShell,
  OfflineBanner,
  UpdateAvailableBanner,
} from '@tapajiro/ui';

import type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
  StatusBadgeProps,
  EmptyStateProps,
  AppShellProps,
  OfflineBannerProps,
  UpdateAvailableBannerProps,
  Tokens,
  Theme,
} from '@tapajiro/ui';

import { tokens, theme } from '@tapajiro/ui';

function assertType<T>(_value: T): void {}

describe('Public API — @tapajiro/ui', () => {
  it('exports all 7 components as functions', () => {
    expect(typeof Button).toBe('function');
    expect(typeof IconButton).toBe('function');
    expect(typeof StatusBadge).toBe('function');
    expect(typeof EmptyState).toBe('function');
    expect(typeof AppShell).toBe('function');
    expect(typeof OfflineBanner).toBe('function');
    expect(typeof UpdateAvailableBanner).toBe('function');
  });

  it('exports tokens and theme as objects', () => {
    expect(typeof tokens).toBe('object');
    expect(typeof theme).toBe('object');
    expect(tokens).toHaveProperty('colors');
    expect(tokens).toHaveProperty('typography');
    expect(tokens).toHaveProperty('spacing');
    expect(tokens).toHaveProperty('borderRadius');
    expect(tokens).toHaveProperty('shadows');
    expect(theme).toHaveProperty('colors');
    expect(theme).toHaveProperty('typography');
  });

  it('exports types that resolve correctly', () => {
    const buttonVariant: ButtonVariant = 'primary';
    const buttonSize: ButtonSize = 'md';
    const iconButtonVariant: IconButtonVariant = 'ghost';
    const iconButtonSize: IconButtonSize = 'sm';

    assertType<ButtonProps>({ children: 'test' });
    assertType<IconButtonProps>({ 'aria-label': 'test', children: '+' });
    assertType<StatusBadgeProps>({ status: 'pending', label: 'Pendente' });
    assertType<EmptyStateProps>({ title: 'Vazio' });
    assertType<AppShellProps>({ children: 'shell' });
    assertType<OfflineBannerProps>({ isOffline: false });
    assertType<UpdateAvailableBannerProps>({
      isVisible: false,
      onUpdate: () => {},
    });

    assertType<Tokens>(tokens);
    assertType<Theme>(theme);

    expect(buttonVariant).toBe('primary');
    expect(buttonSize).toBe('md');
    expect(iconButtonVariant).toBe('ghost');
    expect(iconButtonSize).toBe('sm');
  });

  it('renders Button', () => {
    render(<Button>Clique</Button>);
    expect(screen.getByRole('button', { name: /clique/i })).toBeInTheDocument();
  });

  it('renders IconButton', () => {
    render(<IconButton aria-label="Adicionar">+</IconButton>);
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('renders StatusBadge', () => {
    render(<StatusBadge status="pending" label="Pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('renders EmptyState', () => {
    render(<EmptyState title="Nada aqui" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('renders AppShell with children', () => {
    render(<AppShell>Conteúdo</AppShell>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('renders OfflineBanner when offline', () => {
    render(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/sem conexão/i)).toBeInTheDocument();
  });

  it('does not render OfflineBanner when online', () => {
    const { container } = render(<OfflineBanner isOffline={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders UpdateAvailableBanner when visible', () => {
    const onUpdate = vi.fn();
    render(<UpdateAvailableBanner isVisible={true} onUpdate={onUpdate} />);
    expect(screen.getByText(/nova versão disponível/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atualizar agora/i })).toBeInTheDocument();
  });

  it('does not render UpdateAvailableBanner when hidden', () => {
    const { container } = render(<UpdateAvailableBanner isVisible={false} onUpdate={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
