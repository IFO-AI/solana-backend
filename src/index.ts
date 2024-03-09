import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { createSolanaKeypair, generateKeypairAndAirdrop } from "./wallet";
import { decodeBase58ToKeypair, encodeKeypairToBase58 } from "./util";
import { Keypair, clusterApiUrl } from "@solana/web3.js";
import { createToken } from "./mint";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.post("/create-keypair", async (req: Request, res: Response) => {
  try {
    const keypair = await createSolanaKeypair();
    const publicKey = keypair.publicKey.toString();
    const secretKey = JSON.stringify(keypair.secretKey);
    const secretKeyBase58 = encodeKeypairToBase58(keypair);
    res.json({
      keypair: { ...keypair, publicKey, secretKey, secretKeyBase58 },
    });
  } catch (error) {
    res.status(500).send("Failed to create Solana keypair.");
  }
});

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

// POST route to create a new token
app.post("/create-token", async (req: Request, res: Response) => {
  const { secretKeyBase58 } = req.body;

  if (!secretKeyBase58) {
    return res.status(400).send({ error: "Secret key is required." });
  }

  try {
    const keypair = decodeBase58ToKeypair(secretKeyBase58);

    const result = await createToken(keypair);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create token." });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
