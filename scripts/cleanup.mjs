import {
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { prisma } from "./prisma-client.mjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

let failed = false;
let storage;
try {
  const pending = await prisma.storageDeletionQueue.findMany({
    select: { objectKey: true, versionId: true },
    orderBy: { requestedAt: "asc" },
    take: 100,
  });

  if (pending.length) {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    if (!bucket || !region) {
      throw new Error("S3_BUCKET and S3_REGION are required to clean up legacy CVs.");
    }

    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
      throw new Error("Both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.");
    }

    storage = new S3Client({
      region,
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });

    for (const { objectKey: key, versionId } of pending) {
      try {
        await storage.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
            ...(versionId ? { VersionId: versionId } : {}),
          }),
        );
        await prisma.storageDeletionQueue.deleteMany({ where: { objectKey: key } });
        console.info(`Removed private object ${key}.`);
      } catch (error) {
        failed = true;
        console.error(`Failed to remove private object ${key}.`, error);
      }
    }
  }

  await prisma.$transaction([
    prisma.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.requestRateLimit.deleteMany({
      where: {
        windowStartedAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: new Date() } }],
      },
    }),
  ]);
} finally {
  await Promise.all([prisma.$disconnect(), storage?.destroy()]);
}

if (failed) process.exitCode = 1;
