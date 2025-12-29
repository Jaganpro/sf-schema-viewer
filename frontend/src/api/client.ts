/**
 * API client for communicating with the FastAPI backend.
 */

import type {
  ApiVersionInfo,
  AuthStatus,
  BatchDescribeResponse,
  ObjectBasicInfo,
  ObjectDescribe,
  ObjectEnrichmentResponse,
  SessionInfo,
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

    /** Get detailed session information for popup modal */
    getSessionInfo: (apiVersion?: string): Promise<SessionInfo> => {
      const params = apiVersion ? `?api_version=${encodeURIComponent(apiVersion)}` : '';
      return fetchJson(`/auth/session-info${params}`);
    },
  },

  // Schema operations
  schema: {
    /** Get available Salesforce API versions */
    getApiVersions: (): Promise<ApiVersionInfo[]> =>
      fetchJson('/api/api-versions'),

    /** Get list of all objects in the org */
    listObjects: (apiVersion?: string): Promise<ObjectBasicInfo[]> => {
      const params = apiVersion ? `?api_version=${encodeURIComponent(apiVersion)}` : '';
      return fetchJson(`/api/objects${params}`);
    },

    /** Get full describe for a single object */
    describeObject: (objectName: string, apiVersion?: string): Promise<ObjectDescribe> => {
      const params = apiVersion ? `?api_version=${encodeURIComponent(apiVersion)}` : '';
      return fetchJson(`/api/objects/${encodeURIComponent(objectName)}/describe${params}`);
    },

    /** Describe multiple objects in one request */
    describeObjects: (objectNames: string[], apiVersion?: string): Promise<BatchDescribeResponse> => {
      const params = apiVersion ? `?api_version=${encodeURIComponent(apiVersion)}` : '';
      return fetchJson(`/api/objects/describe${params}`, {
        method: 'POST',
        body: JSON.stringify({ object_names: objectNames }),
      });
    },

    /** Get enrichment data (OWD, record counts) for objects */
    getObjectEnrichment: (objectNames: string[], apiVersion?: string): Promise<ObjectEnrichmentResponse> => {
      const params = apiVersion ? `?api_version=${encodeURIComponent(apiVersion)}` : '';
      return fetchJson(`/api/objects/enrichment${params}`, {
        method: 'POST',
        body: JSON.stringify({ object_names: objectNames }),
      });
    },
  },
};

export { ApiError };
