import { Command } from "cliffy/command/mod.ts";
import { Confirm, Input, prompt, Secret, Select } from "cliffy/prompt/mod.ts";
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

type VaultPrompt = Prompt & {
    provider: "vault";
    path: string;
    key: string;
};

type PlaintextPrompt = Prompt & {
    provider: "plain-text";
    keypair: string;
};

export type SendPrompt = Prompt & {
    amount: number;
    recipient: string;
};

function isVaultPrompt(p: Prompt): p is VaultPrompt {
    return p.provider === "vault";
}

function isPlaintextPrompt(p: Prompt): p is PlaintextPrompt {
    return p.provider === "plain-text";
}

const getSigner = async (prompt: Prompt): Promise<RawSigner> => {
    let keypair: Ed25519Keypair;

    if (isVaultPrompt(prompt)) {
        keypair = await getKeypair(prompt.path!, prompt.key!);
    } else if (isPlaintextPrompt(prompt)) {
        keypair = Ed25519Keypair.fromSecretKey(decodeKeypair(prompt.keypair!));
    } else {
        throw new Error(`Unsupported provider: ${prompt.provider}`);
    }

    return new RawSigner(keypair, provider);
};

const withdraw = async (prompt: Prompt) => {
    const signer = await getSigner(prompt);
    const tx = await withdrawStakeObjects(signer);
    console.log(tx);
};

const send = async (prompt: SendPrompt) => {
    const signer = await getSigner(prompt);
    const tx = await sendSuiObjects(signer, prompt);
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
    ]) as unknown as Promise<T>;
};

await new Command()
    .name("sui-withdrawer")
    .description("Easily withdraw Sui validator rewards")
    .version("v0.0.1")
    .action(function () {
        this.showHelp();
    })
    .command("withdraw", "Withdraw all staked Sui objects")
    .action(async () => {
        const withdrawPrompt = await getPrompt<Prompt>();
        const { confirmation } = await prompt([
            {
                name: "confirmation",
                type: Confirm,
                message: "You're about to withdraw all staked Sui objects. Proceed?",
            },
        ]);
        if (confirmation) {
            await withdraw(withdrawPrompt);
        }
    })
    .command("send", "Send Sui to a given address")
    .arguments("<amount:number> <recipient:string>")
    .action(async (_options, amount, recipient) => {
        const sendPrompt = await getPrompt<SendPrompt>();
        sendPrompt.amount = amount;
        sendPrompt.recipient = recipient;
        const { confirmation } = await prompt([
            {
                name: "confirmation",
                type: Confirm,
                message: `You're about to send ${amount} SUI to address ${recipient}. Proceed?`,
            },
        ]);
        if (confirmation) {
            await send(sendPrompt);
        }
    })
    .parse(Deno.args);
