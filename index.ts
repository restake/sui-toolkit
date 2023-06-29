import { z } from "zod";

import config from "./config.ts";
import { client } from "./vault.ts";
import { createKVReadResponse } from "./types.ts";
import { withdrawStakeObjects } from "./sui.ts";

await client.login();

const suiKeys = z.object({
    foo: z.string(),
});

const keys = await client.read(createKVReadResponse(suiKeys), config.SUI_WITHDRAWER_KEYS_PATH);
