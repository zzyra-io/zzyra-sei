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

export type Magic = MagicBase<OAuthExtension[]>;

type MagicContextType = {
  magic: Magic | null;
};

const MagicContext = createContext<MagicContextType>({
  magic: null,
});

export const useMagic = () => useContext(MagicContext);

const MagicProvider = ({ children }: { children: ReactNode }) => {
  const [magic, setMagic] = useState<Magic | null>(null);

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
        try {
          // Create a simpler Magic instance without network configuration
          console.log("Creating Magic instance with basic configuration");

          const magic = new MagicBase(
            process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY,
            {
              extensions: [new OAuthExtension()],
            }
          );

          console.log("Magic instance created successfully");
          setMagic(magic);
        } catch (error) {
          console.error("Error initializing Magic SDK:", error);
        }
      } else {
        console.error(
          "Magic API Key is missing. Please check your environment variables."
        );
      }
    }
  }, []);

  const value = useMemo(() => {
    return {
      magic,
    };
  }, [magic]);

  return (
    <MagicContext.Provider value={value}>{children}</MagicContext.Provider>
  );
};

export default MagicProvider;
