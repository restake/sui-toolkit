import {
    Connection,
    DelegatedStake,
    Ed25519Keypair,
    JsonRpcProvider,
    RawSigner,
    SUI_SYSTEM_STATE_OBJECT_ID,
    TransactionBlock,
} from "@mysten/sui.js";

import config from "./config.ts";
import { getDecodedKeypair } from "./utils.ts";

const provider = new JsonRpcProvider(
    new Connection({
        fullnode: config.SUI_RPC_URL,
    }),
);

// TODO: use keypair that was fetched from Vault.
const keypair = Ed25519Keypair.fromSecretKey(getDecodedKeypair(""));
const signer = new RawSigner(keypair, provider);

export const getSelfStake = async (): Promise<DelegatedStake[]> => {
    const stakes = await provider.getStakes({
        owner: config.SUI_VALIDATOR_ADDRESS,
    });

    // TODO: could actually use .find() here and infer a type for .stakes.
    return stakes.filter((stake) => stake.validatorAddress === config.SUI_VALIDATOR_ADDRESS);
};

export const withdrawStakeObjects = async (): Promise<void> => {
    // TODO: can be improved.
    const selfStake = (await getSelfStake()).find((stake) => stake.validatorAddress === config.SUI_VALIDATOR_ADDRESS)?.stakes || [];

    for (const stake of selfStake) {
        const txb = new TransactionBlock();
        // TODO: investigate if we could bundle multiple Move calls into a single transaction block.
        txb.moveCall({
            target: "0x3::sui_system::request_withdraw_stake",
            arguments: [
                txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
                txb.object(stake.stakedSuiId),
            ],
        });

        try {
            await signer.signAndExecuteTransactionBlock({
                transactionBlock: txb,
            });
        } catch (e) {
            throw new Error(`Failed to withdraw stake ${stake.stakedSuiId}: ${e}`);
        }
    }
};

export const mergeSuiObjects = () => {
    //
};

export const sendSuiObjects = () => {
    //
};
