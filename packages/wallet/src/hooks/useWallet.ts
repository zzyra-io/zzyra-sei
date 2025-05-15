import { useContext } from "react";
import { WalletContext } from "../contexts/WalletContext";
import type { WalletContextState } from "../core/types";

export const useWallet = (): WalletContextState => {
  const context = useContext(WalletContext);

  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }

  return context;
};
