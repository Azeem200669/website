import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";

dotenv.config();

if (!process.env.NVIDIA_API_KEY) {
  console.warn("WARNING: NVIDIA_API_KEY is not set. Chat will not work.");
}

const app = express();

// Allow all origins (works for both local dev and deployed frontend)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ArcNova Backend is running.");
});

app.get("/test", (req, res) => {
  res.send("Backend Working");
});

app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});