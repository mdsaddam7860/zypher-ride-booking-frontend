import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getStoredToken, useSessionStore } from "@/store/useSessionStore";
import type { ApiErrorBody } from "@/types";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

// Attach the current session's JWT to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the token is missing/expired/invalid — clear the session and
// bounce to /login rather than leaving the UI in a half-authed state.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      useSessionStore.getState().clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Pulls a readable message out of the backend's { error: { code, message } } shape. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }
  return fallback;
}
