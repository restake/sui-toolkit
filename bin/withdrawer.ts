import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.1/command/mod.ts";
import { Input, prompt, Secret, Select } from "https://deno.land/x/cliffy@v1.0.0-rc.1/prompt/mod.ts";
import { Ed25519Keypair, RawSigner } from "@mysten/sui.js";
import { getKeypair } from "../vault.ts";
import { decodeKeypair } from "../utils.ts";
import { provider, withdrawStakeObjects } from "../sui.ts";

let withdrawerPrompt: {
    provider: "vault" | "plain-text";
    path: string | undefined;
    key: string | undefined;
    keypair: string | undefined;
};

const withdraw = async () => {
    let keypair: Ed25519Keypair;

    if (withdrawerPrompt.provider === "vault") {
        keypair = await getKeypair(withdrawerPrompt.path!, withdrawerPrompt.key!);
    } else {
        keypair = Ed25519Keypair.fromSecretKey(decodeKeypair(withdrawerPrompt.keypair!));
    }

    const signer = new RawSigner(keypair, provider);
    const tx = await withdrawStakeObjects(signer);
    console.log(tx);
};

await new Command()
    .name("sui-withdrawer")
    .description("Easily withdraw Sui validator rewards")
    .version("v0.0.1")
    .action(async () => {
        withdrawerPrompt = await prompt([
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
        ]);
        await withdraw();
    })
    .parse(Deno.args);
