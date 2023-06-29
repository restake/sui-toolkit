import { z } from "zod";

import config from "./config.ts";
import { client } from "./vault.ts";
import { createKVReadResponse } from "./types.ts";

await client.login();

const suiKeys = z.object({
    foo: z.string(),
});

const keys = await client.read(createKVReadResponse(suiKeys), config.WITHDRAWER_KEYS_PATH);
