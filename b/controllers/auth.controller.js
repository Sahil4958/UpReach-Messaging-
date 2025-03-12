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

//Register

const register = async (req, res) => {
  const { name, email, password, org_name } = req.body;

  try {
    // Check if a user with the provided email already exists
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Insert the new user into the database with profile_url set to null and user_role set as "Guest User"
    const insertQuery = `
      INSERT INTO users (username, email, password, org_name, profile_url, user_role, contacts_limit, uploaded_contacts,
        sms_limit, sent_sms, trial_end_date)
      VALUES ($1, $2, $3, $4, null, 'Guest User',10,0,10,0,null)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      name,
      email,
      password,
      org_name,
    ]);
    const newUser = result.rows[0];

    // Registration successful, return user details including org_name and user_role
    res.status(201).json({
      message: "Registration successful",
      username: newUser.username,
      email: newUser.email,
      org_name: newUser.org_name,
      user_role: newUser.user_role,
      sms_limit: newUser.sms_limit,
      trial_end_date: newUser.trial_end_date,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "An error occurred during registration" });
  }
};

//Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists in the database
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check password (assuming plain text for now)
    if (password !== user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Login successful
    // Send back the user info along with the success message
    res.status(200).json({
      message: "Login successful",
      username: user.username, // Assuming the column name is 'username'
      email: user.email,
      profileUrl: user.profile_url,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
};

module.exports = { login, register };
