import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import * as SecureStore from "expo-secure-store";
import { clearSessionAndRedirect } from "../util/clearSessionAndRedirect";
import Auth0 from "react-native-auth0";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.EXPO_PUBLIC_URL_WITH_API;
const AUTHO_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEBUG = __DEV__;

const auth0 = new Auth0({
  domain: AUTHO_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

// ============================================================================
// Types
// ============================================================================

interface ApiOptions extends RequestInit {
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================================================
// Token Management
// ============================================================================

// Prevent multiple simultaneous token refreshes
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Check if JWT token is expired or expiring soon
 */

const isTokenExpired = (token: string, bufferMinutes: number = 5): boolean => {
  try {
    const payLoad = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = payLoad.exp * 1000;
    const bufferTime = bufferMinutes * 60 * 1000;
    const isExpired = Date.now() >= expirationTime - bufferTime;

    if (DEBUG && isExpired) {
      console.log("Token expired or expiring within 5 minutes");
    }
    return isExpired;
  } catch (err) {
    console.error("Failed to decode token: ", err);
    return true;
  }
};

/**
 * Refresh access token using Auth0
 */
const refreshAccessToken = async (): Promise<string> => {
  // If already refreshing, return existing promise
  if (isRefreshing && refreshPromise) {
    if (DEBUG) console.log("Token refresh in progress, waiting...");
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      if (DEBUG) console.log("🔄 Refreshing token...");

      const newTokens = await auth0.auth.refreshToken({ refreshToken });

      if (!newTokens.accessToken) {
        throw new Error("No access token received from Auth0");
      }

      // Save new tokens
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newTokens.accessToken);
      if (newTokens.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newTokens.refreshToken);
      }

      if (DEBUG) console.log("✅ Token refreshed successfully");

      return newTokens.accessToken;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      await clearSessionAndRedirect();
      throw new Error("Session expired. Please log in again.");
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Get valid access token, refreshing if expired
 */
const getValidAccessToken = async (): Promise<string> => {
  let accessToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!accessToken) {
    await clearSessionAndRedirect();
    throw new Error("No access token found. Please log in.");
  }
  // Proactively refresh if expired
  if (isTokenExpired(accessToken)) {
    if (DEBUG) console.log("🔄 Token expired, refreshing proactively...");
    accessToken = await refreshAccessToken();
  }

  return accessToken;
};

// ============================================================================
// HTTP Request Utilities
// ============================================================================

/**
 * Fetch with timeout support
 */

const fetchWithTimeout = async (
  url: string,
  options: ApiOptions,
  timeout: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new ApiError(`Request timeout after ${timeout}ms`, 408);
    }
    // Network error
    if (error instanceof TypeError) {
      throw new ApiError("Network error. Please check your connection.", 0);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Parse response based on content type
 */
const parseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type");

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Get response text
  const text = await response.text();
  const isEmpty = !text || text.trim() === "";

  // Handle empty responses
  if (isEmpty) {
    if (DEBUG) console.log("📭 Empty response body");
    // For successful GET requests, return empty array
    return response.ok && response.status === 200 ? [] : null;
  }

  // Parse JSON
  if (contentType?.includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      if (DEBUG && Array.isArray(parsed)) {
        console.log(`📦 Received array with ${parsed.length} items`);
      }
      return parsed;
    } catch {
      console.error("❌ Failed to parse JSON:", text.substring(0, 100));
      throw new ApiError("Invalid JSON response from server", response.status);
    }
  }

  // Return raw text for non-JSON
  if (DEBUG) console.log("📄 Received text response");
  return text;
};

/**
 * Make authenticated HTTP request
 */
const makeRequest = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  // Build full URL
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (DEBUG) {
    console.log(`🚀 ${options.method || "GET"} ${url}`);
  }

  // Get valid token (will refresh if expired)
  const token = await getValidAccessToken();

  // Prepare headers
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // Add Content-Type for requests with body
  if (options.body && !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  // Make request
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const response = await fetchWithTimeout(url, { ...options, headers }, timeout);

  if (DEBUG) {
    console.log(`📥 ${response.status} ${response.statusText}`);
  }

  // Handle 401 (shouldn't happen with proactive refresh, but just in case)
  if (response.status === 401) {
    if (DEBUG) console.log("🔐 Unexpected 401, attempting token refresh...");

    try {
      const newToken = await refreshAccessToken();

      // Retry with new token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      const retryResponse = await fetchWithTimeout(
        url,
        { ...options, headers: retryHeaders },
        timeout,
      );

      if (retryResponse.status === 401) {
        // Still 401 after refresh - session truly invalid
        await clearSessionAndRedirect();
        throw new ApiError("Session expired. Please log in again.", 401);
      }

      if (!retryResponse.ok) {
        const errorData = await parseResponse(retryResponse);
        throw new ApiError(
          errorData?.message || `Request failed: ${retryResponse.statusText}`,
          retryResponse.status,
          errorData,
        );
      }

      if (DEBUG) console.log("✅ Retry successful after token refresh");
      return await parseResponse(retryResponse);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Authentication failed", 401);
    }
  }

  // Handle other HTTP errors
  if (!response.ok) {
    const errorData = await parseResponse(response);
    const errorMessage =
      errorData?.message || errorData?.error || `HTTP ${response.status}: ${response.statusText}`;

    if (DEBUG) {
      console.error(`❌ API Error ${response.status}:`, errorMessage);
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Parse and return successful response
  const data = await parseResponse(response);

  if (DEBUG) console.log("✅ Request successful\n");

  return data;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Authenticated API client with convenience methods
 */
export const apiClient = {
  /**
   * GET request
   * @example apiClient.get<User[]>('/users')
   */
  get: <T = any>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) =>
    makeRequest<T>(endpoint, { ...options, method: "GET" }),

  /**
   * POST request
   * @example apiClient.post<User>('/users', { name: 'John' })
   */
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiOptions, "method" | "body">) =>
    makeRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   * @example apiClient.put<User>('/users/1', { name: 'Jane' })
   */
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiOptions, "method" | "body">) =>
    makeRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PATCH request
   * @example apiClient.patch<User>('/users/1', { name: 'Jane' })
   */
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiOptions, "method" | "body">) =>
    makeRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   * @example apiClient.delete('/users/1')
   */
  delete: <T = any>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) =>
    makeRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

// Export as both 'api' (short) and 'apiClient' (descriptive)
export const api = apiClient;
export default apiClient;
