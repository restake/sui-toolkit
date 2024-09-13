import { PRIVATE_KEY_SIZE } from "@mysten/sui/cryptography";
import { fromB64 } from "@mysten/sui/utils";

export const decodeKeypair = (keypair: string, encoding: string): Uint8Array => {
    
    keypair = (encoding === "doubleBase64") ? atob(keypair) : keypair;

    const decoded = fromB64(keypair || "");
    if (decoded[0] !== 0 || decoded.length !== PRIVATE_KEY_SIZE + 1) {
        throw new Error("Invalid keypair");
    }

    return decoded.slice(1);
};
