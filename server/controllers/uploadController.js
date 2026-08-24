import {
  createPresignedUpload,
  deleteS3Object,
  isS3Configured,
  getS3ConfigStatus,
  uploadBufferToS3
} from "../config/s3.js";

const parseDataUrl = (dataUrl) => {
  const matches = String(dataUrl || "").match(/^data:([A-Za-z0-9_+./-]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mime: matches[1],
    buffer: Buffer.from(matches[2], "base64")
  };
};

export const getUploadStatus = async (req, res) => {
  const status = getS3ConfigStatus();
  res.status(200).json({
    success: true,
    s3Configured: status.configured,
    mode: status.configured ? "s3" : "unavailable",
    details: {
      region: status.region,
      bucketSet: status.bucketSet,
      accessKeySet: status.accessKeySet,
      secretKeySet: status.secretKeySet,
      cdnSet: status.cdnSet
    },
    hint: status.configured
      ? null
      : "Add real AWS_S3_ACCESS_KEY_ID + AWS_S3_SECRET_ACCESS_KEY (and bucket) in .env / Vercel Environment Variables."
  });
};

export const presignUpload = async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        code: "S3_NOT_CONFIGURED",
        message:
          "AWS S3 is not configured. Set AWS_S3_BUCKET_NAME, AWS_S3_ACCESS_KEY_ID, AWS_S3_SECRET_ACCESS_KEY in environment variables."
      });
    }

    const { fileName, contentType, folder } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required"
      });
    }

    if (!String(contentType).startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image uploads are allowed"
      });
    }

    const result = await createPresignedUpload({ fileName, contentType, folder });
    res.status(200).json({ success: true, mode: "s3-presign", ...result });
  } catch (error) {
    next(error);
  }
};

/** Browser → API → S3 only (no local disk) */
export const s3Upload = async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        code: "S3_NOT_CONFIGURED",
        message:
          "AWS S3 is not configured. Add real AWS keys in .env (local) and Vercel Environment Variables (production)."
      });
    }

    const { fileName, contentType, dataUrl, folder = "products" } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: "dataUrl (base64 image) is required"
      });
    }

    const mime = contentType || parsed.mime;
    if (!String(mime).startsWith("image/")) {
      return res.status(400).json({ success: false, message: "Only image uploads are allowed" });
    }
    if (parsed.buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be under 8MB" });
    }

    const result = await uploadBufferToS3({
      buffer: parsed.buffer,
      fileName: fileName || "image.jpg",
      contentType: mime,
      folder
    });

    res.status(200).json({
      success: true,
      mode: "s3",
      publicUrl: result.publicUrl,
      key: result.key
    });
  } catch (error) {
    console.error("S3 upload error:", error?.name, error?.message);
    if (error?.code === "S3_NOT_CONFIGURED" || error?.statusCode === 503) {
      return res.status(503).json({
        success: false,
        code: "S3_NOT_CONFIGURED",
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      code: "S3_UPLOAD_FAILED",
      message:
        error?.message ||
        "Failed to upload to AWS S3. Check IAM permissions, bucket name, and region."
    });
  }
};

export const deleteUpload = async (req, res, next) => {
  try {
    const { key, url } = req.body;
    if (!key && !url) {
      return res.status(400).json({ success: false, message: "key or url is required" });
    }

    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        code: "S3_NOT_CONFIGURED",
        message: "AWS S3 is not configured"
      });
    }

    const result = await deleteS3Object(key || url);
    res.status(200).json({ success: true, message: "Image deleted", ...result });
  } catch (error) {
    next(error);
  }
};
