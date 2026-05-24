const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper that accepts an optional token parameter.
 * Use `getServerToken()` in server components or `getSession()` in client components.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...fetchOptions } = options || {};

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions?.headers,
    },
  });

  if (res.status === 401) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || `API error: ${res.status}`);
  }

  return res.json();
}

export function getApiBaseUrl() {
  return BASE_URL;
}
