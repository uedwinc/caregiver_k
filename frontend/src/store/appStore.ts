import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CareCircle {
  id: string;
  name: string;
  role: string;
  memberId: string;
}

interface CareRecipient {
  id: string;
  fullName: string;
  nickname?: string;
  careCircleId: string;
}

interface AppState {
  activeCareCircle: CareCircle | null;
  activeCareRecipient: CareRecipient | null;
  setActiveCareCircle: (circle: CareCircle | null) => void;
  setActiveCareRecipient: (recipient: CareRecipient | null) => void;
  highContrastMode: boolean;
  largeTextMode: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCareCircle: null,
      activeCareRecipient: null,
      setActiveCareCircle: (circle) => set({ activeCareCircle: circle }),
      setActiveCareRecipient: (recipient) => set({ activeCareRecipient: recipient }),
      highContrastMode: false,
      largeTextMode: false,
      toggleHighContrast: () => set((s) => ({ highContrastMode: !s.highContrastMode })),
      toggleLargeText: () => set((s) => ({ largeTextMode: !s.largeTextMode })),
    }),
    {
      name: 'caregiver-hub-app',
    }
  )
);
