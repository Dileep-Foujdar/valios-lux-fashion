import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

const MEDIA_PREFIX = "crinpro/media/ecommerce";

let client = null;
let clientFingerprint = "";

const looksLikePlaceholder = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes("your_") ||
    v.includes("changeme") ||
    v.includes("example") ||
    v.includes("xxxx") ||
    v === "mock" ||
    v.includes("mock") ||
    v === "your_access_key" ||
    v === "your_secret_key"
  );
};

/** Read env at call-time (ESM imports run before dotenv.config) */
const readS3Env = () => {
  const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME;
  const ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const SECRET_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const CDN = (process.env.AWS_S3_CDN_URL || process.env.CDN_URL || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return { REGION, BUCKET, ACCESS_KEY, SECRET_KEY, CDN };
};

export const getS3ConfigStatus = () => {
  const { REGION, BUCKET, ACCESS_KEY, SECRET_KEY, CDN } = readS3Env();
  return {
    region: REGION,
    bucketSet: Boolean(BUCKET) && !looksLikePlaceholder(BUCKET),
    accessKeySet: Boolean(ACCESS_KEY) && !looksLikePlaceholder(ACCESS_KEY),
    secretKeySet: Boolean(SECRET_KEY) && !looksLikePlaceholder(SECRET_KEY),
    cdnSet: Boolean(CDN),
    configured: isS3Configured()
  };
};

export const isS3Configured = () => {
  const { BUCKET, ACCESS_KEY, SECRET_KEY } = readS3Env();
  return Boolean(
    BUCKET &&
      ACCESS_KEY &&
      SECRET_KEY &&
      !looksLikePlaceholder(ACCESS_KEY) &&
      !looksLikePlaceholder(SECRET_KEY) &&
      !looksLikePlaceholder(BUCKET)
  );
};

export const getS3Client = () => {
  if (!isS3Configured()) return null;
  const { REGION, ACCESS_KEY, SECRET_KEY } = readS3Env();
  const fingerprint = `${REGION}:${ACCESS_KEY}`;
  if (!client || clientFingerprint !== fingerprint) {
    client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY
      }
    });
    clientFingerprint = fingerprint;
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
  const { REGION, BUCKET, CDN } = readS3Env();
  if (CDN) return `https://${CDN}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};

export const keyFromPublicUrl = (url = "") => {
  try {
    const { CDN } = readS3Env();
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
  const { BUCKET } = readS3Env();
  if (!s3) {
    const err = new Error("AWS S3 is not configured");
    err.statusCode = 503;
    err.code = "S3_NOT_CONFIGURED";
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

/** Server-side put — reliable on Vercel (no browser→S3 CORS needed) */
export const uploadBufferToS3 = async ({ buffer, fileName, contentType, folder }) => {
  const s3 = getS3Client();
  const { BUCKET } = readS3Env();
  if (!s3) {
    const err = new Error("AWS S3 is not configured");
    err.statusCode = 503;
    err.code = "S3_NOT_CONFIGURED";
    throw err;
  }

  const key = buildObjectKey(fileName, folder);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return {
    key,
    publicUrl: publicUrlForKey(key),
    bucket: BUCKET
  };
};

export const deleteS3Object = async (keyOrUrl) => {
  const s3 = getS3Client();
  const { BUCKET } = readS3Env();
  if (!s3) {
    const err = new Error("AWS S3 is not configured");
    err.statusCode = 503;
    err.code = "S3_NOT_CONFIGURED";
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
