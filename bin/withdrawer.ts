import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.1/command/mod.ts";
import { Confirm, Input, prompt, Secret, Select } from "https://deno.land/x/cliffy@v1.0.0-rc.1/prompt/mod.ts";
import { Ed25519Keypair, RawSigner } from "@mysten/sui.js";
import { getKeypair } from "../vault.ts";
import { decodeKeypair } from "../utils.ts";
import { provider, sendSuiObjects, withdrawStakeObjects } from "../sui.ts";

type Prompt = {
    provider: "vault" | "plain-text";
    path: string | undefined;
    key: string | undefined;
    keypair: string | undefined;
};

export type SendPrompt = Prompt & {
    amount: number;
    recipient: string;
};

let withdrawPrompt: Prompt;
let sendPrompt: SendPrompt;

const getSigner = async (prompt: Prompt | SendPrompt): Promise<RawSigner> => {
    let keypair: Ed25519Keypair;

    if (prompt.provider === "vault") {
        keypair = await getKeypair(prompt.path!, prompt.key!);
    } else {
        keypair = Ed25519Keypair.fromSecretKey(decodeKeypair(prompt.keypair!));
    }

    return new RawSigner(keypair, provider);
};

const withdraw = async () => {
    const signer = await getSigner(withdrawPrompt);
    const tx = await withdrawStakeObjects(signer);
    console.log(tx);
};

const send = async () => {
    const signer = await getSigner(sendPrompt);
    const tx = await sendSuiObjects(signer, sendPrompt);
    console.log(tx);
};

const getPrompt = <T>(): Promise<T> => {
    return prompt([
        {
            name: "provider",
            type: Select,
            message: "Select validator key provider",
            options: [
                { name: "HashiCorp Vault", value: "vault" },
                { name: "Plain-text base64 encoded keypair", value: "plain-text" },
            ],
        },
        {
            name: "path",
            type: Input,
            message: "Enter Vault path to keypair",
            validate: (value) => value.length > 0 || "Path must not be empty",
            before: async ({ provider }, next) => {
                if (provider === "vault") {
                    await next();
                } else {
                    await next("keypair");
                }
            },
        },
        {
            name: "key",
            type: Input,
            message: "Enter the key name in Vault",
            default: "account_key",
        },
        {
            name: "keypair",
            type: Secret,
            message: "Enter base64 encoded keypair",
            before: async ({ provider }, next) => {
                if (provider === "plain-text") {
                    await next();
                }
            },
        },
        {
            name: "confirmation",
            type: Confirm,
            message: `You're about to withdraw all staked Sui objects. Proceed?`,
            after: async ({ confirmation }, next) => {
                if (confirmation) {
                    await next();
                } else {
                    // Reset the prompt...
                    await next("provider");
                }
            },
        },
    ]) as unknown as Promise<T>;
};

await new Command()
    .name("sui-withdrawer")
    .description("Easily withdraw Sui validator rewards")
    .version("v0.0.1")
    .command("withdraw", "Withdraw all staked Sui objects")
    .action(async () => {
        withdrawPrompt = await getPrompt();
        await withdraw();
    })
    .command("send", "Send Sui to a given address")
    .arguments("<amount:number> <recipient:string>")
    .action(async (_options, amount, recipient) => {
        sendPrompt = await getPrompt();
        sendPrompt.amount = amount;
        sendPrompt.recipient = recipient;
        await send();
    })
    .parse(Deno.args);
