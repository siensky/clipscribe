import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export function readConfig() {
  return envSchema.parse(process.env);
}
