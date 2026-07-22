import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '@tapajiro/ui';

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge status="pending" label="Pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('has a colored dot indicator', () => {
    const { container } = render(<StatusBadge status="confirmed" label="Confirmado" />);
    const badge = container.querySelector('span');
    const dot = badge?.querySelector('span');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct color for pending status', () => {
    const { container } = render(<StatusBadge status="pending" label="Pendente" />);
    const dot = container.querySelector('.bg-attention');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct color for confirmed status', () => {
    const { container } = render(<StatusBadge status="confirmed" label="Confirmado" />);
    const dot = container.querySelector('.bg-action-primary');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct color for preparing status', () => {
    const { container } = render(<StatusBadge status="preparing" label="Preparando" />);
    const dot = container.querySelector('.bg-attention');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct color for delivered status', () => {
    const { container } = render(<StatusBadge status="delivered" label="Entregue" />);
    const dot = container.querySelector('.bg-success');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct color for cancelled status', () => {
    const { container } = render(<StatusBadge status="cancelled" label="Cancelado" />);
    const dot = container.querySelector('.bg-danger');
    expect(dot).toBeInTheDocument();
  });

  it('applies neutral color for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown" label="Desconhecido" />);
    const dot = container.querySelector('.bg-text-secondary');
    expect(dot).toBeInTheDocument();
  });
});
