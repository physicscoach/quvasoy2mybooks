import { create } from "zustand";

interface LoginModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Bookly uslubidagi kirish oynasi: istalgan joydan ochish mumkin
 *  (navbar'dagi foydalanuvchi belgisi, bosh sahifadagi tugmalar). */
export const useLoginModal = create<LoginModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
