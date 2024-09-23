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

const VaultSchema = z.object({
    provider: z.literal("vault"),
    path: z.string(),
    key: z.string(),
    encoding: z.enum(["base64", "doubelBase64"]),
});

const LocalSchema = z.object({
    provider: z.literal("local"),
    value: z.string(),
    encoding: z.enum(["base64", "doubelBase64"]),
});

export const ConfigSchema = z.discriminatedUnion("provider", [VaultSchema, LocalSchema]);

export type ConfigSchema = z.output<typeof ConfigSchema>;
