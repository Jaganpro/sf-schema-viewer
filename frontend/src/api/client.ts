/**
 * API client for communicating with the FastAPI backend.
 */

import type {
  AuthStatus,
  BatchDescribeResponse,
  ObjectBasicInfo,
  ObjectDescribe,
} from '../types/schema';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',  // Include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error);
  }

  return response.json();
}

export const api = {
  // Authentication
  auth: {
    /** Get current authentication status */
    getStatus: (): Promise<AuthStatus> =>
      fetchJson('/auth/status'),

    /** Initiate login (redirects to Salesforce) */
    login: () => {
      window.location.href = '/auth/login';
    },

    /** Logout and clear session */
    logout: async (): Promise<void> => {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    },
  },

  // Schema operations
  schema: {
    /** Get list of all objects in the org */
    listObjects: (): Promise<ObjectBasicInfo[]> =>
      fetchJson('/api/objects'),

    /** Get full describe for a single object */
    describeObject: (objectName: string): Promise<ObjectDescribe> =>
      fetchJson(`/api/objects/${encodeURIComponent(objectName)}/describe`),

    /** Describe multiple objects in one request */
    describeObjects: (objectNames: string[]): Promise<BatchDescribeResponse> =>
      fetchJson('/api/objects/describe', {
        method: 'POST',
        body: JSON.stringify({ object_names: objectNames }),
      }),
  },
};

export { ApiError };
