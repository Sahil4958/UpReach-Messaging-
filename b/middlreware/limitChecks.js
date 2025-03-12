const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

// Set up PostgreSQL client
const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

client
  .connect()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Connection error", err.stack));

const setUserMiddleware = async (req, res, next) => {
  console.log(" Middleware triggered");
  const userEmail = req.headers["x-user-email"];
  console.log("Received user email:", userEmail);

  // console.log(
  //   "🔹 Checking x-user-email in headers:",
  //   req.headers["x-user-email"]
  // );
  // console.log("🔹 Full Request Headers:", req.headers);
  console.log("🔹 Extracted userEmail:", userEmail);

  if (!userEmail) {
    console.log(" No email provided");
    return res
      .status(401)
      .json({ message: "Unauthorized: Email not provided." });
  }
  console.log(" User Email Found:", userEmail);
  try {
    const { rows } = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [userEmail]
    );

    if (rows.length === 0) {
      console.log(" User not found in database for email:", userEmail);
      return res.status(404).json({ message: "User not found." });
    }

    req.user = rows[0];
    console.log(" User found and attached to request:", req.user);
    next();
  } catch (error) {
    console.error("db err", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Middleware to check if the user is within their trial period

const checkTrialPeriod = async (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User not found in request." });
  }
  try {
    const { rows } = await client.query(
      "SELECT user_role , trial_end_date FROM users WHERE email = $1",
      [req.user.email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user.user_role === "Guest User" &&
      new Date() > new Date(user.trial_end_date)
    ) {
      return res.status(403).json({
        message: "Your free trial has been ended. Upgrade to a paid plan",
      });
    }
    next();
  } catch (error) {
    console.error("Trial check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Middleware to check if the user has reached their contacts limit

const checkContactsLimit = async (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User not found in request." });
  }

  const { rows } = await client.query(
    "SELECT user_role , uploaded_contacts , contacts_limit FROM users WHERE email = $1",
    [req.user.email]
  );
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (
    user.user_role === "Guest User" &&
    user.uploaded_contacts >= user.contacts_limit
  ) {
    return res.status(403).json({
      message: "Contact upload limit reached. Upgrade to a paid plan.",
    });
  }
  next();
};

// Middleware to check if the user has reached their SMS limit
const checkSmsLimit = async (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User not found in request." });
  }

  const { rows } = await client.query(
    "SELECT user_role, sent_sms, sms_limit FROM users WHERE email = $1",
    [req.user.email]
  );
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.user_role === "Guest User" && user.sent_sms >= user.sms_limit) {
    return res
      .status(403)
      .json({ message: "SMS sending limit reached. Upgrade to a paid plan." });
  }
  next();
};

module.exports = {
  checkTrialPeriod,
  checkContactsLimit,
  checkSmsLimit,
  setUserMiddleware,
};
