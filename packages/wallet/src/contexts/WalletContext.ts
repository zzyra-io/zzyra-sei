import { createContext } from "react";
import type { WalletContextState } from "../core/types";




export const WalletContext = createContext<WalletContextState | undefined>({
  walletService: null,
  persistedWallet: null,
  persistedWallets: [],
  isLoadingPersistedWallet: false,
  appError: null,
  syncWalletWithDb: () => Promise.resolve(),
  clearPersistedWallet: () => Promise.resolve(),
  fetchUserPersistedWallets: () => Promise.resolve([]),
  userId: undefined,
  magicInstance: null,
  setAppUserId: () => { },
}
);
