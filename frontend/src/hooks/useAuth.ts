"use client";

import { useCallback, useMemo } from "react";
import { api, tokenStorage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { AuthPayload, AuthUser } from "@/types";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from "@/lib/validators";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ResendVerificationInput {
  email: string;
}

interface AvatarUploadResponse {
  avatarUrl: string;
}

export const useAuth = () => {
  const {
    accessToken,
    refreshToken,
    organizationId,
    role,
    organization,
    user,
    isAuthenticated,
    hasHydrated,
    setAuthPayload,
    setAccessToken,
    updateUser,
    clearSession,
  } = useAuthStore();

  const login = useCallback(
    async (payload: LoginInput): Promise<AuthPayload> => {
      const response = await api.post<ApiSuccess<AuthPayload>>("/auth/login", payload);
      const authPayload = response.data.data;

      tokenStorage.set(authPayload.accessToken);
      setAuthPayload(authPayload);

      return authPayload;
    },
    [setAuthPayload],
  );

  const register = useCallback(
    async (payload: RegisterInput): Promise<AuthPayload> => {
      const response = await api.post<ApiSuccess<AuthPayload>>("/auth/register", payload);
      const authPayload = response.data.data;

      tokenStorage.set(authPayload.accessToken);
      setAuthPayload(authPayload);

      return authPayload;
    },
    [setAuthPayload],
  );

  const refreshSession = useCallback(async (): Promise<AuthPayload | null> => {
    try {
      const response = await api.post<ApiSuccess<AuthPayload>>("/auth/refresh", {});
      const authPayload = response.data.data;

      tokenStorage.set(authPayload.accessToken);
      setAuthPayload(authPayload);

      return authPayload;
    } catch {
      tokenStorage.clear();
      clearSession();
      return null;
    }
  }, [clearSession, setAuthPayload]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout", {});
    } finally {
      tokenStorage.clear();
      clearSession();
    }
  }, [clearSession]);

  const forgotPassword = useCallback(async (payload: ForgotPasswordInput): Promise<void> => {
    await api.post("/auth/forgot-password", payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordInput): Promise<void> => {
    await api.post("/auth/reset-password", payload);
  }, []);

  const verifyEmail = useCallback(async (payload: VerifyEmailInput): Promise<void> => {
    await api.post("/auth/verify-email", payload);
  }, []);

  const resendVerification = useCallback(async (payload: ResendVerificationInput): Promise<void> => {
    await api.post("/auth/resend-verification", payload);
  }, []);

  const fetchMe = useCallback(async (): Promise<AuthUser> => {
    const response = await api.get<ApiSuccess<AuthUser>>("/users/me");
    const me = response.data.data;

    updateUser(me);
    return me;
  }, [updateUser]);

  const updateProfile = useCallback(
    async (payload: UpdateProfileInput): Promise<AuthUser> => {
      const response = await api.patch<ApiSuccess<AuthUser>>("/users/me", payload);
      const updated = response.data.data;

      updateUser(updated);
      return updated;
    },
    [updateUser],
  );

  const changePassword = useCallback(async (payload: ChangePasswordInput): Promise<void> => {
    await api.patch("/users/me/password", payload);
    tokenStorage.clear();
    clearSession();
  }, [clearSession]);

  const uploadAvatar = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.post<ApiSuccess<AvatarUploadResponse>>("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const avatarUrl = response.data.data.avatarUrl;
      if (user) {
        updateUser({ ...user, avatar: avatarUrl });
      }

      return avatarUrl;
    },
    [updateUser, user],
  );

  return useMemo(
    () => ({
      accessToken,
      refreshToken,
      organizationId,
      role,
      organization,
      user,
      isAuthenticated,
      hasHydrated,
      fullName: user ? `${user.firstName} ${user.lastName}` : "",
      login,
      register,
      refreshSession,
      logout,
      forgotPassword,
      resetPassword,
      verifyEmail,
      resendVerification,
      fetchMe,
      updateProfile,
      changePassword,
      uploadAvatar,
      setAccessToken,
    }),
    [
      accessToken,
      changePassword,
      fetchMe,
      forgotPassword,
      hasHydrated,
      isAuthenticated,
      login,
      logout,
      organization,
      organizationId,
      refreshSession,
      refreshToken,
      register,
      resendVerification,
      resetPassword,
      role,
      setAccessToken,
      updateProfile,
      uploadAvatar,
      user,
      verifyEmail,
    ],
  );
};
