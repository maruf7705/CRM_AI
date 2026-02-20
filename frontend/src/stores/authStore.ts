"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthOrganization, AuthPayload, AuthSession, AuthUser, Role } from "@/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  organizationId: string | null;
  role: Role | null;
  organization: AuthOrganization | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setAuthPayload: (payload: AuthPayload) => void;
  setAccessToken: (token: string | null) => void;
  updateUser: (user: AuthUser) => void;
  setHasHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
}

const baseState = {
  accessToken: null,
  refreshToken: null,
  organizationId: null,
  role: null,
  organization: null,
  user: null,
  isAuthenticated: false,
  hasHydrated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...baseState,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          organizationId: session.organizationId,
          role: session.role,
          organization: {
            id: session.organizationId,
            name: "",
            slug: "",
            role: session.role,
          },
          user: session.user,
          isAuthenticated: true,
        }),
      setAuthPayload: (payload) =>
        set({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          organizationId: payload.org.id,
          role: payload.org.role,
          organization: payload.org,
          user: payload.user,
          isAuthenticated: true,
        }),
      setAccessToken: (token) =>
        set((state) => ({
          accessToken: token,
          isAuthenticated: Boolean(token) && Boolean(state.user),
        })),
      updateUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(state.accessToken),
        })),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      clearSession: () => set({ ...baseState, hasHydrated: true }),
    }),
    {
      name: "omnidesk-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        organizationId: state.organizationId,
        role: state.role,
        organization: state.organization,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
