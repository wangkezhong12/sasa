import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthBindingForm, type AuthStrategySchema } from './auth-binding-form';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('localStorage', {
  getItem: vi.fn().mockReturnValue('test-token'),
});

const api_key_strategy: AuthStrategySchema = {
  type: 'api_key',
  formFields: [
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
  ],
};

const app_secret_strategy: AuthStrategySchema = {
  type: 'app_secret',
  formFields: [
    { name: 'appId', label: 'App ID', type: 'text', required: true },
    { name: 'appSecret', label: 'App Secret', type: 'password', required: true },
  ],
};

const oauth2_strategy: AuthStrategySchema = {
  type: 'oauth2_code',
  formFields: [],
};

describe('AuthBindingForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders fields from schema', () => {
    render(
      <AuthBindingForm
        connectorId="conn-1"
        strategies={[api_key_strategy]}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('API Key')).toBeDefined();
    expect(screen.getByText('绑定')).toBeDefined();
  });

  it('renders tab selector for multiple strategies', () => {
    render(
      <AuthBindingForm
        connectorId="conn-1"
        strategies={[api_key_strategy, app_secret_strategy]}
        onSuccess={vi.fn()}
      />,
    );
    // Should show both tab buttons
    expect(screen.getAllByText('API Key').length).toBeGreaterThan(0);
    expect(screen.getAllByText('App Secret').length).toBeGreaterThan(0);
  });

  it('switches strategies on tab click', () => {
    render(
      <AuthBindingForm
        connectorId="conn-1"
        strategies={[api_key_strategy, app_secret_strategy]}
        onSuccess={vi.fn()}
      />,
    );
    // Click the tab containing "App Secret" text
    const tabs = screen.getAllByText('App Secret');
    // The tab button shows "App Secret"
    fireEvent.click(tabs[0]);

    expect(screen.getByLabelText('App ID')).toBeDefined();
  });

  it('shows OAuth button for oauth2_code', () => {
    render(
      <AuthBindingForm
        connectorId="conn-1"
        strategies={[oauth2_strategy]}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText('前往授权')).toBeDefined();
    expect(screen.getByText('点击绑定后将跳转到第三方授权页面')).toBeDefined();
  });

  it('shows error message on failed submission', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    render(
      <AuthBindingForm
        connectorId="conn-1"
        strategies={[api_key_strategy]}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'bad-key' },
    });

    // Submit the form
    const form = screen.getByLabelText('API Key').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });
});
