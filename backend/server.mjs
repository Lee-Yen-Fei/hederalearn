if (process.env.NODE_ENV !== 'production') {  // Example condition to load dotenv in non-production environments
    import('dotenv')
        .then((dotenv) => {
            dotenv.config();  // Now you can use the dotenv functionality
            console.log('Environment variables loaded.');
        })
        .catch((error) => {
            console.error('Error loading dotenv:', error);
        });
}

import express from "express";
import cors from "cors";

import { sendHCSMessage, fetchMessagesFromTopic } from "./utils/hcs.js"; // Import the generalized function
import paymentRoutes from "./routes/paymentRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";  
import resourceRoutes from "./routes/resourceRoutes.js";

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://hederalearn.streamlit.app/', 
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
}));

// Register routes
app.use("/payments", paymentRoutes);
app.use("/resources", resourceRoutes);

// Modify tutorRoutes to interact with HCS
app.use("/tutors", tutorRoutes);

// Add resource route (to handle resources)
app.post("/resources", async (req, res) => {
    try {
        // Submit resource data to HCS using the generalized function
        await sendHCSMessage(process.env.RESOURCE_TOPIC_ID, "resource-upload", req.body);
        res.status(200).send("Resource added successfully.");
    } catch (error) {
        res.status(500).send("Error adding resource.");
    }
});

// Tutor route (unchanged, but consider making sure it adds tutors via HCS)
app.post("/tutors", async (req, res) => {
    try {
        // Send tutor data to HCS using the generalized function
        await sendHCSMessage(process.env.TUTOR_TOPIC_ID, "tutor-request", req.body);
        res.status(200).send("Tutor added successfully.");
    } catch (error) {
        res.status(500).send("Error adding tutor.");
    }
});

// Tutor route to fetch tutors from HCS (query from mirror node)
app.get("/tutors", async (req, res) => {
    const filters = req.query; // Extract filters from the request query params
    try {
        const messages = await fetchMessagesFromTopic(process.env.TUTOR_TOPIC_ID);
        
        // Apply filters if provided
        const tutors = filters && Object.keys(filters).length > 0
            ? messages.filter((msg) => {
                return Object.entries(filters).every(([key, value]) => msg[key] === value);
            })
            : messages;

        res.json(tutors);
    } catch (error) {
        res.status(500).send("Error fetching tutors.");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
