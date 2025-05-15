declare module "magic-sdk" {
  import { RPCProviderModule } from "@magic-sdk/provider";
  import { OAuthExtension } from "@magic-ext/oauth";
  import { AuthExtension } from "@magic-ext/auth";

  export interface MagicSDKAdditionalConfiguration {
    network?: {
      rpcUrl: string;
      chainId: number;
    };
    locale?: string;
    endpoint?: string;
    testMode?: boolean;
  }

  export class Magic {
    constructor(
      apiKey: string,
      options?: MagicSDKAdditionalConfiguration & {
        extensions?: any[];
      }
    );

    auth: AuthExtension;
    oauth: OAuthExtension;
    rpcProvider: RPCProviderModule;
    user: {
      isLoggedIn(): Promise<boolean>;
      getInfo(): Promise<{ publicAddress: string | null }>;
      generateIdToken(options?: { lifespan?: number }): Promise<string>;
      logout(): Promise<void>;
    };
  }
}

declare module "@magic-ext/oauth" {
  export class OAuthExtension {
    constructor();
    loginWithRedirect(options: {
      provider: string;
      redirectURI?: string;
    }): Promise<void>;
  }
}

declare module "@magic-ext/auth" {
  export class AuthExtension {
    constructor();
    loginWithMagicLink(params: { email: string }): Promise<void>;
    loginWithCredential(): Promise<void>;
  }
}

declare module "@magic-sdk/provider" {
  export class RPCProviderModule {
    send(method: string, params?: any[]): Promise<any>;
  }
}
