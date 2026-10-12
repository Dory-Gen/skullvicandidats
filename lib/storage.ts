import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | undefined;

function getStorageConfig() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  if (!bucket || !region) {
    throw new Error("S3_BUCKET and S3_REGION must be configured for private document storage.");
  }

  return { bucket, region };
}

function getS3Client() {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("Both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.");
  }

  s3Client = new S3Client({
    region: process.env.S3_REGION,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  return s3Client;
}

export async function storeResume(key: string, body: Buffer) {
  const { bucket } = getStorageConfig();
  const result = await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/pdf",
      ServerSideEncryption: "AES256",
    }),
  );
  return result.VersionId ?? null;
}

export async function deleteResume(key: string, versionId: string | null = null) {
  const { bucket } = getStorageConfig();
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(versionId ? { VersionId: versionId } : {}),
    }),
  );
}

export async function createResumeDownloadUrl(key: string, versionId: string | null) {
  const { bucket } = getStorageConfig();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(versionId ? { VersionId: versionId } : {}),
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: 'attachment; filename="candidature.pdf"',
    }),
    { expiresIn: 60 },
  );
}
