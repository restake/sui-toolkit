import { fromB64, PRIVATE_KEY_SIZE } from "@mysten/sui.js";

export const getDecodedKeypair = (keypair: string) => {
    const decoded = fromB64(keypair || "");
    if (decoded[0] !== 0 || decoded.length !== PRIVATE_KEY_SIZE + 1) {
        throw new Error("Invalid keypair");
    }

    return decoded.slice(1);
};
