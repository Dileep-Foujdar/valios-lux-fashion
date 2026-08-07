import { createPresignedUpload, deleteS3Object, isS3Configured } from "../config/s3.js";

export const presignUpload = async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: "AWS S3 is not configured. Add AWS_* keys to .env and restart the server."
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
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const deleteUpload = async (req, res, next) => {
  try {
    const { key, url } = req.body;
    if (!key && !url) {
      return res.status(400).json({ success: false, message: "key or url is required" });
    }

    const result = await deleteS3Object(key || url);
    res.status(200).json({ success: true, message: "Image deleted", ...result });
  } catch (error) {
    next(error);
  }
};
