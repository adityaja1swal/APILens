const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/apilens";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log(`📦 MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.warn("⚠️  Running without database — scan history will not be persisted.");
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
