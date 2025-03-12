const { Client } = require("pg");
const dotenv = require("dotenv");
const Twilio = require("twilio");
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

  // Initialize Twilio client
  const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

//create customer
const createCustomer = async (req, res) => {
  const {
    email,
    customerName,
    customerEmail,
    industry,
    subdomain,
    natureOfBusiness,
  } = req.body;

  try {
    // Use client for queries instead of pool
    const result = await client.query(
      "INSERT INTO customer_accounts (email, customer_name, customer_email, industry, subdomain, nature_of_business) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        email,
        customerName,
        customerEmail,
        industry,
        subdomain,
        natureOfBusiness,
      ]
    );

    res.status(201).json({
      message: "Customer account created successfully!",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error creating customer account",
      error: err.message,
    });
  }
};

//get customer

const getCustomer = async (req, res) => {
  const { email } = req.query;

  try {
    // Use client for queries instead of pool
    const result = await client.query(
      "SELECT * FROM customer_accounts WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        message: "Customer accounts retrieved successfully!",
        data: result.rows,
      });
    } else {
      res.status(404).json({
        message: "No customer accounts found for this email.",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error fetching customer accounts",
      error: err.message,
    });
  }
};

//get all customers
const getAllCustomers = async (req, res) => {
  const { email } = req.query; // Get the email from the query parameters

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Query to fetch customers from the 'customer_accounts' table and filter by email
    const result = await client.query(
      "SELECT customer_name FROM customer_accounts WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        message: "Customers fetched successfully!",
        data: result.rows, // Returning the list of customers
      });
    } else {
      res.status(404).json({
        message: "No customers found for this email.",
      });
    }
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({
      message: "Error fetching customers",
      error: err.message,
    });
  }
};

const getCustomerByName = async (req, res) => {
  const { customerName } = req.params;
  const { email } = req.query; // Get the email from query parameters

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Query to fetch phone numbers for the specified customer name, filtered by email
    const result = await client.query(
      "SELECT phone, country_code, name, customer_name FROM contacts WHERE customer_name = $1 AND email = $2",
      [customerName, email]
    );

    if (result.rows.length > 0) {
      // Map the result to an array of phone numbers with customer details
      const phoneNumbers = result.rows.map((row) => ({
        phoneNumber: `${row.country_code} ${row.phone}`,
        customerName: row.customer_name,
        name: row.name,
      }));

      // Return the phone numbers
      res.json({ data: phoneNumbers });
    } else {
      res.status(404).json({
        message: `No contacts found for customer '${customerName}' with this email.`,
      });
    }
  } catch (error) {
    console.error("Error fetching customer numbers:", error);
    res.status(500).json({
      message: "Error fetching customer contacts.",
      error: error.message,
    });
  }
};

module.exports = {
  createCustomer,
  getCustomer,
  getAllCustomers,
  getCustomerByName,
};
