import { z } from "zod";
import { BlockType } from "@/types/workflow";

// Schemas for each block's config
export const blockSchemas: Record<BlockType, z.ZodTypeAny> = {
  [BlockType.PRICE_MONITOR]: z.object({
    asset: z.string(),
    condition: z.enum(["above", "below"]),
    targetPrice: z.string().refine((v) => !isNaN(Number(v)), { message: "targetPrice must be numeric string" }),
    checkInterval: z.string().refine((v) => !isNaN(Number(v)), { message: "checkInterval must be numeric string" }),
  }),
  [BlockType.SCHEDULE]: z.object({ interval: z.string(), time: z.string().optional() }),
  [BlockType.WEBHOOK]: z.object({ url: z.string().url(), method: z.string(), headers: z.record(z.string(), z.string()).optional(), body: z.string().optional() }),
  [BlockType.EMAIL]: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
  [BlockType.NOTIFICATION]: z.object({ type: z.enum(["info", "error", "success"]), title: z.string(), message: z.string() }),
  [BlockType.DATABASE]: z.object({ operation: z.enum(["select", "insert", "update", "delete"]), table: z.string(), columns: z.array(z.string()).optional(), data: z.any().optional(), where: z.any().optional() }),
  [BlockType.WALLET]: z.object({ blockchain: z.string(), operation: z.enum(["connect", "getAddress"]), privateKey: z.string() }),
  [BlockType.TRANSACTION]: z.object({ blockchain: z.string(), type: z.literal("transfer"), to: z.string(), amount: z.string().refine((v) => !isNaN(Number(v)), { message: "amount must be numeric string" }), privateKey: z.string() }),
  [BlockType.DELAY]: z.object({ duration: z.string().refine((v) => !isNaN(Number(v)), { message: "duration must be numeric string" }), unit: z.enum(["seconds", "minutes"]) }),
  [BlockType.TRANSFORM]: z.object({ transformType: z.literal("javascript"), code: z.string() }),
  [BlockType.CONDITION]: z.object({ condition: z.string() }),
  [BlockType.GOAT_FINANCE]: z.object({ operation: z.literal("balance"), blockchain: z.string(), tokenAddress: z.string(), address: z.string() }),
  [BlockType.CUSTOM]: z.object({ customBlockId: z.string(), inputs: z.record(z.string(), z.any()).optional() }),
  [BlockType.UNKNOWN]: z.any(),
};
