import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

function requestAddress(request: Request) {
  const address =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256").update(address).digest("hex");
}

export async function consumeRateLimit(
  request: Request,
  scope: string,
  maxAttempts: number,
  windowSeconds: number,
  blockSeconds: number,
) {
  const bucketKey = `${scope}:${requestAddress(request)}`;
  const result = await prisma.$queryRaw<{ limited: boolean | null }[]>`
    INSERT INTO request_rate_limits
      (bucket_key, attempts, window_started_at, blocked_until)
    VALUES (
      ${bucketKey}, 1, now(),
      CASE WHEN ${maxAttempts} <= 1 THEN now() + (${blockSeconds} * interval '1 second') END
    )
    ON CONFLICT (bucket_key) DO UPDATE
      SET attempts = CASE
            WHEN request_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
              THEN 1
            ELSE request_rate_limits.attempts + 1
          END,
          window_started_at = CASE
            WHEN request_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
              THEN now()
            ELSE request_rate_limits.window_started_at
          END,
          blocked_until = CASE
            WHEN request_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
              THEN CASE WHEN ${maxAttempts} <= 1 THEN now() + (${blockSeconds} * interval '1 second') END
            WHEN request_rate_limits.blocked_until > now()
              THEN request_rate_limits.blocked_until
            WHEN request_rate_limits.attempts + 1 >= ${maxAttempts}
              THEN now() + (${blockSeconds} * interval '1 second')
            ELSE NULL
          END
    RETURNING blocked_until > now() AS limited
  `;
  const row = result[0];
  if (!row) throw new Error("The rate-limit query did not return its upserted bucket.");
  return row.limited === true;
}

export async function clearRateLimit(request: Request, scope: string) {
  const bucketKey = `${scope}:${requestAddress(request)}`;
  await prisma.requestRateLimit.deleteMany({ where: { bucketKey } });
}
