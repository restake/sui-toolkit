import { z, ZodType } from "zod";
import { createReadResponse } from "vault";

export function createKVReadResponse<T extends ZodType>(response: T) {
    return createReadResponse(z.object({
        data: response,
    }));
}

export type KVReadResponse<T extends ZodType> = z.infer<ReturnType<typeof createKVReadResponse<T>>>;
