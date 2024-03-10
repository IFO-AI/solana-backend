import { Account } from "@solana/spl-token";

export interface CreateAndSendTokenRequestBody {
  destinationWallet: string;
  secretKeyBase58: string;
}

export interface CreateAndSendTokenResponseBody {
  transactionId: string;
  mint: string;
}

export interface CreateTokenRequestBody {
  destinationWallet: string;
  secretKeyBase58: string;
  mint: string;
}

export interface CreateTokenResponseBody {
  tx: string;
}

export interface CreateATARequestBody {
  owner: string;
  secretKeyBase58: string;
  mint: string;
}

export interface CreateATAResponseBody {
  accountInfo: Account;
}

export interface CreateKeyPairResponseBody {
  keypair: {
    publicKey: string;
    secretKey: string;
    secretKeyBase58: string;
  };
}
