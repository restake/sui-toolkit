import { z } from "zod";
import { Ed25519Keypair, RawSigner } from "@mysten/sui.js";

import config from "./config.ts";
import { client } from "./vault.ts";
import { createKVReadResponse } from "./types.ts";
import { decodeKeypair } from "./utils.ts";
import { provider } from "./sui.ts";

await client.login();

const suiKeyData = z.object({
    account_key: z.string()
});

const keyData = await client.read(createKVReadResponse(suiKeyData), config.SUI_WITHDRAWER_KEYS_PATH);

// Set up the keypair and signer.
const keypair = Ed25519Keypair.fromSecretKey(decodeKeypair(keyData.data.data.account_key, true));
const signer = new RawSigner(keypair, provider);
