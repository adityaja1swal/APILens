const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/apilens";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    isConnected = true;
    console.log(`📦 MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    isConnected = false;
    mongoose.set('bufferCommands', false); // Disable buffering so operations fail fast if not connected
    console.error("❌ MongoDB connection failed:", err.message);
    console.warn("⚠️  Running without database — scan history and authentication will not work.");
  }
}

function getConnectionStatus() {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    uri: MONGODB_URI.replace(/\/\/.*@/, "//***@"), // hide credentials
  };
}

module.exports = { connectDB, getConnectionStatus };
