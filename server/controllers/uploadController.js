import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createPresignedUpload, deleteS3Object, isS3Configured } from "../config/s3.js";

export const getUploadStatus = async (req, res) => {
  res.status(200).json({
    success: true,
    s3Configured: isS3Configured(),
    mode: isS3Configured() ? "s3" : "local"
  });
};

export const presignUpload = async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        code: "S3_NOT_CONFIGURED",
        message:
          "AWS S3 is not configured. Set real AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY in .env (not placeholders), or use local upload."
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

/** Dev / fallback: save image to public/uploads when S3 is unavailable */
export const localUpload = async (req, res, next) => {
  try {
    const { fileName, contentType, dataUrl, folder = "products" } = req.body || {};

    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
      return res.status(400).json({
        success: false,
        message: "dataUrl (base64 image) is required"
      });
    }

    if (contentType && !String(contentType).startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image uploads are allowed"
      });
    }

    const matches = dataUrl.match(/^data:([A-Za-z0-9_+./-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid image dataUrl" });
    }

    const mime = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be under 8MB" });
    }

    const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const safe = String(fileName || "image")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 60);
    const filename = `${String(folder).replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safe}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    const publicUrl = `/uploads/${filename}`;
    res.status(200).json({
      success: true,
      publicUrl,
      mode: "local",
      message: isS3Configured()
        ? "Saved locally"
        : "Saved locally (S3 not configured). For production, add real AWS keys."
    });
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

    // Local file delete
    const target = key || url;
    if (typeof target === "string" && target.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", target.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(200).json({ success: true, message: "Local image deleted" });
    }

    if (!isS3Configured()) {
      return res.status(200).json({ success: true, message: "Skipped remote delete (S3 not configured)" });
    }

    const result = await deleteS3Object(key || url);
    res.status(200).json({ success: true, message: "Image deleted", ...result });
  } catch (error) {
    next(error);
  }
};
