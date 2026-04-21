const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

dotenv.config();

// --- Validate critical environment variables ---
const requiredEnv = ["JWT_SECRET", "MONGO_URI"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} environment variable is not set`);
    process.exit(1);
  }
}

// Connect to MongoDB
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// --- Rate limiters ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP
  message: { message: "Too many attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  message: { message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

// --- Routes ---
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/inventory", require("./routes/inventory.routes"));
app.use("/api/customers", require("./routes/customer.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/fulfillment", require("./routes/fulfillment.routes"));
app.use("/api/reconciliation", require("./routes/reconciliation.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/stock-movements", require("./routes/stockMovement.routes"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "ORDERFLOW API is running", version: "1.1.0" });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation error", errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `Duplicate value for '${field}'` });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
    ...(process.env.NODE_ENV === "development" && { error: err.message, stack: err.stack }),
  });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`ORDERFLOW server running on port ${PORT}`);
});

// --- Graceful shutdown ---
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
