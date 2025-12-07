import express from "express";
import cors from "cors";
import mongoose from "mongoose";

// ------------------ CONFIG ------------------
const app = express();
const PORT = 3000;

// Replace this with your MongoDB connection string
const MONGO_URI = "mongodb://127.0.0.1:27017/contestdb";

// ------------------ MIDDLEWARE ------------------
app.use(cors());
app.use(express.json());

// ------------------ MONGODB CONNECTION ------------------
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: "contestdb" });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

connectDB();

// ------------------ MONGOOSE MODEL ------------------
const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    skill: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      default: "waiting",
      enum: ["waiting", "qualified", "rejected"]
    }
  },
  { timestamps: true }
);

const Participant = mongoose.model("Participant", participantSchema);

// ------------------ ROUTES ------------------

// GET all participants + optional filters
app.get("/api/participants", async (req, res) => {
  try {
    const { skill, minScore } = req.query;
    const query = {};

    if (skill) query.skill = skill;
    if (minScore) query.score = { $gte: Number(minScore) };

    const participants = await Participant.find(query).sort({ score: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// GET one participant by ID
app.get("/api/participants/:id", async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ error: "Not found" });

    res.json(participant);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// CREATE new participant
app.post("/api/participants", async (req, res) => {
  try {
    const { name, skill, score } = req.body;
    if (!name || !skill || typeof score !== "number") {
      return res.status(400).json({ error: "name, skill & score required" });
    }

    const newParticipant = await Participant.create({ name, skill, score });
    res.status(201).json(newParticipant);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

// UPDATE (partial)
app.patch("/api/participants/:id", async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.score === "number") updates.score = req.body.score;
    if (req.body.status) updates.status = req.body.status;

    const updated = await Participant.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Invalid update request" });
  }
});

// DELETE participant
app.delete("/api/participants/:id", async (req, res) => {
  try {
    const deleted = await Participant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid delete request" });
  }
});

// ------------------ START SERVER ------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running at: http://localhost:${PORT}`)
);
