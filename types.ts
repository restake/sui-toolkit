import { z } from "zod";
import type { DelegatedStake } from "@mysten/sui/client";

export function createKeySchema(key: string) {
    return z.object({
        [key]: z.string(),
    });
}

export type Stake = DelegatedStake["stakes"][number];

export type ValidatorOperationCapContent = {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
        authorizer_validator_address: string;
        id: {
            id: string;
        };
    };
};
