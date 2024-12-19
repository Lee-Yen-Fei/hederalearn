import { Client, PrivateKey, AccountId, AccountBalanceQuery, FileCreateTransaction, Hbar, TokenCreateTransaction, TokenMintTransaction, FileContentsQuery, FileAppendTransaction } from "@hashgraph/sdk";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();

const client = Client.forTestnet(); // Change to Client.forMainnet() for production
client.setOperator(
  AccountId.fromString(process.env.OPERATOR_ID),
  PrivateKey.fromString(process.env.OPERATOR_KEY)
);

const dbClient = new MongoClient(process.env.MONGO_URI);
let db;

const connectDB = async () => {
  try {
    if (!dbClient.topology || !dbClient.topology.isConnected()) {
      await dbClient.connect();
    }
    db = dbClient.db("test"); // Replace with your actual DB name
    console.log("Database connected:", db.databaseName); // Log the database name
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

// Function to store resource metadata in MongoDB
export const storeResourceMetadata = async (resource) => {
  try {
    // Ensure the database connection is established once
    if (!db) {
      await connectDB();
    }

    // Validate resource metadata with correct field names
    if (!resource || typeof resource !== "object" || !resource.title || !resource.price) {
      throw new Error("Invalid resource metadata.");
    }

    const collection = db.collection("resources"); // Use correct collection
    console.log("Attempting to store resource:", resource); // Debugging log

    const result = await collection.insertOne(resource); // Insert metadata into MongoDB
    console.log("Resource inserted with ID:", result.insertedId); // Debugging log

    return result.insertedId; // Return the generated resource ID
  } catch (error) {
    console.error("Error storing resource metadata:", error); // Log full error details
    throw new Error(`Failed to store resource metadata: ${error.message}`); // Throw user-friendly error with original message
  }
};

// Function to fetch resource metadata by ID
export const getResourceById = async (resourceId) => {
  try {
    const collection = db.collection("resources");
    const resource = await collection.findOne({ _id: resourceId });
    if (!resource) {
      throw new Error("Resource not found.");
    }
    return resource;
  } catch (error) {
    console.error("Error fetching resource metadata:", error);
    throw error;
  }
};

// Function to get all resources' metadata
export const getAllResourcesMetadata = async () => {
  try {
    const collection = db.collection("resources");
    const resources = await collection.find({}).toArray();
    return resources;
  } catch (error) {
    console.error("Error fetching all resource metadata:", error);
    throw new Error("Failed to fetch resources");
  }
};

export const createFile = async (fileBuffer) => {
  try {
    if (!fileBuffer || !fileBuffer.length) {
      throw new Error("File buffer is empty or undefined.");
    }

    console.log("Total file size (bytes):", fileBuffer.length);

    // Check HBAR balance before proceeding
    const balance = await new AccountBalanceQuery()
      .setAccountId(process.env.OPERATOR_ID)
      .execute(client);
    console.log("Operator HBAR balance:", balance.hbars.toString());

    if (balance.hbars < new Hbar(2)) {
      throw new Error("Insufficient HBAR balance to cover transaction fees.");
    }

    // Step 1: Create an empty file on Hedera
    const filePrivateKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
    const filePublicKey = filePrivateKey.publicKey;

    const createTransaction = await new FileCreateTransaction()
      .setKeys([filePublicKey]) // Set the file's access keys
      .setMaxTransactionFee(new Hbar(6)) // Adjust the fee if needed
      .freezeWith(client);

    const signedTransaction = await createTransaction.sign(filePrivateKey);
    const response = await signedTransaction.execute(client);
    const receipt = await response.getReceipt(client);
    const fileId = receipt.fileId;

    console.log("Empty file created with ID:", fileId.toString());

    // Step 2: Split the file into chunks and upload them
    const CHUNK_SIZE = 1024; // 1KB per chunk
    let startIndex = 0;

    while (startIndex < fileBuffer.length) {
      const chunk = fileBuffer.slice(startIndex, startIndex + CHUNK_SIZE);

      const appendTransaction = await new FileAppendTransaction()
        .setFileId(fileId)
        .setContents(chunk)
        .setMaxTransactionFee(new Hbar(5)) // Adjust based on the chunk size
        .freezeWith(client);

      const signedAppendTransaction = await appendTransaction.sign(filePrivateKey);
      const appendResponse = await signedAppendTransaction.execute(client);
      const appendReceipt = await appendResponse.getReceipt(client);

      if (appendReceipt.status.toString() !== "SUCCESS") {
        throw new Error(`File append failed for chunk starting at ${startIndex}`);
      }

      console.log(
        `Uploaded chunk (${startIndex}-${startIndex + chunk.length} bytes) successfully.`
      );
      startIndex += CHUNK_SIZE;
    }

    console.log("File upload complete. File ID:", fileId.toString());
    return fileId.toString();
  } catch (error) {
    console.error("Error uploading file to Hedera:", error.message);
    throw error;
  }
};

export const downloadFile = async (fileId) => {
  try {
    // Query the file contents using the provided file ID
    const fileQuery = new FileContentsQuery().setFileId(fileId);
    const fileContents = await fileQuery.execute(client);

    return fileContents;
  } catch (error) {
    console.error("Error retrieving file from Hedera:", error);
    throw error;
  }
};

// Hedera token generation function
export const generateToken = async (fileBuffer, title) => {
  try {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);

    // Use AccountBalanceQuery to get the account balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    // Define the required fee for token creation (adjust as necessary)
    const requiredFee = new Hbar(5); // Set to 5 HBAR or more as needed

    // Check if the operator has enough balance to cover the fee
    if (balance.hbars < requiredFee) {
      throw new Error("Insufficient HBAR balance to cover the token creation fee.");
    }

    const tokenTransaction = new TokenCreateTransaction()
      .setTokenName(title)
      .setTokenSymbol("RES")
      .setDecimals(0)
      .setInitialSupply(100)
      .setTreasuryAccountId(operatorId)
      .setMaxTransactionFee(requiredFee); // Set the required fee

    const response = await tokenTransaction.execute(client);
    const tokenReceipt = await response.getReceipt(client);
    return tokenReceipt.tokenId.toString();
  } catch (error) {
    console.error("Error generating token on Hedera:", error);
    throw error;
  }
};

// Hedera minting function
export const mintMoreTokens = async (tokenId, amount, supplyKey) => {
  try {
    const mintTransaction = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(amount) // Specify the amount to mint
      .setMaxTransactionFee(new Hbar(2)); // Set appropriate fee

    const response = await mintTransaction
      .freezeWith(client)
      .sign(supplyKey) // Sign with the supply key
      .execute(client);

    const receipt = await response.getReceipt(client);
    console.log(`Minted ${amount} tokens. Transaction ID: ${receipt.transactionId}`);
  } catch (error) {
    console.error("Error minting tokens:", error);
    throw error;
  }
};

// Hedera purchase validation function
export const validatePurchase = async (resourceId, userId) => {
  try {
    const collection = db.collection("metadata");
    
    // Fetch the resource metadata (assuming the resource document has an owner field)
    const resource = await collection.findOne({ _id: resourceId });
    
    if (!resource) {
      throw new Error("Resource not found.");
    }

    // If the user is the owner, allow them to access the resource
    if (resource.ownerId === userId) {
      return true;
    }

    // Otherwise, check if the user has made the purchase
    const purchaseRecord = await collection.findOne({ resourceId, userId });
    console.log("Purchase record found:", purchaseRecord);

    // If a purchase record exists, grant access
    return !!purchaseRecord;
  } catch (error) {
    console.error("Error validating purchase:", error);
    throw error;
  }
};

export default client;
