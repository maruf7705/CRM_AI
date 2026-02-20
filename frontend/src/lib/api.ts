import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { appConfig } from "./constants";

const ACCESS_TOKEN_KEY = "omnidesk_access_token";
const ACCESS_TOKEN_COOKIE = "accessToken";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  suppressErrorToast?: boolean;
}

const readToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

const writeToken = (token: string | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  const secureSuffix = window.location.protocol === "https:" ? "; Secure" : "";

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${15 * 60}; SameSite=Lax${secureSuffix}`;
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureSuffix}`;
};

let refreshingPromise: Promise<string | null> | null = null;

const extractApiErrorMessage = (error: AxiosError): string => {
  const responseData = error.response?.data as
    | {
        error?: {
          message?: unknown;
        };
        message?: unknown;
      }
    | undefined;

  const errorMessage = responseData?.error?.message;
  if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
    return errorMessage;
  }

  if (typeof responseData?.message === "string" && responseData.message.trim().length > 0) {
    return responseData.message;
  }

  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  return "Request failed";
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshingPromise) {
    refreshingPromise = axios
      .post<{ success: boolean; data?: { accessToken: string } }>(
        `${appConfig.apiBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true, suppressErrorToast: true } as RetriableRequestConfig,
      )
      .then((response) => response.data.data?.accessToken ?? null)
      .catch(() => null)
      .finally(() => {
        refreshingPromise = null;
      });
  }

  return refreshingPromise;
};

export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";

    if (
      !originalRequest ||
      originalRequest._retry ||
      error.response?.status !== 401 ||
      requestUrl.includes("/auth/refresh")
    ) {
      if (
        typeof window !== "undefined" &&
        !originalRequest?.suppressErrorToast &&
        !requestUrl.includes("/auth/")
      ) {
        toast.error(extractApiErrorMessage(error));
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newToken = await refreshAccessToken();
    writeToken(newToken);

    if (!newToken) {
      writeToken(null);
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

export const tokenStorage = {
  get: readToken,
  set: writeToken,
  clear: (): void => writeToken(null),
};
