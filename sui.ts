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
import { Stake } from "./types.ts";

export const provider = new JsonRpcProvider(
    new Connection({
        fullnode: config.SUI_RPC_URL,
    }),
);

export const getSelfStakes = async (): Promise<Stake[]> => {
    const stakes = await provider.getStakes({
        owner: config.SUI_VALIDATOR_ADDRESS,
    });

    return stakes.find((stake) => stake.validatorAddress === config.SUI_VALIDATOR_ADDRESS)?.stakes || [];
};

export const withdrawStakeObjects = async (signer: RawSigner): Promise<SuiTransactionBlockResponse[]> => {
    const transactions: SuiTransactionBlockResponse[] = [];
    const selfStake = await getSelfStakes();

    for (const stake of selfStake) {
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
            // We wait 2.5 seconds to allow the network process consecutive transactions.
            await delay(2500);
        } catch (e) {
            throw new Error(`Failed to withdraw stake ${stake.stakedSuiId}: ${e}`);
        }
        transactions.push(tx);
    }

    return transactions;
};

export const mergeSuiObjects = () => {
    //
};

export const sendSuiObjects = () => {
    //
};
