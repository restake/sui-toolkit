import { Command } from "cliffy/command/mod.ts";
import { Confirm, Input, prompt, Secret, Select } from "cliffy/prompt/mod.ts";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { parse as parseYaml } from "@std/yaml";
import { ZodError } from "zod";

import { getKeypair } from "../vault.ts";
import { decodeKeypair } from "../utils.ts";
import { sendSuiObjects, updateCommissionRate, updateReferenceGasPrice, withdrawStakeObjects } from "../sui.ts";
import { ConfigSchema } from "../types.ts";

type Prompt = {
    provider: "vault" | "local";
    path: string | undefined;
    key: string | undefined;
    value: string | undefined;
    encoding: string;
};

type VaultPrompt = Prompt & {
    provider: "vault";
    path: string;
    key: string;
};

type PlaintextPrompt = Prompt & {
    provider: "local";
    keypair: string;
};

export type SendPrompt = Prompt & {
    amount: number;
    recipient: string;
};

export type RgpPrompt = Prompt & {
    price: number;
    validator: string | undefined;
};

export type CommissionPrompt = Prompt & {
    rate: number;
    validator: string | undefined;
};

function isVaultPrompt(p: Prompt): p is VaultPrompt {
    return p.provider === "vault";
}

function isPlaintextPrompt(p: Prompt): p is PlaintextPrompt {
    return p.provider === "local";
}

const getSigner = async (prompt: Prompt): Promise<Ed25519Keypair> => {
    let keypair: Ed25519Keypair;

    if (isVaultPrompt(prompt)) {
        keypair = await getKeypair(prompt.path!, prompt.key!, prompt.encoding);
    } else if (isPlaintextPrompt(prompt)) {
        keypair = Ed25519Keypair.fromSecretKey(decodeKeypair(prompt.value!, prompt.encoding));
    } else {
        throw new Error(`Unsupported provider: ${prompt.provider}`);
    }

    return keypair;
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

const updateRgp = async (prompt: RgpPrompt) => {
    const signer = await getSigner(prompt);
    const tx = await updateReferenceGasPrice(signer, prompt);
    console.log(tx);
};

const updateCommission = async (prompt: CommissionPrompt) => {
    const signer = await getSigner(prompt);
    const tx = await updateCommissionRate(signer, prompt);
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
                { name: "Plain-text base64 encoded keypair", value: "local" },
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
                if (provider === "local") {
                    await next();
                }
            },
        },
    ]) as unknown as Promise<T>;
};

await new Command()
    .name("sui-toolkit")
    .description("Easily interact with the Sui blockchain")
    .version("v0.0.3")
    .action(function () {
        this.showHelp();
    })
    .globalOption("-b, --base64", "Used to indicate whether the keypair is double base64 encoded - base64(base64Keypair)", {
        default: false,
    })
    .globalOption("-c, --config <path:string>", "Used to specify the key path and encoding in a config file - vault or local", {
        default: false,
    })
    .command("withdraw", "Withdraw all staked Sui objects")
    .action(async (options) => {
        let withdrawPrompt: Prompt = {
            provider: "vault",
            path: undefined,
            key: undefined,
            value: undefined,
            encoding: "base64",
        };

        if (typeof options.config === "string") {
            try {
                const config = await Deno.readTextFile(options.config).then((raw) => ConfigSchema.parse(parseYaml(raw)));
                Object.assign(withdrawPrompt, config);
            } catch (err) {
                if (err instanceof ZodError) {
                    throw new Error(`Validation error: ${err.message}`);
                }
                console.error(`Error loading config file: ${err.message}`);
                return;
            }
        } else {
            withdrawPrompt = await getPrompt<Prompt>();
            withdrawPrompt.encoding = options.base64 ? "doubleBase64" : "base64";
        }
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
    .action(async (options, amount, recipient) => {
        const sendPrompt = await getPrompt<SendPrompt>();
        sendPrompt.amount = amount;
        sendPrompt.recipient = recipient;
        sendPrompt.encoding = options.base64 ? "doubleBase64" : "base64";
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
    .command("update-gas-price", "Update the reference gas price (if the account is a validator)")
    .option(
        "--validator [address:string]",
        "Update the reference gas price for a a specific validator (if the used account holds the operator capability)",
    )
    .arguments("<price:number>")
    .action(async (options, price) => {
        const rgpPrompt = await getPrompt<RgpPrompt>();
        rgpPrompt.price = price;
        rgpPrompt.encoding = options.base64 ? "doubleBase64" : "base64";
        // Avoid passing undefined as a string to the prompt...
        if (options.validator) {
            rgpPrompt.validator = String(options.validator);
        }
        await updateRgp(rgpPrompt);
    })
    .command("update-commission-rate", "Update the commission rate (if the account is a validator)")
    .option(
        "--validator [address:string]",
        "Update the commission rate for a a specific validator (if the used account holds the operator capability)",
    )
    .arguments("<rate:number>")
    .action(async (options, rate) => {
        const commissionPrompt = await getPrompt<CommissionPrompt>();
        commissionPrompt.rate = rate;
        commissionPrompt.encoding = options.base64 ? "doubleBase64" : "base64";
        // Avoid passing undefined as a string to the prompt...
        if (options.validator) {
            commissionPrompt.validator = String(options.validator);
        }
        await updateCommission(commissionPrompt);
    })
    .parse(Deno.args);
