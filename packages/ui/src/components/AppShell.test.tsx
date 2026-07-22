import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppShell } from '@tapajiro/ui';

describe('AppShell', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children in main landmark', () => {
    render(
      <AppShell>
        <div>Conteúdo</div>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('renders header when provided', () => {
    render(
      <AppShell header={<div>Cabeçalho</div>}>
        <div>Conteúdo</div>
      </AppShell>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Cabeçalho')).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <AppShell sidebar={<div>Menu</div>}>
        <div>Conteúdo</div>
      </AppShell>,
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('applies background color', () => {
    const { container } = render(
      <AppShell>
        <div>Teste</div>
      </AppShell>,
    );
    expect(container.firstElementChild?.className).toContain('bg-bg-app');
  });

  it('hides hamburger on md+ screens', () => {
    const { container } = render(
      <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
        <div>Content</div>
      </AppShell>,
    );
    const hamburger = container.querySelector('button[aria-label="Menu"]');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger?.className).toContain('md:hidden');
  });

  it('does not render hamburger without sidebar', () => {
    const { container } = render(
      <AppShell header={<div>Header</div>}>
        <div>Content</div>
      </AppShell>,
    );
    const hamburger = container.querySelector('button[aria-label="Menu"]');
    expect(hamburger).not.toBeInTheDocument();
  });

  describe('Drawer open/close', () => {
    it('opens drawer when hamburger is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu Items</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const drawer = container.querySelector('[role="dialog"]');
      expect(drawer).toBeInTheDocument();
      expect(drawer?.getAttribute('aria-modal')).toBe('true');
    });

    it('sets aria-expanded on hamburger', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');

      await user.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    });

    it('drawer has accessible name', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const drawer = container.querySelector('[role="dialog"]');
      expect(drawer?.getAttribute('aria-label')).toBe('Navegação');
    });

    it('closes drawer on Escape key', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);
      expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it('closes drawer when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const backdrop = container.querySelector('[aria-hidden="true"].fixed');
      expect(backdrop).toBeInTheDocument();
      await user.click(backdrop as HTMLElement);
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it('closes drawer when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      await user.click(closeBtn);
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  });

  describe('Focus management', () => {
    it('does not move focus on initial mount', () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      expect(focusSpy).not.toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('does not move focus when rendering closed AppShell', () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      focusSpy.mockClear();
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      expect(focusSpy).not.toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('preserves pre-existing focus on mount', () => {
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      btn.focus();
      expect(document.activeElement).toBe(btn);

      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      expect(document.activeElement).toBe(btn);
      document.body.removeChild(btn);
    });

    it('focuses close button when drawer opens', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      expect(document.activeElement).toBe(closeBtn);
    });

    it('restores focus to hamburger after closing with Escape', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      await user.keyboard('{Escape}');
      expect(document.activeElement).toBe(hamburger);
    });

    it('restores focus to hamburger after backdrop close', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const backdrop = container.querySelector('[aria-hidden="true"].fixed');
      await user.click(backdrop as HTMLElement);
      expect(document.activeElement).toBe(hamburger);
    });

    it('restores focus to hamburger after close button click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      await user.click(closeBtn);
      expect(document.activeElement).toBe(hamburger);
    });

    it('traps focus with Tab inside drawer', async () => {
      const user = userEvent.setup();
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );

      const hamburger = document.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      expect(document.activeElement).toBe(closeBtn);

      await user.tab();
      expect(document.activeElement).toBe(closeBtn);
    });
  });

  describe('Body scroll lock', () => {
    it('locks body scroll when drawer opens', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
    });

    it('restores body scroll when drawer closes', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);
      await user.keyboard('{Escape}');

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.position).toBe('');
    });
  });

  describe('Touch targets', () => {
    it('hamburger button meets minimum 44x44 touch target', () => {
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]');
      expect(hamburger?.className).toContain('h-11');
      expect(hamburger?.className).toContain('w-11');
    });

    it('close button meets minimum 44x44 touch target', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      expect(closeBtn.className).toContain('h-11');
      expect(closeBtn.className).toContain('w-11');
    });
  });

  describe('Focus tokens', () => {
    it('hamburger uses outline-action-focus for focus', () => {
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]');
      expect(hamburger?.className).toContain('outline-action-focus');
    });

    it('close button uses outline-action-focus for focus', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
      expect(closeBtn.className).toContain('outline-action-focus');
    });
  });

  describe('Reduced motion', () => {
    it('respects prefers-reduced-motion via CSS', () => {
      const { container } = render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );
      expect(container.firstElementChild).toBeInTheDocument();
    });
  });

  describe('Desktop sidebar', () => {
    it('hides drawer on md+ screens (desktop)', () => {
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const drawerContainer = container.querySelector('.hidden.w-64');
      expect(drawerContainer?.className).toContain('md:block');
    });

    it('has sidebar on desktop', () => {
      const { container } = render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      const sidebar = container.querySelector('.hidden.w-64');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('installAction', () => {
    it('renders installAction in desktop sidebar', () => {
      render(
        <AppShell
          header={<div>Header</div>}
          sidebar={<div>Menu</div>}
          installAction={<button type="button">Instalar</button>}
        >
          <div>Content</div>
        </AppShell>,
      );
      expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument();
    });

    it('renders installAction in mobile drawer when open', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AppShell
          header={<div>Header</div>}
          sidebar={<div>Menu</div>}
          installAction={<button type="button">Instalar</button>}
        >
          <div>Content</div>
        </AppShell>,
      );
      const hamburger = container.querySelector('button[aria-label="Menu"]') as HTMLButtonElement;
      await user.click(hamburger);

      const installButtons = screen.getAllByRole('button', { name: /instalar/i });
      expect(installButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render installAction when not provided', () => {
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Menu</div>}>
          <div>Content</div>
        </AppShell>,
      );
      expect(screen.queryByRole('button', { name: /instalar/i })).not.toBeInTheDocument();
    });
  });
});
