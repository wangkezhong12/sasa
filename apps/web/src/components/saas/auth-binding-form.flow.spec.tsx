/**
 * Integration test for SaaS binding flow.
 *
 * Tests the full flow: fetch auth-schema → render form → submit binding.
 * Uses Vitest + React Testing Library to simulate the user flow
 * without requiring a running server or Playwright.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthBindingForm, type AuthStrategySchema } from './auth-binding-form';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('localStorage', {
  getItem: vi.fn().mockReturnValue('test-jwt-token'),
});

describe('SaaS Binding Flow Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should complete api_key binding flow', async () => {
    // Step 1: Auth schema response
    const api_key_strategy: AuthStrategySchema = {
      type: 'api_key',
      formFields: [
        { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      ],
    };

    // Step 2: Bind response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'binding-1',
        connectorId: 'demo',
        authType: 'api_key',
        status: 'active',
      }),
    });

    const onSuccess = vi.fn();

    // Step 3: Render form with strategy schema
    render(
      <AuthBindingForm
        connectorId="demo"
        strategies={[api_key_strategy]}
        onSuccess={onSuccess}
      />,
    );

    // Step 4: Verify form renders
    expect(screen.getByLabelText('API Key')).toBeDefined();
    expect(screen.getByText('绑定')).toBeDefined();

    // Step 5: Fill in and submit
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-demo-key-12345' },
    });

    const form = screen.getByLabelText('API Key').closest('form')!;
    fireEvent.submit(form);

    // Step 6: Verify API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/saas-bindings');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.authType).toBe('api_key');
      expect(body.apiKey).toBe('sk-demo-key-12345');
      expect(body.connectorId).toBe('demo');
    });

    // Step 7: Verify success callback
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should complete multi-strategy binding flow', async () => {
    const strategies: AuthStrategySchema[] = [
      {
        type: 'api_key',
        formFields: [
          { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        ],
      },
      {
        type: 'app_secret',
        formFields: [
          { name: 'appId', label: 'App ID', type: 'text', required: true },
          { name: 'appSecret', label: 'App Secret', type: 'password', required: true },
        ],
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'b-2', connectorId: 'demo', authType: 'app_secret', status: 'active' }),
    });

    render(
      <AuthBindingForm connectorId="demo" strategies={strategies} onSuccess={vi.fn()} />,
    );

    // Should show both strategy tabs
    expect(screen.getAllByText('API Key').length).toBeGreaterThan(0);

    // Switch to App Secret tab
    const appSecretTabs = screen.getAllByText('App Secret');
    fireEvent.click(appSecretTabs[0]);

    // Verify App Secret form fields rendered
    expect(screen.getByLabelText('App ID')).toBeDefined();
    expect(screen.getByLabelText('App Secret')).toBeDefined();

    // Fill form
    fireEvent.change(screen.getByLabelText('App ID'), { target: { value: 'my-app-id' } });
    fireEvent.change(screen.getByLabelText('App Secret'), { target: { value: 'my-app-secret' } });

    // Submit
    const form = screen.getByLabelText('App ID').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.authType).toBe('app_secret');
      expect(body.appId).toBe('my-app-id');
      expect(body.appSecret).toBe('my-app-secret');
    });
  });

  it('should handle OAuth2 redirect flow', async () => {
    const oauth2_strategy: AuthStrategySchema = {
      type: 'oauth2_code',
      formFields: [],
    };

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authorizeUrl: 'https://auth.example.com/authorize?state=abc123',
        state: 'abc123',
      }),
    });

    render(
      <AuthBindingForm connectorId="demo" strategies={[oauth2_strategy]} onSuccess={vi.fn()} />,
    );

    expect(screen.getByText('前往授权')).toBeDefined();

    // Click OAuth button
    const form = screen.getByText('前往授权').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Should have called the authorize endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/oauth2/authorize');
      expect(options.body).toContain('demo');
    });

    // Restore location
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });
});
