import { createContext } from "react";
import type { WalletContextState } from "../core/types";

export const WalletContext = createContext<WalletContextState | undefined>(
  undefined
);
