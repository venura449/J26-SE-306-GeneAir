require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const mobileAuthRoutes = require("./routes/mobileAuthRoutes");
const riskRoutes = require("./routes/riskRoutes");
const app = express();
const port = process.env.PORT || 4000;
const logger = require("./utils/logger");
const User = require("./models/User");
const usernameBloomFilter = require("./services/usernameBloomFilter");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/mobile/auth", mobileAuthRoutes);
app.use("/api/risk", riskRoutes);
async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET)
    logger.error("MONGODB_URI and JWT_SECRET are required");
  await mongoose.connect(process.env.MONGODB_URI);
  await usernameBloomFilter.initialize(User);
  app.listen(port, () => logger.info(`GeneAir API listening on port ${port}`));
}
if (require.main === module)
  start().catch((error) => {
    logger.error(error.message);
    process.exit(1);
  });
module.exports = app;
