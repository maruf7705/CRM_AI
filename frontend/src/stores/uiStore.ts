"use client";

import { create } from "zustand";

interface UiState {
  isMobileSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileSidebarOpen: false,
  isCommandPaletteOpen: false,
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
}));
