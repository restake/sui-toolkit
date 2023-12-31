import { fromB64, PRIVATE_KEY_SIZE } from "@mysten/sui.js";

export const decodeKeypair = (keypair: string, b64Encoded = false): Uint8Array => {
    keypair = b64Encoded ? atob(keypair) : keypair;
    const decoded = fromB64(keypair || "");
    if (decoded[0] !== 0 || decoded.length !== PRIVATE_KEY_SIZE + 1) {
        throw new Error("Invalid keypair");
    }

    return decoded.slice(1);
};
