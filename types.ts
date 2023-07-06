import { z } from "zod";
import { DelegatedStake } from "@mysten/sui.js";

export function createKeySchema(key: string) {
    return z.object({
        [key]: z.string(),
    });
}

export type Stake = DelegatedStake["stakes"][number];
