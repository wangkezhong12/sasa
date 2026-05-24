import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './sidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/chat',
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('Sidebar', () => {
  it('should render the app title', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('Sasa').length).toBeGreaterThan(0);
  });

  it('should render all navigation items', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('对话').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SaaS 管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('工作空间').length).toBeGreaterThan(0);
    expect(screen.getAllByText('设置').length).toBeGreaterThan(0);
  });

  it('should highlight active route', () => {
    render(<Sidebar />);
    const chatLinks = screen.getAllByText('对话');
    const chatLink = chatLinks[0].closest('a');
    expect(chatLink?.className).toContain('bg-sidebar-accent');
  });

  it('should not highlight inactive routes', () => {
    render(<Sidebar />);
    const settingsLinks = screen.getAllByText('设置');
    const settingsLink = settingsLinks[0].closest('a');
    expect(settingsLink?.className).not.toContain('font-medium');
  });

  it('should render version info', () => {
    render(<Sidebar />);
    expect(screen.getAllByText(/v0\.1/).length).toBeGreaterThan(0);
  });
});
