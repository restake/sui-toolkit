type Config = {
    VAULT_ADDR: string;
    VAULT_TOKEN: string;
    VAULT_NAMESPACE: string | undefined;
    WITHDRAWER_KEYS_PATH: string;
};

const config: Config = {
    VAULT_ADDR: Deno.env.get("VAULT_ADDR") ?? "",
    VAULT_TOKEN: Deno.env.get("VAULT_TOKEN") ?? "",
    VAULT_NAMESPACE: Deno.env.get("VAULT_NAMESPACE"),
    WITHDRAWER_KEYS_PATH: Deno.env.get("WITHDRAWER_KEYS_PATH") ?? "",
};

export default config;
