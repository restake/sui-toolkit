import {
    Connection,
    JsonRpcProvider,
    RawSigner,
    SUI_SYSTEM_STATE_OBJECT_ID,
    SuiTransactionBlockResponse,
    TransactionBlock,
} from "@mysten/sui.js";
import { delay } from "$std/async/delay.ts";

import config from "./config.ts";
import { Stake, ValidatorOperationCapContent } from "./types.ts";
import { CommissionPrompt, RgpPrompt, SendPrompt } from "./bin/toolkit.ts";

export const provider = new JsonRpcProvider(
    new Connection({
        fullnode: config.SUI_RPC_URL,
    }),
);

const getSelfStakes = async (address: string): Promise<Stake[]> => {
    const stakes = await provider.getStakes({
        owner: address,
    });

    return stakes.find((stake) => stake.validatorAddress === address)?.stakes || [];
};

const getValidatorOperationCapabilityId = async (address: string): Promise<string | undefined> => {
    const { data } = await provider.getOwnedObjects({
        owner: address,
        filter: {
            StructType: "0x3::validator_cap::UnverifiedValidatorOperationCap",
        },
        options: {
            showContent: true,
        },
    });

    const validatorOperationCap = data.find((object) => {
        return (object.data?.content as ValidatorOperationCapContent).fields.authorizer_validator_address === address;
    });

    return validatorOperationCap?.data?.objectId;
};

export const withdrawStakeObjects = async (signer: RawSigner): Promise<SuiTransactionBlockResponse[]> => {
    const address = await signer.getAddress();
    const stakes = await getSelfStakes(address);
    const transactions: SuiTransactionBlockResponse[] = [];

    for (const stake of stakes) {
        const txb = new TransactionBlock();
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

export const sendSuiObjects = async (signer: RawSigner, { amount, recipient }: SendPrompt): Promise<SuiTransactionBlockResponse> => {
    const txb = new TransactionBlock();
    const coin = txb.splitCoins(txb.gas, [txb.pure(amount * 1e9)]);
    txb.transferObjects([coin], txb.pure(recipient));

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

export const updateReferenceGasPrice = async (signer: RawSigner, { price }: RgpPrompt): Promise<SuiTransactionBlockResponse> => {
    const address = await signer.getAddress();
    const capabilityId = await getValidatorOperationCapabilityId(address);

    if (!capabilityId) {
        throw new Error(`No validator operation capability found for address ${address}`);
    }

    const txb = new TransactionBlock();
    txb.moveCall({
        target: "0x3::sui_system::request_set_gas_price",
        arguments: [
            txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
            txb.object(capabilityId),
            txb.pure(price),
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

export const updateCommissionRate = async (signer: RawSigner, { rate }: CommissionPrompt): Promise<SuiTransactionBlockResponse> => {
    const address = await signer.getAddress();
    const capabilityId = await getValidatorOperationCapabilityId(address);

    if (!capabilityId) {
        throw new Error(`No validator operation capability found for address ${address}`);
    }

    const txb = new TransactionBlock();
    txb.moveCall({
        target: "0x3::sui_system::request_set_commission_rate",
        arguments: [
            txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
            txb.pure(rate),
        ],
    });

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
