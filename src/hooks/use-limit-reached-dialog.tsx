
'use client';

import { create } from 'zustand';

interface LimitReachedState {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useLimitReachedDialog = create<LimitReachedState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
