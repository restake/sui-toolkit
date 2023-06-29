type Config = {
    VAULT_ADDR: string;
    VAULT_TOKEN: string;
    VAULT_NAMESPACE: string | undefined;

    SUI_RPC_URL: string;
    SUI_WITHDRAWER_KEYS_PATH: string;
    SUI_VALIDATOR_ADDRESS: string;
};

const config: Config = {
    VAULT_ADDR: Deno.env.get("VAULT_ADDR") ?? "",
    VAULT_TOKEN: Deno.env.get("VAULT_TOKEN") ?? "",
    VAULT_NAMESPACE: Deno.env.get("VAULT_NAMESPACE"),

    SUI_RPC_URL: Deno.env.get("SUI_RPC_URL") ?? "https://rpc.mainnet.sui.io",
    SUI_WITHDRAWER_KEYS_PATH: Deno.env.get("SUI_WITHDRAWER_KEYS_PATH") ?? "",
    SUI_VALIDATOR_ADDRESS: Deno.env.get("SUI_VALIDATOR_ADDRESS") ?? "",
};

export default config;
