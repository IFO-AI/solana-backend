import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
} from "@solana/spl-token";
import {
  Metaplex,
  keypairIdentity,
  UploadMetadataInput,
  irysStorage,
} from "@metaplex-foundation/js";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { createSolanaKeypair } from "./wallet";

const DEFAULT_MINT_CONFIG = {
  numDecimals: 9,
  numberTokens: 500_000,
};

// devnet
const IRYS_STORAGE_CONFIG = {
  address: "https://devnet.irys.xyz/",
  providerUrl: clusterApiUrl("devnet"),
  timeout: 60000,
};

// Reference: https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-standard
// this will be uploaded to arweave
const DEFAULT_TOKEN_METADATA: UploadMetadataInput = {
  name: "IFO Product",
  symbol: "ifoP",
  description: "This is a token for a product registered on the IFO platform.",
};

// this will be stored on chain
const ON_CHAIN_DEFAULT_METADATA = {
  name: DEFAULT_TOKEN_METADATA.name,
  symbol: DEFAULT_TOKEN_METADATA.symbol,
  uri: "NEED_TO_ADD",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
} as DataV2;

// Function to initialize Metaplex with a given secret key
export function initializeMetaplex(
  connection: Connection,
  secretKey: Uint8Array
): Metaplex {
  const wallet = Keypair.fromSecretKey(secretKey);
  return Metaplex.make(connection)
    .use(keypairIdentity(wallet))
    .use(irysStorage(IRYS_STORAGE_CONFIG));
}

export async function uploadMetadata(
  metaplex: Metaplex,
  metadata: UploadMetadataInput
): Promise<string> {
  const { uri } = await metaplex.nfts().uploadMetadata(metadata);
  console.log(`Metadata uploaded to: ${uri}`);
  return uri;
}

export async function createMintTransaction(
  connection: Connection,
  metaplex: Metaplex,
  payer: Keypair,
  destinationWallet: PublicKey,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey,
  noOfTokens: number = DEFAULT_MINT_CONFIG.numberTokens,
  decimals: number = DEFAULT_MINT_CONFIG.numDecimals,
  onChainMetadata: DataV2 = ON_CHAIN_DEFAULT_METADATA
): Promise<{ transaction: VersionedTransaction; mint: PublicKey }> {
  const mint = Keypair.generate();

  // Get the minimum lamport balance to create a new account and avoid rent payments
  const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);

  // metadata account associated with mint
  const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mint.publicKey });

  // get associated token account of your wallet
  const tokenATA = await getAssociatedTokenAddress(
    mint.publicKey,
    destinationWallet
  );

  const txInstructions: TransactionInstruction[] = [];

  txInstructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: requiredBalance,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey, //Mint Address
      decimals, //Number of Decimals of New mint
      mintAuthority, //Mint Authority
      freezeAuthority, //Freeze Authority
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      payer.publicKey, //Payer
      tokenATA, //Associated token account
      payer.publicKey, //token owner
      mint.publicKey //Mint
    ),
    createMintToInstruction(
      mint.publicKey, //Mint
      tokenATA, //Destination Token Account
      mintAuthority, //Authority
      noOfTokens * Math.pow(10, decimals) //number of tokens
    ),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint.publicKey,
        mintAuthority: mintAuthority,
        payer: payer.publicKey,
        updateAuthority: mintAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data: onChainMetadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );
  const latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: txInstructions,
  }).compileToV0Message();
  console.log("   ✅ - Compiled Transaction Message");
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer, mint]);
  return { transaction, mint: mint.publicKey };
}

export async function createToken(
  keypair?: Keypair,
  url: string = clusterApiUrl("devnet"),
  metadata: UploadMetadataInput = DEFAULT_TOKEN_METADATA,
  mintConfig = DEFAULT_MINT_CONFIG
) {
  const solanaConnection = new Connection(url);

  if (!keypair) {
    keypair = await createSolanaKeypair();
  }

  const metaplex = initializeMetaplex(solanaConnection, keypair.secretKey);

  let metadataUri = await uploadMetadata(metaplex, metadata);

  const { transaction, mint } = await createMintTransaction(
    solanaConnection,
    metaplex,
    keypair,
    keypair.publicKey,
    keypair.publicKey,
    keypair.publicKey,
    mintConfig.numberTokens,
    mintConfig.numDecimals,
    {
      ...ON_CHAIN_DEFAULT_METADATA,
      uri: metadataUri,
    }
  );

  let { lastValidBlockHeight, blockhash } =
    await solanaConnection.getLatestBlockhash("finalized");
  const transactionId = await solanaConnection.sendTransaction(transaction);
  await solanaConnection.confirmTransaction({
    signature: transactionId,
    lastValidBlockHeight,
    blockhash,
  });

  console.log(`Transaction ID: `, transactionId);
  console.log(
    `View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`
  );

  return { transactionId, mint: mint.toString() };
}
