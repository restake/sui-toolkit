import {
    CoinStruct,
    Connection,
    JsonRpcProvider,
    RawSigner,
    SUI_SYSTEM_STATE_OBJECT_ID,
    SuiTransactionBlockResponse,
    TransactionBlock,
} from "@mysten/sui.js";
import { delay } from "$std/async/delay.ts";

import config from "./config.ts";
import { Stake } from "./types.ts";
import { SendPrompt } from "./bin/withdrawer.ts";

export const provider = new JsonRpcProvider(
    new Connection({
        fullnode: config.SUI_RPC_URL,
    }),
);

const getSelfStakes = async (): Promise<Stake[]> => {
    const stakes = await provider.getStakes({
        owner: config.SUI_VALIDATOR_ADDRESS,
    });

    return stakes.find((stake) => stake.validatorAddress === config.SUI_VALIDATOR_ADDRESS)?.stakes || [];
};

export const getOwnedSuiCoins = async (): Promise<CoinStruct[]> => {
    let hasNextPage = true;
    let cursor: string | undefined | null = null;

    const coins: CoinStruct[] = [];
    while (hasNextPage) {
        const coinsResponse = await provider.getCoins({
            owner: config.SUI_VALIDATOR_ADDRESS,
            coinType: "0x2::sui::SUI",
            cursor,
        });
        cursor = coinsResponse.nextCursor;
        hasNextPage = coinsResponse.hasNextPage;
        coins.push(...coinsResponse.data);
    }

    return coins;
};

export const withdrawStakeObjects = async (signer: RawSigner): Promise<SuiTransactionBlockResponse[]> => {
    const stakes = await getSelfStakes();
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
        let tx: SuiTransactionBlockResponse;
        try {
            tx = await signer.signAndExecuteTransactionBlock({
                transactionBlock: txb,
            });
            console.log(tx);
            // We wait 3 seconds to allow the network process consecutive transactions.
            await delay(3000);
        } catch (e) {
            throw new Error(`Failed to withdraw staked Sui object ${stake.stakedSuiId}`, {
                cause: e,
            });
        }
        transactions.push(tx);
    }

    return transactions;
};

export const sendSuiObjects = async (signer: RawSigner, { amount, recipient }: SendPrompt): Promise<SuiTransactionBlockResponse> => {
    let tx: SuiTransactionBlockResponse;
    const txb = new TransactionBlock();

    const coin = txb.splitCoins(txb.gas, [txb.pure(amount * 1e9)]);
    txb.transferObjects([coin], txb.pure(recipient));
    try {
        tx = await signer.signAndExecuteTransactionBlock({
            transactionBlock: txb,
        });
    } catch (e) {
        throw new Error(`Failed to send ${amount} SUI to ${recipient}`, {
            cause: e,
        });
    }

    return tx;
};
