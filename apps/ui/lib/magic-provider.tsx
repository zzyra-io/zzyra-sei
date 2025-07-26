import { OAuthExtension } from "@magic-ext/oauth";
import { Magic as MagicBase } from "magic-sdk";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getChainId, getNetworkUrl } from "./utils/network";

export type Magic = MagicBase<OAuthExtension[]>;

type MagicContextType = {
  magic: Magic | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
};

const MagicContext = createContext<MagicContextType>({
  magic: null,
  isAuthenticated: false,
  isInitializing: false,
});

export const useMagic = () => useContext(MagicContext);

const MagicProvider = ({ children }: { children: ReactNode }) => {
  const [magic, setMagic] = useState<Magic | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized || typeof window === "undefined") {
      return;
    }

    // Add a small delay to ensure we're not in a hydration state
    const timer = setTimeout(() => {
      console.log("Magic Provider: Initializing Magic SDK");

      if (process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) {
        setIsInitializing(true);
        try {
          const magic = new MagicBase(
            process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY,
            {
              extensions: [new OAuthExtension()],
              network: {
                chainId: getChainId(),
                rpcUrl: getNetworkUrl(),
              },
            }
          );

          magic.preload().then(() => {
            console.log("Magic <iframe> loaded.");
            setMagic(magic);
            setIsInitializing(false);
            setIsInitialized(true);
          });
        } catch (error) {
          console.error("Error initializing Magic SDK:", error);
          setIsInitializing(false);
          setIsInitialized(true);
        }
      } else {
        console.error("Magic API Key is missing.");
        setIsInitializing(false);
        setIsInitialized(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  useEffect(() => {
    if (magic) {
      magic.user
        .isLoggedIn()
        .then((isLoggedIn) => {
          setIsAuthenticated(isLoggedIn);
        })
        .catch(() => {
          setIsAuthenticated(false);
        });
    }
  }, [magic]);

  const value = useMemo(() => {
    return {
      magic,
      isAuthenticated,
      isInitializing,
    };
  }, [magic, isAuthenticated, isInitializing]);

  return (
    <MagicContext.Provider value={value}>{children}</MagicContext.Provider>
  );
};

export default MagicProvider;
