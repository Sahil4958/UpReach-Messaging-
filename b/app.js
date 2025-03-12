// server.js
const express = require("express");
const { Client } = require("pg");
const dotenv = require("dotenv");
const cors = require("cors");

const path = require("node:path");

// Import axios for HTTP requests
require("dotenv").config();
const {
  startNotificationService,
  getState,
} = require("./service/notification");
startNotificationService();
getState();
const format = require("pg-format"); // For batch inserts

//import router

const authRouter = require("./routes/auth.router");
const customerRouter = require("./routes/customer.router");
const contactRouter = require("./routes/contact.router");
const campaignRouter = require("./routes/campaign.router");
const msgRouter = require("./routes/message.router");
const userRouter = require("./routes/user.router");
const metricsRouter = require("./routes/metrics.router");
const homeMetricsRouter = require("./routes/homemetrics.router.js");

const freeTrialRouter = require("./routes/freetrial.routes.js");

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
const port = process.env.PORT || 5005;

// Use CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    allowedHeaders: ["Content-Type", "x-user-email"],
  })
);

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Check required environment variables
if (
  !process.env.PGDATABASE ||
  !process.env.PGUSER ||
  !process.env.PGPASSWORD ||
  !process.env.PGHOST ||
  !process.env.PGPORT ||
  !process.env.TWILIO_ACCOUNT_SID ||
  !process.env.TWILIO_AUTH_TOKEN ||
  !process.env.TWILIO_PHONE_NUMBER
) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

//middleware router

app.use("/", authRouter);
app.use("/api", homeMetricsRouter);
app.use("/api", metricsRouter);

app.use("/api", customerRouter);
app.use("/api", contactRouter);
app.use("/api", campaignRouter);
app.use("/api", msgRouter);
app.use("/api", userRouter);

app.use("/api", freeTrialRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
