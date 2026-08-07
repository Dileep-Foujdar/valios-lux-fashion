import express from "express";
import { presignUpload, deleteUpload } from "../controllers/uploadController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();
const adminOnly = [isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin")];

router.post(
  "/presign",
  ...adminOnly,
  validateBody(["fileName", "contentType"]),
  presignUpload
);

router.delete("/", ...adminOnly, deleteUpload);

export default router;
