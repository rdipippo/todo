import { test as base, Page, Route } from '@playwright/test';

export interface MockUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  enabled: boolean;
  group_owner_id: number | null;
  group_can_manage: boolean;
  perm_create_tasks: boolean;
  perm_edit_tasks: boolean;
  perm_delete_tasks: boolean;
  perm_assign_tasks: boolean;
  created_at: string;
}

export interface MockTodo {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  completed: boolean;
  percent_complete: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MockCategory {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    email_verified: true,
    role: 'user',
    enabled: true,
    group_owner_id: null,
    group_can_manage: false,
    perm_create_tasks: true,
    perm_edit_tasks: true,
    perm_delete_tasks: true,
    perm_assign_tasks: true,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockTodo(overrides: Partial<MockTodo> = {}): MockTodo {
  return {
    id: 1,
    user_id: 1,
    category_id: null,
    title: 'Test todo',
    completed: false,
    percent_complete: 0,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockCategory(overrides: Partial<MockCategory> = {}): MockCategory {
  return {
    id: 1,
    user_id: 1,
    name: 'Work',
    color: '#3b82f6',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

type RouteHandler = (route: Route) => Promise<void> | void;

export class ApiMock {
  private handlers: Map<string, RouteHandler> = new Map();

  onGet(path: string, body: unknown, status = 200) {
    this.handlers.set(`GET:${path}`, (route) =>
      route.fulfill({ status, json: body })
    );
    return this;
  }

  onPost(path: string, body: unknown, status = 200) {
    this.handlers.set(`POST:${path}`, (route) =>
      route.fulfill({ status, json: body })
    );
    return this;
  }

  onPatch(path: string, body: unknown, status = 200) {
    this.handlers.set(`PATCH:${path}`, (route) =>
      route.fulfill({ status, json: body })
    );
    return this;
  }

  onPut(path: string, body: unknown, status = 200) {
    this.handlers.set(`PUT:${path}`, (route) =>
      route.fulfill({ status, json: body })
    );
    return this;
  }

  onDelete(path: string, body: unknown, status = 200) {
    this.handlers.set(`DELETE:${path}`, (route) =>
      route.fulfill({ status, json: body })
    );
    return this;
  }

  onPostError(path: string, body: unknown, status: number) {
    return this.onPost(path, body, status);
  }

  onGetError(path: string, body: unknown, status: number) {
    return this.onGet(path, body, status);
  }

  async apply(page: Page) {
    // Remove any previously registered API route handlers
    await page.unroute('**/api/**');

    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const path = url.pathname.replace('/api', '');
      const key = `${method}:${path}`;

      const handler = this.handlers.get(key);
      if (handler) {
        return handler(route);
      }

      // Default: return 404 for unhandled API calls
      return route.fulfill({ status: 404, json: { error: 'Not mocked' } });
    });
  }
}

/**
 * Sets up an authenticated page by injecting tokens into localStorage
 * and mocking the /auth/me endpoint.
 */
export async function setupAuth(page: Page, api: ApiMock, user?: MockUser) {
  const testUser = user || mockUser();
  api.onGet('/auth/me', { user: testUser });
  api.onPost('/auth/logout', { message: 'Logged out successfully' });
  api.onPost('/auth/refresh', {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
  });

  await api.apply(page);

  // Set tokens in localStorage before navigating
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'fake-access-token');
    localStorage.setItem('refreshToken', 'fake-refresh-token');
  });
}

export const test = base;
export { expect } from '@playwright/test';
