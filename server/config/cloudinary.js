import fs from "fs";
import path from "path";

// A robust helper that uploads base64 images or files
// If Cloudinary keys are present, we upload to Cloudinary using their REST API
// If not, we fall back to saving locally under public/uploads
export const uploadImage = async (fileData, folder = "products") => {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    // Check if Cloudinary is configured (not mock)
    if (
      CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_CLOUD_NAME !== "mock_cloud_name" &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_KEY !== "mock_api_key"
    ) {
      // Cloudinary REST API upload using fetch (no SDK dependency needed)
      // Signature generation
      const timestamp = Math.round(new Date().getTime() / 1000);
      
      // Since generating HMAC-SHA1 signature in pure Node without external packages is simple:
      const crypto = await import("crypto");
      const signatureStr = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

      const formData = new URLSearchParams();
      formData.append("file", fileData); // base64 or url
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      if (result.secure_url) {
        return result.secure_url;
      }
      console.warn("Cloudinary upload failed, falling back to local storage:", result.error);
    }

    // Local file storage fallback
    // If fileData is base64, parse and write it
    if (typeof fileData === "string" && fileData.startsWith("data:image")) {
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 string");
      }
      
      const buffer = Buffer.from(matches[2], "base64");
      const ext = matches[1].split("/")[1] || "jpg";
      const filename = `${folder}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      return `/uploads/${filename}`;
    }

    // If it's already an HTTP URL, just return it
    if (typeof fileData === "string" && fileData.startsWith("http")) {
      return fileData;
    }

    throw new Error("Unsupported image format");
  } catch (error) {
    console.error("Upload error details:", error);
    // Return a beautiful placehold.co fashion image fallback if upload fails completely
    return `https://placehold.co/600x800/e2e8f0/0f172a?text=Fashion+Product`;
  }
};
