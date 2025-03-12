const { Client } = require("pg");
const dotenv = require("dotenv");
const moment = require("moment");
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

// check-user-role

const checkUserRole = async (req, res) => {
  try {
    // Get the email from request headers
    const userEmail = req.headers["x-user-email"];

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required." });
    }

    // Query the database for the user's role
    const query = `SELECT user_role FROM public.users WHERE email = $1`;
    const result = await client.query(query, [userEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const { user_role } = result.rows[0];
    if (user_role === "Product Owner" || user_role === "Licensed Owner") {
      return res.status(200).json({ access: true, message: "Access granted." });
    }

    return res.status(403).json({
      access: false,
      message: "Access denied. Role does not permit access to the Users tab.",
    });
  } catch (error) {
    console.error("Error checking user role:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//create-user

const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Check if all required fields are provided
  if (!username || !email || !password || !role) {
    return res
      .status(400)
      .json({ success: false, error: "All fields are required" });
  }

  try {
    // Check if the email already exists in the database
    const emailCheckQuery = "SELECT * FROM users WHERE email = $1";
    const emailCheckResult = await client.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Email is already in use" });
    }

    // Insert the new user into the database (updated column name to user_role)
    const insertUserQuery = `
      INSERT INTO users (username, email, password, user_role)
      VALUES ($1, $2, $3, $4) RETURNING id, username, email, user_role
    `;
    const values = [username, email, password, role];

    const insertResult = await client.query(insertUserQuery, values);

    const newUser = insertResult.rows[0];

    res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while creating the user",
    });
  }
};

//get role

const getUserRole = async (req, res) => {
  try {
    // Get the email from request headers
    const userEmail = req.headers["x-user-email"];

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required." });
    }

    // Query the database for the user's role
    const query = `SELECT user_role FROM public.users WHERE email = $1`;
    const result = await client.query(query, [userEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const { user_role } = result.rows[0];

    // Return the role of the user
    return res.status(200).json({ user_role });
  } catch (error) {
    console.error("Error fetching user role:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//reset password

const resetPassword = async (req, res) => {
  console.log("Post req received");

  const { email, newPassword } = req.body;
  console.log("Received request:", newPassword, email);

  // if ( !newPassword) {
  //   return res.status(400).json({ success: false, error: ' new password are required' });
  // }

  try {
    // Update the password directly
    const updateQuery =
      "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email";
    const result = await client.query(updateQuery, [newPassword, email]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while updating the password",
    });
  }
};

//photo upload

const userPhoto = async (req, res) => {
  const username = req.params.username;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = `/uploads/${req.file.filename}`;

  try {
    const result = await client.query(
      "UPDATE users SET profile_url = $1 WHERE username = $2 RETURNING *",
      [filePath, username]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({
      success: true,
      message: "Profile photo uploaded successfully!",
      photoUrl: filePath, // Updated: using filePath instead of photoUrl
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//get user Profile

const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const userResult = await client.query(
      "SELECT * from users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
};

//get org name

const getOrgName = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await client.query(
      "SELECT org_name FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ org_name: result.rows[0].org_name });
  } catch (error) {
    console.error("Error fetching org_name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = {
  checkUserRole,
  createUser,
  getUserRole,
  resetPassword,
  userPhoto,
  getUserProfile,
  getOrgName,
};
