import { Client, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import path from 'path';
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

// Ensure dotenv is loaded properly before any other code executes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to .env file correctly
const envPath = path.resolve(__dirname, '../.env');

// If in development, load .env file; in production, environment variables will be set by Render
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: envPath });
  console.log("Resolved .env file path:", envPath); // Optional: log to verify path
}

const operatorId = process.env.OPERATOR_ID;
const operatorKey = process.env.OPERATOR_KEY; 

if (!process.env.OPERATOR_KEY) {
    throw new Error("OPERATOR_KEY is not set in the environment variables.");
}

// Set up Hedera client
const client = Client.forTestnet(); // Use Client.forMainnet() in production
try {
    client.setOperator(operatorId, operatorKey);
    console.log("Client initialized successfully.");
} catch (error) {
    console.error("Error initializing Hedera client:", error.message);
    throw error;
}

export async function authenticateUser(operatorIdToVerify) {
    if (!operatorIdToVerify) {
        console.error("No operator ID provided for authentication.");
        return false;
    }

    console.log("Authenticating user with operator ID:", operatorIdToVerify);

    // Create the authentication message
    const message = {
        type: "authentication",
        operatorId: operatorIdToVerify,
        timestamp: new Date().toISOString(),
    };

    const messageString = JSON.stringify(message);

    try {
        console.log("Submitting authentication message to HCS...");
        const transaction = new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(messageString);

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);

        console.log("Transaction receipt status:", receipt.status);

        // Return authentication status based on transaction success
        return receipt.status.toString() === "SUCCESS";
    } catch (error) {
        console.error("Error submitting authentication message:", error);
        return false;
    }
}

// General function to send message to any HCS topic
export async function sendHCSMessage(topicId, messageType, messageData) {
    let message = {};

    // Create message based on the message type
    switch (messageType) {
        case "resource-upload":
            message = {
                type: "resource-upload",
                title: messageData.title,
                subject: messageData.subject,
                price: messageData.price,
                uploadedAt: new Date(),
            };
            break;

        case "tutor-request":
            console.log("Tutor request data:", messageData);
            message = {
                type: "tutor-request",
                tutorId: messageData.tutorId,
                studentId: messageData.studentId,
                requestedAt: new Date(),
            };
            break;

        case "payment":
            message = {
                type: "payment",
                amount: messageData.amount,
                payerId: messageData.payerId,
                payeeId: messageData.payeeId,
                paymentDate: new Date(),
            };
            break;

        default:
            message = { type: "generic", content: messageData };
            break;
    }

    const messageString = JSON.stringify(message);

    try {
        const transaction = new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(messageString);

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        console.log("Message submitted. Status: ", receipt.status);
    } catch (error) {
        console.error("Error submitting message to HCS: ", error);
        throw error;
    }
}

// Example function to fetch messages from a single topic (as is)
export async function fetchMessagesFromTopic(topicId) {
    const url = `${process.env.MIRROR_NODE_URL}/topics/${topicId}/messages`;
    try {
        const response = await axios.get(url);
        const messages = response.data.messages;

        return messages.map(msg => JSON.parse(Buffer.from(msg.message, "base64").toString()));
    } catch (error) {
        console.error("Error fetching messages from mirror node: ", error);
        throw error;
    }
}

// General function to fetch messages from multiple topics
export async function fetchMessagesFromMultipleTopics(topicIds) {
    const results = [];
    for (const topicId of topicIds) {
        try {
            const messages = await fetchMessagesFromTopic(topicId);
            console.log("Fetched messages:", messages);
            results.push({ topicId, messages });
        } catch (error) {
            console.error(`Error fetching messages from topic ${topicId}:`, error);
        }
    }
    return results; // Returns an array of objects with topicId and messages
}
