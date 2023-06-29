import { VAULT_AUTH_TYPE, VaultClient, VaultTokenCredentials } from "vault";

import config from "./config.ts";

const authentication: VaultTokenCredentials = {
    [VAULT_AUTH_TYPE]: "token",
    mountpoint: "auth/token",
    token: config.VAULT_TOKEN,
};

export const client = new VaultClient({
    address: config.VAULT_ADDR,
    namespace: config.VAULT_NAMESPACE,
    authentication,
});
