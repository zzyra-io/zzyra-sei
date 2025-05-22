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

  useEffect(() => {
    console.log("Magic Provider: Initializing Magic SDK");
    if (typeof window !== "undefined") {
      // Hardcoded API key for development - replace with your actual Magic API key
      // In production, use process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY
      console.log(
        "Using Magic API Key:",
        process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY ? "Available" : "Missing"
      );

      if (process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) {
        setIsInitializing(true);
        try {
            // Create a simpler Magic instance without network configuration
          console.log("Creating Magic instance with basic configuration");

          const magic = new MagicBase(
            process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY,
            {
              extensions: [new OAuthExtension()],
              network: {

                chainId: getChainId(),
                rpcUrl: getNetworkUrl(),
              }
            }
          );
          magic.preload().then(() => console.log('Magic <iframe> loaded.'));


          console.log("Magic instance created successfully");
          setMagic(magic);
          setIsInitializing(false);
        } catch (error) {
          console.error("Error initializing Magic SDK:", error);
          setIsInitializing(false);
        }
      } else {
        console.error(
          "Magic API Key is missing. Please check your environment variables."
        );
      }
    }
  }, []);

  useEffect(() => {
    if (magic) {
      magic.user.isLoggedIn().then((isLoggedIn) => {
        setIsAuthenticated(isLoggedIn);
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
    <MagicContext.Provider value={value}>
      {isInitializing ? (
        <div>Loading...</div>
      ) : (
        children
      )}
    </MagicContext.Provider>
  );
};

export default MagicProvider;
