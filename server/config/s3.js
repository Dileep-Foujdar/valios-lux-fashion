import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
const CDN = (process.env.AWS_S3_CDN_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

const MEDIA_PREFIX = "crinpro/media/ecommerce";

let client = null;

export const isS3Configured = () =>
  Boolean(BUCKET && ACCESS_KEY && SECRET_KEY && !String(ACCESS_KEY).includes("mock"));

export const getS3Client = () => {
  if (!isS3Configured()) return null;
  if (!client) {
    client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY
      }
    });
  }
  return client;
};

const safeFileName = (name = "image") => {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "-");
  return base.slice(0, 80) || "image.jpg";
};

export const buildObjectKey = (fileName, folder = "") => {
  const cleanFolder = String(folder || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "");
  const prefix = cleanFolder ? `${MEDIA_PREFIX}/${cleanFolder}` : MEDIA_PREFIX;
  const unique = `${Date.now()}-${crypto.randomUUID()}-${safeFileName(fileName)}`;
  return `${prefix}/${unique}`;
};

export const publicUrlForKey = (key) => {
  if (CDN) return `https://${CDN}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};

export const keyFromPublicUrl = (url = "") => {
  try {
    const u = new URL(url);
    let key = u.pathname.replace(/^\//, "");
    if (CDN && u.hostname.includes(CDN.replace(/^www\./, ""))) {
      return key;
    }
    if (u.hostname.includes(".amazonaws.com")) {
      return key;
    }
    if (key.startsWith(MEDIA_PREFIX)) return key;
    return "";
  } catch {
    return "";
  }
};

export const createPresignedUpload = async ({ fileName, contentType, folder }) => {
  const s3 = getS3Client();
  if (!s3) {
    const err = new Error("AWS S3 is not configured");
    err.statusCode = 503;
    throw err;
  }

  const key = buildObjectKey(fileName, folder);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream"
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  return {
    key,
    uploadUrl,
    publicUrl: publicUrlForKey(key),
    bucket: BUCKET,
    expiresIn: 300
  };
};

export const deleteS3Object = async (keyOrUrl) => {
  const s3 = getS3Client();
  if (!s3) {
    const err = new Error("AWS S3 is not configured");
    err.statusCode = 503;
    throw err;
  }

  const key = keyOrUrl.includes("://") ? keyFromPublicUrl(keyOrUrl) : keyOrUrl;
  if (!key || !key.startsWith(MEDIA_PREFIX)) {
    const err = new Error("Invalid S3 object key");
    err.statusCode = 400;
    throw err;
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    })
  );

  return { key };
};
