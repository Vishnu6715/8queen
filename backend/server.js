const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));app.use(express.json());

app.get("/", (req, res) => {
  res.send("Queen Game Backend Running");
});

// Auth routes for signup and login
app.use("/api/auth", require("./routes/auth"));

const PORT = 5001;
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/queen_game")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err.message);
  });

