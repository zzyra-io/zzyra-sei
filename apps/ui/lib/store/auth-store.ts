import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
  walletAddress?: string;
}

interface Token {
  accessToken: string;
  refreshToken: string;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setToken: (token: Token) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  executeLogin: (user: User, token: Token) => void;
  executeLogout: () => void;
  clearError: () => void;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: Token;
}

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: {
        accessToken: "",
        refreshToken: "",
      },

      // Actions
      setUser: (user) => set({ user }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setToken: (token) => set({ token }),

      executeLogin: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      executeLogout: () =>
        set({
          user: null,
          token: { accessToken: "", refreshToken: "" },
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
