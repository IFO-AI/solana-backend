import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { createSolanaKeypair, generateKeypairAndAirdrop } from "./wallet";
import { decodeBase58ToKeypair, encodeKeypairToBase58 } from "./util";
import { Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { createATA, createAndSendToken, sendTokens } from "./mint";
import {
  CreateKeyPairResponseBody,
  CreateAndSendTokenRequestBody,
  CreateAndSendTokenResponseBody,
  CreateTokenRequestBody,
  CreateTokenResponseBody,
  CreateATARequestBody,
  CreateATAResponseBody,
} from "./types";

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT) || 3086;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.post(
  "/create-keypair",
  async (
    req: Request,
    res: Response<CreateKeyPairResponseBody | { error: string }>
  ) => {
    try {
      const keypair = await createSolanaKeypair();
      const publicKey = keypair.publicKey.toString();
      const secretKey = JSON.stringify(keypair.secretKey);
      const secretKeyBase58 = encodeKeypairToBase58(keypair);
      res.json({
        keypair: { ...keypair, publicKey, secretKey, secretKeyBase58 },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Failed to create Solana keypair." });
    }
  }
);

app.post(
  "/generate-keypair-and-airdrop",
  async (req: Request, res: Response) => {
    try {
      const { publicKey, airdropTxId } = await generateKeypairAndAirdrop();
      res.json({ publicKey, airdropTxId });
    } catch (error) {
      res.status(500).send("Failed to generate keypair and airdrop SOL.");
    }
  }
);

app.post(
  "/create-and-send-token",
  async (
    req: Request<{}, {}, CreateAndSendTokenRequestBody>,
    res: Response<CreateAndSendTokenResponseBody | { error: string }>
  ) => {
    const { destinationWallet, secretKeyBase58 } = req.body;

    if (!secretKeyBase58 || secretKeyBase58 === "") {
      return res
        .status(400)
        .send({ error: "Secret key (in base58) is required." });
    }

    if (!destinationWallet || destinationWallet === "") {
      return res.status(400).send({ error: "Destination Wallet is required." });
    }

    try {
      const keypair = decodeBase58ToKeypair(secretKeyBase58);
      const destinationWalletPublicKey = new PublicKey(destinationWallet);

      const result = await createAndSendToken(
        destinationWalletPublicKey,
        keypair
      );
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Failed to create token." });
    }
  }
);

app.post(
  "/send-tokens",
  async (
    req: Request<{}, {}, CreateTokenRequestBody>,
    res: Response<CreateTokenResponseBody | { error: string }>
  ) => {
    const { destinationWallet, secretKeyBase58, mint } = req.body;

    if (!secretKeyBase58 || secretKeyBase58 === "") {
      return res
        .status(400)
        .send({ error: "Secret key (in base58) is required." });
    }

    if (!destinationWallet || destinationWallet === "") {
      return res.status(400).send({ error: "Destination Wallet is required." });
    }

    if (!mint || mint === "") {
      return res.status(400).send({ error: "Mint is required." });
    }

    try {
      const keypair = decodeBase58ToKeypair(secretKeyBase58);
      const destinationWalletPublicKey = new PublicKey(destinationWallet);
      const mintPublicKey = new PublicKey(mint);

      const tx = await sendTokens(
        destinationWalletPublicKey,
        keypair,
        mintPublicKey
      );
      res.json({ tx });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Failed to create token." });
    }
  }
);

app.post(
  "/create-ata",
  async (
    req: Request<{}, {}, CreateATARequestBody>,
    res: Response<CreateATAResponseBody | { error: string }>
  ) => {
    const { owner, secretKeyBase58, mint } = req.body;

    if (!secretKeyBase58 || secretKeyBase58 === "") {
      return res
        .status(400)
        .send({ error: "Secret key (in base58) is required." });
    }

    if (!owner || owner === "") {
      return res.status(400).send({ error: "Destination Wallet is required." });
    }

    if (!mint || mint === "") {
      return res.status(400).send({ error: "Mint is required." });
    }

    try {
      const keypair = decodeBase58ToKeypair(secretKeyBase58);
      const ownerPublicKey = new PublicKey(owner);
      const mintPublicKey = new PublicKey(mint);

      const accountInfo = await createATA(
        keypair,
        mintPublicKey,
        ownerPublicKey
      );
      res.json({ accountInfo });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Failed to create token." });
    }
  }
);

app.listen(port, "0.0.0.0", 1, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
