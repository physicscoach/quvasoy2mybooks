import { create } from "zustand";
import type { Me } from "@/types/user";

interface AuthState {
  user: Me | null;
  setUser: (user: Me | null) => void;
}

// Faqat UI uchun (navbar, profil kartasi va h.k.) — token bu yerda saqlanmaydi,
// token httpOnly cookie'da, JS unga tegina olmaydi.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
