import { z, ZodType } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { createReadResponse } from "vault";

export function createKVReadResponse<T extends ZodType>(response: T) {
    return createReadResponse(z.object({
        data: response,
    }));
}

export type KVReadResponse<T extends ZodType> = z.infer<ReturnType<typeof createKVReadResponse<T>>>;
