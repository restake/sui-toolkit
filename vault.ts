import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createKVReadResponse, VAULT_AUTH_TYPE, VaultClient, VaultTokenCredentials } from "vault";

import config from "./config.ts";
import { createKeySchema } from "./types.ts";
import { decodeKeypair } from "./utils.ts";

const authentication: VaultTokenCredentials = {
    [VAULT_AUTH_TYPE]: "token",
    mountpoint: "auth/token",
    token: config.VAULT_TOKEN,
};

const client = new VaultClient({
    address: config.VAULT_ADDR,
    namespace: config.VAULT_NAMESPACE,
    authentication,
});

export const getKeypair = async (path: string, key: string, isBase64Encoded: boolean): Promise<Ed25519Keypair> => {
    // We currently use environment variables for authentication.
    try {
        await client.login();
    } catch (e) {
        throw new Error("Failed to login to Vault", {
            cause: e,
        });
    }

    let keyData;
    try {
        keyData = await client.read(
            createKVReadResponse(createKeySchema(key)),
            path,
        );
    } catch (e) {
        throw new Error("Failed to read keypair from Vault", {
            cause: e,
        });
    } finally {
        await client.logout();
    }

    return Ed25519Keypair.fromSecretKey(
        decodeKeypair(keyData.data.data[key], isBase64Encoded),
    );
};
