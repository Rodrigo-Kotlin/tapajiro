import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '@tapajiro/ui';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nenhum pedido" />);
    expect(screen.getByText('Nenhum pedido')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<EmptyState title="Vazio" description="Sem itens para exibir" />);
    expect(screen.getByText('Sem itens para exibir')).toBeInTheDocument();
  });

  it('renders the action when provided', () => {
    render(<EmptyState title="Vazio" action={<button>Criar pedido</button>} />);
    expect(screen.getByRole('button', { name: /criar pedido/i })).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Título" />);
    expect(screen.queryByText(/descrição/i)).not.toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Título" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Vazio" icon={<span data-testid="icon">📦</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
