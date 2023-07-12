type Config = {
    VAULT_ADDR: string;
    VAULT_TOKEN: string;
    VAULT_NAMESPACE: string | undefined;

    SUI_RPC_URL: string;
};

const config: Config = {
    VAULT_ADDR: Deno.env.get("VAULT_ADDR") ?? "",
    VAULT_TOKEN: Deno.env.get("VAULT_TOKEN") ?? "",
    VAULT_NAMESPACE: Deno.env.get("VAULT_NAMESPACE"),

    SUI_RPC_URL: Deno.env.get("SUI_RPC_URL") ?? "https://rpc.testnet.sui.io",
};

export default config;
