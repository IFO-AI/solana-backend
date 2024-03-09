import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Function to decode a Base58 string into a Solana Keypair
export function decodeBase58ToKeypair(base58String: string): Keypair {
  const secretKey = bs58.decode(base58String);
  const keypair = Keypair.fromSecretKey(secretKey);
  return keypair;
}

// Function to encode a Solana Keypair's secret key into a Base58 string
export function encodeKeypairToBase58(keypair: Keypair): string {
  const base58String = bs58.encode(keypair.secretKey);
  return base58String;
}
