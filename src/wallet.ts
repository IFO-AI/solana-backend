import {
  Keypair,
  LAMPORTS_PER_SOL,
  Connection,
  clusterApiUrl,
  PublicKey,
} from "@solana/web3.js";

// Function to create a Solana keypair
export async function createSolanaKeypair(): Promise<Keypair> {
  const keypair = Keypair.generate();
  console.log(
    `Generated new KeyPair. Wallet PublicKey: `,
    keypair.publicKey.toString()
  );

  return keypair;
}

// Function to request an airdrop of SOL to a given public key
export async function airdropSolana(
  connection: Connection,
  publicKey: PublicKey
): Promise<string> {
  const airdropSignature = await connection.requestAirdrop(
    publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  console.log(`Airdrop Transaction Id: ${airdropSignature}`);
  console.log(
    `https://explorer.solana.com/tx/${airdropSignature}?cluster=devnet`
  );

  return airdropSignature;
}

// Function that uses the above two functions to generate a keypair and perform an airdrop
export async function generateKeypairAndAirdrop(): Promise<{
  publicKey: string;
  airdropTxId: string;
}> {
  try {
    const connection = new Connection(clusterApiUrl("devnet"));
    const keypair = await createSolanaKeypair();
    const airdropTxId = await airdropSolana(connection, keypair.publicKey);

    return {
      publicKey: keypair.publicKey.toString(),
      airdropTxId,
    };
  } catch (error) {
    console.error("Error during keypair generation and airdrop:", error);
    throw error;
  }
}

// Example usage (uncomment and use in an async context if needed)
// (async () => {
//   try {
//     const { publicKey, airdropTxId } = await generateKeypairAndAirdrop();
//     console.log(`Keypair generated with public key: ${publicKey}`);
//     console.log(`Airdrop successful with transaction ID: ${airdropTxId}`);
//   } catch (error) {
//     console.error("Failed to generate keypair and airdrop SOL:", error);
//   }
// })();
