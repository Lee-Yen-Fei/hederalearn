import express from "express";
import path from "path";
import multer from "multer";
import { uploadResource, downloadResource, getAvailableResources } from "../controllers/resourceController.js";

// Use memoryStorage to store file in memory before validation
const storage = multer.memoryStorage(); // Store file in memory (buffer) instead of disk

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    console.log("File extension (from client):", fileExtension);

    // Check if the file extension is allowed
    if (!allowedExtensions.includes(fileExtension)) {
      console.error("Invalid file extension:", fileExtension);
      return cb(new Error("Only PDF files are allowed.")); // Reject if invalid extension
    }

    // If the extension is valid, accept the file
    cb(null, true);
  },
});

const router = express.Router();

// Route to upload a resource (file is uploaded here)
router.post("/upload", upload.single("file"), uploadResource);

// Route to download a resource by its ID
router.get("/download/:resourceId", downloadResource);

// Route to get available resources
router.get("/", getAvailableResources);

export default router;
