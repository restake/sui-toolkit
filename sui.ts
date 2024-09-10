import { delay } from "@std/async/delay"

import { SUI_SYSTEM_STATE_OBJECT_ID } from "@mysten/sui/utils"
import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui";

import config from "./config.ts";
import { Stake, ValidatorOperationCapContent } from "./types.ts";
import { CommissionPrompt, RgpPrompt, SendPrompt } from "./bin/toolkit.ts";

export const client = new SuiClient({url: config.SUI_RPC_URL})

const getSelfStakes = async (address: string): Promise<Stake[]> => {
    const stakes = await client.getStakes({
        owner: address,
    });

    return stakes.find((stake) => stake.validatorAddress === address)?.stakes || [];
};

const getValidatorOperationCapabilityId = async (address: string, validator: string | undefined): Promise<string | undefined> => {
    const { data } = await client.getOwnedObjects({
        owner: address,
        filter: {
            StructType: "0x3::validator_cap::UnverifiedValidatorOperationCap",
        },
        options: {
            showContent: true,
        },
    });

    const validatorOperationCap = data.find((object) => {
        return (object.data?.content as ValidatorOperationCapContent).fields.authorizer_validator_address ===
            (validator ? validator : address);
    });

    return validatorOperationCap?.data?.objectId;
};

export const withdrawStakeObjects = async (signer: Ed25519Keypair): Promise<SuiTransactionBlockResponse[]> => {
    const address = await signer.getAddress();
    const stakes = await getSelfStakes(address);
    const transactions: SuiTransactionBlockResponse[] = [];

    for (const stake of stakes) {
        const txb = new Transaction();
        txb.moveCall({
            target: "0x3::sui_system::request_withdraw_stake",
            arguments: [
                txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
                txb.object(stake.stakedSuiId),
            ],
        });

        try {
            const tx = await signer.signAndExecuteTransactionBlock({
                transactionBlock: txb,
            });
            console.log(tx);
            transactions.push(tx);
            // We wait 3 seconds to allow the network process consecutive transactions.
            await delay(3000);
        } catch (e) {
            throw new Error(`Failed to withdraw staked Sui object ${stake.stakedSuiId}`, {
                cause: e,
            });
        }
    }

    return transactions;
};

export const sendSuiObjects = async (signer: Ed25519Keypair, { amount, recipient }: SendPrompt): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();
    const coin = txb.splitCoins(txb.gas, [amount * 1e9]);
    txb.transferObjects([coin], recipient);

    try {
        return await signer.signAndExecuteTransactionBlock({
            transactionBlock: txb,
        });
    } catch (e) {
        throw new Error(`Failed to send ${amount} SUI to ${recipient}`, {
            cause: e,
        });
    }
};

export const updateReferenceGasPrice = async (signer: Ed25519Keypair, { price, validator }: RgpPrompt): Promise<SuiTransactionBlockResponse> => {
    const address = await signer.getAddress();
    const capabilityId = await getValidatorOperationCapabilityId(address, validator);

    if (!capabilityId) {
        throw new Error(`No validator operation capability found for address ${address}`);
    }

    const txb = new Transaction();
    txb.moveCall({
        target: "0x3::sui_system::request_set_gas_price",
        arguments: [
            txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
            txb.object(capabilityId),
            txb.pure.u64(price),
        ],
    });

    try {
        return await signer.signAndExecuteTransactionBlock({
            transactionBlock: txb,
        });
    } catch (e) {
        throw new Error(`Failed to update reference gas price`, {
            cause: e,
        });
    }
};

export const updateCommissionRate = async (
    signer: Ed25519Keypair,
    { rate, validator }: CommissionPrompt,
): Promise<SuiTransactionBlockResponse> => {
    const address = await signer.getAddress();
    const capabilityId = await getValidatorOperationCapabilityId(address, validator);

    if (!capabilityId) {
        throw new Error(`No validator operation capability found for address ${address}`);
    }

    const txb = new Transaction();
    txb.moveCall({
        target: "0x3::sui_system::request_set_commission_rate",
        arguments: [
            txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
            txb.pure.u64(rate),
        ],
    });
    txb.setGasBudget(2000000);

    try {
        return await signer.signAndExecuteTransactionBlock({
            transactionBlock: txb,
        });
    } catch (e) {
        throw new Error(`Failed to update commission rate`, {
            cause: e,
        });
    }
};
