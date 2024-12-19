import { connectDB, Resource } from "../utils/db.js";
import { generateToken, storeResourceMetadata, validatePurchase, getResourceById, createFile, downloadFile } from "../utils/hedera.js"; // Import authenticateUser from hcs.js
import { sendHCSMessage, authenticateUser } from "../utils/hcs.js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

// Connect to the database
const connectToDatabase = async () => {
  let retries = 5; // Number of retries
  while (retries) {
    try {
      await connectDB(); // Try to connect to DB
      console.log("Connected to database.");
      return;
    } catch (error) {
      console.error("Database connection failed. Retrying...", error);
      retries -= 1;
      if (retries === 0) {
        console.error("Failed to connect to DB after several attempts.");
        process.exit(1); // Exit the process if connection fails
      }
      await new Promise(res => setTimeout(res, 5000)); // Wait for 5 seconds before retrying
    }
  }
};

// Start connection
connectToDatabase();

// Authentication middleware (ensure req.user is populated)
const authenticateUserMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  next();
};

export const uploadResource = async (req, res) => {
  try {
    // 1. Assuming `operatorID` is part of the request (passed in body or from session)
    const operatorID = req.body.operatorID || req.user?.operatorID;  // Make sure operatorID is correctly populated

    // 2. Validate file upload
    if (!req.file || !req.file.buffer) {
      throw new Error("No file uploaded or file is empty.");
    }

    // 3. Upload the file to Hedera File Service
    const fileId = await createFile(req.file.buffer);
    console.log("File uploaded to Hedera with ID:", fileId);

    // 4. Generate token for the file
    const title = req.body.title || "Untitled";
    const tokenId = await generateToken(req.file.buffer, title);
    console.log("Token created with ID:", tokenId);

    // 5. Prepare resource metadata
    const resourceMetadata = {
      title,
      subject: req.body.subject || "Unknown",
      price: req.body.price || 0,
      fileId,
      tokenId,
      uploadedAt: new Date(),
      ownerId: operatorID,  // Store operatorID as the owner (instead of username)
    };

    // 6. Store metadata in MongoDB
    const resourceId = await storeResourceMetadata(resourceMetadata);
    console.log("Resource metadata stored in MongoDB with ID:", resourceId);

    // 7. Send metadata to HCS topic for tracking (optional)
    await sendHCSMessage(process.env.RESOURCE_TOPIC_ID, "resource-upload", req.body);
    console.log("HCS message sent successfully.");

    // 8. Respond with the resource details
    res.json({ fileId, tokenId, resourceId });
  } catch (error) {
    console.error("Error uploading resource:", error);
    res.status(500).json({ error: error.message });
  }
};

export const downloadResource = async (req, res) => {
  const { resourceId } = req.params;
  const userId = req.user?.id;

  try {
    // Validate the user's purchase rights for the resource
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const isAuthorized = await validatePurchase(resourceId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: "You are not authorized to access this resource." });
    }

    // Fetch the resource metadata from the database
    const resource = await getResourceById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    // Get the fileId from the resource metadata
    const fileId = resource.fileId;

    // Retrieve the file contents from Hedera using the fileId
    const fileContents = await downloadFile(fileId);

    // Set headers for the file download response
    res.setHeader("Content-Disposition", `attachment; filename=${resource.title}.pdf`);
    res.setHeader("Content-Type", "application/pdf");

    // Send the file contents as a response to the client
    res.send(fileContents);
  } catch (error) {
    console.error("Error downloading resource:", error);
    res.status(500).json({ error: "An error occurred while downloading the resource." });
  }
};

export const getAllResourceIds = async () => {
  try {
    const allResources = await Resource.find({}, '_id'); // Fetch only the _id field
    return allResources.map(resource => resource._id.toString());
  } catch (error) {
    console.error("Error fetching resource IDs:", error);
    throw error;
  }
};

// Get a list of available resources with pagination
export const getAvailableResources = async (req, res) => {
  try {
    const resources = await Resource.find({});
    res.status(200).json({ data: resources });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Failed to fetch resources." });
  }
};
