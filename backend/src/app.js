const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const pool = require("./config/database");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SecureCloud API is running",
  });
});

// PostgreSQL connection test
pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected successfully");
  })
  .catch((err) => {
    console.error("PostgreSQL connection failed:", err.message);
  });

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SecureCloud API running on port ${PORT}`);
});