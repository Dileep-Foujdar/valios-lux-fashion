import express from "express";
import {
  presignUpload,
  s3Upload,
  deleteUpload,
  getUploadStatus
} from "../controllers/uploadController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();
const adminOnly = [isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin")];

router.get("/status", ...adminOnly, getUploadStatus);

router.post(
  "/presign",
  ...adminOnly,
  validateBody(["fileName", "contentType"]),
  presignUpload
);

router.post(
  "/s3",
  ...adminOnly,
  validateBody(["dataUrl"]),
  s3Upload
);

router.delete("/", ...adminOnly, deleteUpload);

export default router;
