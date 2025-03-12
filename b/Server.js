// server.js
const express = require("express");
const { Client } = require("pg");
const dotenv = require("dotenv");
const cors = require("cors");
const moment = require("moment");
const Twilio = require("twilio");
const multer = require("multer");
const path = require("node:path");
const cron = require("node-cron");
const axios = require("axios"); // Import axios for HTTP requests
require("dotenv").config();
const { startNotificationService, getState } = require("./notification");
startNotificationService();
const format = require("pg-format"); // For batch inserts

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
const port = process.env.PORT || 5005;

// Use CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
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

// Set up PostgreSQL client
const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Initialize Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Connect to the database
client
  .connect()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Connection error", err.stack));

app.post("/login", async (req, res) => {
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
});
app.post("/api/customer", async (req, res) => {
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
});
app.get("/api/customer", async (req, res) => {
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
});
app.get("/api/customers", async (req, res) => {
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
});
app.post("/api/contact", async (req, res) => {
  const { customer, name, title, countryCode, phone, email } = req.body;

  if (!customer || !name || !title || !countryCode || !phone || !email) {
    return res.status(400).json({
      message: "All fields (including email) are required.",
    });
  }

  try {
    // Insert the form data into the database (assuming a `contacts` table exists)
    const result = await client.query(
      "INSERT INTO contacts (customer_name, name, title, country_code, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [customer, name, title, countryCode, phone, email]
    );

    // Respond with the inserted data
    res.status(201).json({
      message: "Contact created successfully!",
      data: result.rows[0], // Return the inserted data
    });
  } catch (err) {
    console.error("Error storing contact:", err);
    res.status(500).json({
      message: "Error storing contact data.",
      error: err.message,
    });
  }
});
app.get("/api/contacts", async (req, res) => {
  try {
    // Get the userEmail from the query parameters
    const userEmail = req.query.userEmail;

    if (!userEmail) {
      return res.status(400).json({
        message: "Missing userEmail parameter.",
      });
    }

    // Query to fetch contacts for the specific email
    const result = await client.query(
      "SELECT * FROM contacts WHERE email = $1",
      [userEmail]
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        message: "Contacts fetched successfully!",
        data: result.rows, // Returning the filtered list of contacts
      });
    } else {
      res.status(404).json({
        message: "No contacts found for the given email.",
      });
    }
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({
      message: "Error fetching contacts",
      error: err.message,
    });
  }
});
app.get("/api/contacts1", async (req, res) => {
  const { customerName } = req.query; // Get the selected customerName from the query string

  if (!customerName) {
    return res.status(400).json({
      message: "Customer name is required.",
    });
  }

  try {
    // Query to fetch contacts from the database for the selected customer
    const result = await client.query(
      "SELECT * FROM contacts WHERE customer_name = $1", // Adjust the column name if needed
      [customerName] // Use parameterized query to avoid SQL injection
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        message: "Contacts fetched successfully!",
        data: result.rows, // Returning the list of contacts
      });
    } else {
      res.status(404).json({
        message: `No contacts found for customer: ${customerName}`,
      });
    }
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({
      message: "Error fetching contacts",
      error: err.message,
    });
  }
});
app.post("/api/contact/upload", async (req, res) => {
  const data = req.body;
  console.log("Received data:", `Total rows: ${data.length}`);

  if (!Array.isArray(data) || data.length === 0) {
    return res
      .status(400)
      .json({ message: "No data provided or invalid format." });
  }

  const errors = [];
  const validContacts = [];

  const validateContact = (row, index) => {
    const { customer_name, name, title, country_code, phone, email } = row;
    const rowErrors = [];

    // Validate required fields
    if (
      !customer_name ||
      !name ||
      !title ||
      !country_code ||
      !phone ||
      !email
    ) {
      rowErrors.push(`Row ${index + 1}: All fields are required.`);
    }

    // Clean phone number (remove non-numeric characters)
    const cleanedPhone = String(phone).replace(/\D/g, "");

    // Validate cleaned phone number format
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(cleanedPhone)) {
      rowErrors.push(
        `Row ${
          index + 1
        }: Invalid phone number format. It must contain exactly 10 digits.`
      );
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      rowErrors.push(`Row ${index + 1}: Invalid email format.`);
    }

    if (rowErrors.length === 0) {
      validContacts.push({
        customer_name,
        name,
        title,
        country_code,
        phone: cleanedPhone,
        email,
      });
    } else {
      errors.push(...rowErrors);
    }
  };

  // Validate each contact
  data.forEach(validateContact);

  if (errors.length > 0) {
    console.log("Validation errors:", errors);
    return res.status(400).json({ errors });
  }

  const batchSize = 500;

  try {
    await client.query("BEGIN"); // Start transaction

    for (let i = 0; i < validContacts.length; i += batchSize) {
      const batch = validContacts.slice(i, i + batchSize);

      // Build parameterized query
      const values = [];
      const placeholders = batch
        .map(
          (_, index) =>
            `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${
              index * 6 + 4
            }, $${index * 6 + 5}, $${index * 6 + 6})`
        )
        .join(", ");

      batch.forEach(
        ({ customer_name, name, title, country_code, phone, email }) => {
          values.push(customer_name, name, title, country_code, phone, email);
        }
      );

      const query = `
        INSERT INTO contacts (customer_name, name, title, country_code, phone, email)
        VALUES ${placeholders}`;

      // Execute bulk insert
      await client.query(query, values);
    }

    await client.query("COMMIT"); // Commit transaction
    res.status(201).json({
      message: `Successfully uploaded ${validContacts.length} contacts.`,
    });
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback transaction on error
    console.error("Error during bulk insert:", err);
    res
      .status(500)
      .json({ message: "Error storing contact data.", error: err.message });
  }
});

app.get("/api/customers/:customerName/numbers", async (req, res) => {
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
});
const generateUniqueId = async () => {
  const prefix = "CM"; // Constant prefix
  let campaignId;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random 4-digit number
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // Generates a number between 1000 and 9999
    campaignId = `${prefix}${randomNumber}`;

    // Check if the campaign_id already exists in the database
    const result = await client.query(
      "SELECT campaign_id FROM campaigns WHERE campaign_id = $1",
      [campaignId]
    );

    // If not found, the ID is unique
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return campaignId;
};
app.post("/api/campaigns", async (req, res) => {
  const {
    campaignName,
    selectedCustomers,
    selectedNumbers,
    scheduleDatetime,
    email,
  } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    // Generate a unique campaign ID
    const campaignId = await generateUniqueId();

    // Insert the new campaign with the email
    await client.query(
      `INSERT INTO campaigns 
        (campaign_name, campaign_id, customer_name, selected_numbers, created_at, email) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        campaignName,
        campaignId,
        selectedCustomers,
        selectedNumbers,
        scheduleDatetime,
        email,
      ]
    );

    res.status(201).json({
      message: "Campaign created successfully!",
      campaignId,
      campaignName,
      customers: selectedCustomers,
      phoneNumbers: selectedNumbers,
      email, // Return the email in the response as well
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ message: "Error creating campaign." });
  }
});
// DELETE API to delete a campaign by ID
app.delete("/api/campaigns/:campaignId", async (req, res) => {
  const { campaignId } = req.params; // Get the campaignId from the URL parameters
  const { email } = req.body; // Email of the user making the request (optional for validation)

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if the campaign exists by campaignId and email
    const result = await client.query(
      `SELECT * FROM campaigns WHERE campaign_id = $1 AND email = $2`,
      [campaignId, email]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Campaign not found or not authorized to delete" });
    }

    // Delete the campaign
    await client.query(
      `DELETE FROM campaigns WHERE campaign_id = $1 AND email = $2`,
      [campaignId, email]
    );

    res.status(200).json({
      message: "Campaign deleted successfully!",
      campaignId,
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ message: "Error deleting campaign." });
  }
});

app.get("/api/campaigns1", async (req, res) => {
  try {
    // Extract the email from the request headers or query parameters
    const userEmail = req.headers["x-user-email"] || req.query.email;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required." });
    }

    // Query to fetch campaigns for the specific user email
    const result = await client.query(
      "SELECT campaign_id, campaign_name, created_at FROM campaigns WHERE email = $1",
      [userEmail]
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        campaigns: result.rows, // Return filtered campaigns array
      });
    } else {
      res
        .status(404)
        .json({ message: "No campaigns found for the given email." });
    }
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ message: "Error fetching campaigns." });
  }
});
app.get("/api/campaigns2", async (req, res) => {
  try {
    const userEmail = req.headers["user-email"];

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const result = await client.query(
      `SELECT campaign_id, campaign_name, created_at 
       FROM campaigns
       WHERE email = $1 
       ORDER BY created_at DESC`,
      [userEmail]
    );

    // No conversion needed since the DB already has PST data
    const campaigns = result.rows;

    res.status(200).json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ message: "Error fetching campaigns." });
  }
});
app.put("/api/campaigns/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const { updatedDatetime } = req.body;

  try {
    const utcDatetime = moment(updatedDatetime).utc().local().format(); // Ensure UTC format

    await client.query(
      `UPDATE campaigns SET created_at = $1 WHERE campaign_id = $2`,
      [utcDatetime, campaignId]
    );

    res.status(200).json({ message: "Campaign updated successfully!" });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ message: "Error updating campaign." });
  }
});
app.get("/api/campaignDetails", async (req, res) => {
  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ error: "Missing campaignId" });
  }

  try {
    // SQL query to fetch campaign details, ensuring correct campaign context
    const query = `
      WITH unnested_numbers AS (
        SELECT 
          unnest(c.selected_numbers::text[]) AS campaign_number,
          REPLACE(REPLACE(REPLACE(SUBSTRING(unnest(c.selected_numbers::text[]) FROM '([0-9]{10})$'), ' ', ''), '-', ''), '(', '') AS normalized_campaign_number
        FROM campaigns c
        WHERE c.campaign_id = $1
      )
      SELECT 
        unnested_numbers.campaign_number,
        unnested_numbers.normalized_campaign_number,
        ct.phone AS contact_phone,
        REPLACE(REPLACE(REPLACE(SUBSTRING(ct.phone FROM '([0-9]{10})$'), ' ', ''), '-', ''), '(', '') AS normalized_contact_phone,
        ct.customer_name,
        ct.name AS contact_name,
        ct.country_code
      FROM unnested_numbers
      LEFT JOIN contacts ct 
        ON unnested_numbers.normalized_campaign_number = REPLACE(REPLACE(REPLACE(SUBSTRING(ct.phone FROM '([0-9]{10})$'), ' ', ''), '-', ''), '(', '')
    `;

    const result = await client.query(query, [campaignId]);

    // console.log("Query result:", result.rows);  // Add more detailed logging here to check the query result

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No matches found for this campaign" });
    }

    // Process the data and ensure we map correctly
    const data = result.rows.reduce((acc, row) => {
      const phoneNumber = row.normalized_campaign_number;

      // Ensure we're correctly mapping the customer_name for this phone number
      if (!acc[phoneNumber]) {
        acc[phoneNumber] = {
          campaignNumber: row.campaign_number || "Unknown",
          contactPhone: row.contact_phone || "Unknown",
          normalizedCampaignNumber: row.normalized_campaign_number || "Unknown",
          normalizedContactPhone: row.normalized_contact_phone || "Unknown",
          customerName: row.customer_name || "Unknown",
          contactName: row.contact_name || "Unknown",
          countryCode: row.country_code || "",
        };
      } else {
        // If the phone number already exists, only update if the customer_name is linked to the current campaign
        if (!acc[phoneNumber].customerName && row.customer_name) {
          acc[phoneNumber].customerName = row.customer_name;
        }
      }

      return acc;
    }, {});

    // Extract unique data arrays
    const uniqueData = Object.values(data);
    const selectedNumbers = uniqueData.map((d) => d.campaignNumber);
    const customerNames = uniqueData.map((d) => d.customerName);
    const contactNames = uniqueData.map((d) => d.contactName);
    const countryCodes = uniqueData.map((d) => d.countryCode);
    const normalizedCampaignNumbers = uniqueData.map(
      (d) => d.normalizedCampaignNumber
    );
    const normalizedContactPhones = uniqueData.map(
      (d) => d.normalizedContactPhone
    );

    console.log("Processed campaign data:", {
      selectedNumbers,
      customerNames,
      contactNames,
      countryCodes,
      normalizedCampaignNumbers,
      normalizedContactPhones,
    });

    res.json({
      selectedNumbers,
      customerNames,
      contactNames,
      countryCodes,
      normalizedCampaignNumbers,
      normalizedContactPhones,
    });
  } catch (err) {
    console.error("Error fetching campaign details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/save-message", async (req, res) => {
  const { campaignId, message } = req.body;

  // Validate the input
  if (!campaignId || !message) {
    return res
      .status(400)
      .json({ error: "Campaign ID and message are required." });
  }

  try {
    // Insert or update the message if the campaign_id already exists
    const query = `
      INSERT INTO campaign_messages (campaign_id, message)
      VALUES ($1, $2)
      ON CONFLICT (campaign_id) 
      DO UPDATE SET message = EXCLUDED.message
      RETURNING id;
    `;

    const result = await client.query(query, [campaignId, message]);

    // Respond with success and the new/updated message ID
    res.status(201).json({
      success: true,
      message: "Message saved successfully.",
      messageId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    res
      .status(500)
      .json({ error: "An error occurred while saving the message." });
  }
});
app.get("/api/template-categories", async (req, res) => {
  try {
    // Query to fetch distinct message categories
    const query = `
      SELECT DISTINCT message_category
      FROM public.messages
      ORDER BY message_category;
    `;

    // Execute the query using the existing client
    const result = await client.query(query);

    // Check if we got any categories
    if (result.rows.length > 0) {
      // Send the list of categories as the response
      res.json({ categories: result.rows.map((row) => row.message_category) });
    } else {
      res.status(404).json({ error: "No categories found" });
    }
  } catch (error) {
    console.error("Error fetching template categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/messages", async (req, res) => {
  const { category } = req.query; // Get the category from query params

  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }

  try {
    // Query to fetch messages for the selected category
    const result = await client.query(
      "SELECT message_line_text FROM public.messages WHERE message_category = $1 ORDER BY lno",
      [category]
    );

    // Check if messages exist
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No messages found for this category" });
    }

    // Return the messages
    res.json({ messages: result.rows.map((row) => row.message_line_text) });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching messages" });
  }
});
app.post("/api/triggerCampaign", async (req, res) => {
  const { campaignId, contacts, userEmail } = req.body;

  // console.log('Received request:', req.body);  // Log the full incoming request body

  if (!campaignId || contacts.length === 0 || !userEmail) {
    return res
      .status(400)
      .json({ message: "Campaign ID, contacts, and user email are required." });
  }

  try {
    // Fetch the message template for the campaign
    const campaignMessageQuery =
      "SELECT message FROM campaign_messages WHERE campaign_id = $1";
    const result = await client.query(campaignMessageQuery, [campaignId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No message found for the campaign." });
    }

    const messageTemplate = result.rows[0].message;
    console.log(`Message Template: ${messageTemplate}`); // Log the fetched message template

    // Iterate through the contacts and send SMS
    const sendSmsPromises = contacts.map(async (contact, index) => {
      let { country_code, phone } = contact;

      console.log(`Processing contact ${index + 1}:`, contact); // Log each contact before processing

      // Ensure the country code has '+' at the start (for formatting purposes only)
      if (!country_code.startsWith("+")) {
        country_code = `+${country_code}`;
      }

      // Clean the phone number to remove any spaces or country code part
      phone = phone.replace(/\s+/g, ""); // Remove spaces if any
      if (phone.startsWith(country_code)) {
        phone = phone.slice(country_code.length); // Remove country code from the phone number if present
      }

      console.log(`Cleaned phone number: ${phone}`); // Log the cleaned phone number

      // Construct the full phone number by combining country code and phone number
      const fullPhoneNumber = `${country_code}${phone}`;
      console.log(`Full phone number: ${fullPhoneNumber}`); // Log the full phone number

      // Query for the contact name using only the phone number (no country code)
      const contactQuery = "SELECT name FROM contacts WHERE phone = $1";
      const contactResult = await client.query(contactQuery, [phone]);

      if (contactResult.rows.length === 0) {
        console.log(`Contact not found: ${fullPhoneNumber}`); // Log when contact is not found
        return; // Skip if contact is not found
      }

      const contactName = contactResult.rows[0].name;
      console.log(`Contact name found: ${contactName}`); // Log the contact name found

      const personalizedMessage = messageTemplate.replace(
        "[Name]",
        contactName
      );
      console.log(`Personalized message: ${personalizedMessage}`); // Log the personalized message

      try {
        const message = await twilioClient.messages.create({
          to: fullPhoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: personalizedMessage,
        });

        console.log(`SMS sent to ${fullPhoneNumber}: ${message.sid}`); // Log the successful SMS sending

        // Insert SMS details into the sent_campaign_sms table
        const insertQuery = `
          INSERT INTO sent_campaign_sms (
            campaign_id, email, phone, message_sid, message, "from", sent_at
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
          campaignId,
          userEmail,
          fullPhoneNumber,
          message.sid,
          personalizedMessage,
          process.env.TWILIO_PHONE_NUMBER, // The Twilio phone number used to send the SMS
          new Date().toISOString(),
        ];

        await client.query(insertQuery, values);

        console.log(`SMS details stored for ${fullPhoneNumber}`);
      } catch (err) {
        console.error(`Failed to send SMS to ${fullPhoneNumber}:`, err); // Log any error during SMS sending
      }
    });

    await Promise.all(sendSmsPromises);
    res.status(200).json({ message: "Campaign triggered successfully." });
  } catch (error) {
    console.error("Error triggering campaign:", error); // Log any error in the API processing
    res.status(500).json({ message: "Error triggering campaign." });
  }
});
app.post("/api/getReceivedMessages", async (req, res) => {
  try {
    // Fetch messages from Twilio
    const messages = await twilioClient.messages.list({ limit: 2000 });

    // Filter only received messages (where the direction is inbound)
    const receivedMessages = messages.filter(
      (message) => message.direction === "inbound"
    );

    // Insert each received message into the database
    for (const message of receivedMessages) {
      try {
        // Insert the message into the database
        await client.query(
          `INSERT INTO received_messages 
          (from_phone_number, message_body, date_received, status) 
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (from_phone_number, date_received) DO NOTHING`,
          [
            message.from,
            message.body,
            message.dateSent || new Date(),
            message.status,
          ]
        );
      } catch (insertError) {
        console.error("Error saving message:", insertError);
      }
    }

    res.status(200).json({
      success: true,
      message: `${receivedMessages.length} received messages processed and stored.`,
    });
  } catch (err) {
    console.error("Error fetching or storing received messages:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.get("/api/getSentCampaignSms", async (req, res) => {
  try {
    const { email } = req.query;

    // Validate that email is provided
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message:
          "A valid email is required to fetch sent campaign SMS records.",
      });
    }

    // Build the query to fetch sent SMS data and join with contacts to get the name
    const query = `
      SELECT 
        sc.campaign_id, 
        sc.phone, 
        sc.message_sid, 
        sc.message, 
        sc."from", 
        sc.sent_at,
        c.name AS contact_name
      FROM 
        sent_campaign_sms sc
      LEFT JOIN 
        contacts c
      ON 
        c.country_code || c.phone = sc.phone  -- Match phone by concatenating country_code and phone
      WHERE 
        sc.email = $1
      ORDER BY 
        sc.sent_at DESC
    `;

    // Execute the query
    const { rows } = await client.query(query, [email.trim()]);

    // Respond with the fetched data
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching sent SMS data:", err);

    // Handle server errors
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching sent SMS records.",
    });
  }
});
app.get("/api/getReceivedMessages", async (req, res) => {
  try {
    const { email } = req.query;

    // Validate that email is provided
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "A valid email is required to fetch received messages.",
      });
    }

    // Build the updated query to fetch received messages, with filtering on campaign_id being not null
    const query = `
    SELECT DISTINCT ON (rm.from_phone_number, rm.message_body)  -- This prevents duplicate rows with same from_phone_number and message_body
      rm.from_phone_number, 
      rm.message_body, 
      rm.status, 
      TO_CHAR(rm.date_received, 'DD MM YYYY HH24:MI:SS') AS date_received, 
      c.name AS contact_name,
      sc.campaign_id,         -- Include campaign_id from the sent_campaign_sms table
      sc.from AS sender_from   -- Get the 'from' column from the sent_campaign_sms table
    FROM 
      received_messages rm
    LEFT JOIN 
      contacts c 
    ON 
      c.country_code || c.phone = rm.from_phone_number  -- Match phone by concatenating country_code and phone
    LEFT JOIN 
      sent_campaign_sms sc
    ON 
      sc.phone = rm.from_phone_number AND sc.email = $1  -- Use the email as a parameter
    WHERE 
      rm.from_phone_number IN (
        SELECT DISTINCT sc.phone
        FROM sent_campaign_sms sc
        WHERE sc.email = $1
      )
      AND sc.campaign_id IS NOT NULL   -- Exclude rows with no campaign_id
    ORDER BY 
      rm.from_phone_number, rm.message_body, rm.date_received DESC;  -- Ensure the order matches DISTINCT ON columns
  `;

    // Execute the query with the email to filter the phone numbers
    const { rows } = await client.query(query, [email.trim()]);

    // Respond with the fetched data
    res.status(200).json({
      success: true,
      messages: rows,
    });
  } catch (err) {
    console.error("Error fetching received messages:", err);

    // Handle server errors
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching received messages.",
    });
  }
});
app.get("/api/check-role", async (req, res) => {
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
});
app.post("/api/create-user", async (req, res) => {
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
});
app.post("/api/triggerReplySms", async (req, res) => {
  const { phone, message, campaignId, userEmail } = req.body; // Expect campaignId and userEmail to be passed

  // console.log('Received request:', req.body);  // Log the full incoming request body

  if (!phone || !message || !campaignId || !userEmail) {
    console.log("Missing fields:", { phone, message, campaignId, userEmail });
    return res.status(400).json({
      message: "Phone, message, campaign ID, and user email are required.",
    });
  }

  try {
    // Format the phone number by removing the country code if present
    let cleanedPhone = phone.replace(/\s+/g, ""); // Remove spaces if any
    const countryCode = phone.slice(0, 2) === "+1" ? "+1" : ""; // Assuming +1 for US, adjust for other countries
    if (cleanedPhone.startsWith(countryCode)) {
      cleanedPhone = cleanedPhone.slice(countryCode.length); // Remove country code part
    }

    console.log(`Original phone: ${phone}`);
    console.log(`Cleaned phone: ${cleanedPhone}`);

    // Simplified query to check both cleaned phone and full phone
    const contactQuery = `
      SELECT name 
      FROM contacts 
      WHERE phone = $1  -- Check for cleaned phone number without +1
         OR phone = $2;  -- Check for full phone number with +1
    `;

    // Execute query with cleaned phone and full phone
    const contactResult = await client.query(contactQuery, [
      cleanedPhone,
      phone,
    ]);

    if (contactResult.rows.length === 0) {
      console.log(`Contact not found for phone: ${cleanedPhone} or ${phone}`);
      return res.status(404).json({ message: "Contact not found." });
    }

    const contactName = contactResult.rows[0].name;
    console.log(`Contact name found: ${contactName}`); // Log the contact name found

    // Create a personalized message
    const personalizedMessage = message.replace("[Name]", contactName);
    console.log(`Personalized message: ${personalizedMessage}`); // Log the personalized message

    // Send SMS using Twilio
    const messageResult = await twilioClient.messages.create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: personalizedMessage,
    });

    console.log(`SMS sent to ${phone}: ${messageResult.sid}`); // Log the successful SMS sending

    // Insert SMS details into the sent_campaign_sms table
    const insertQuery = `
      INSERT INTO sent_campaign_sms (
        campaign_id, email, phone, message_sid, message, "from", sent_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      campaignId, // Campaign ID
      userEmail, // User email (from frontend)
      phone, // Phone number
      messageResult.sid, // Message SID from Twilio
      personalizedMessage, // The personalized message
      process.env.TWILIO_PHONE_NUMBER, // The Twilio phone number used to send the SMS
      new Date().toISOString(), // Sent time
    ];

    await client.query(insertQuery, values);

    console.log(`SMS details stored for ${phone}`);

    res
      .status(200)
      .json({ success: true, message: "Reply SMS sent successfully." });
  } catch (err) {
    console.error("Error sending reply SMS:", err); // Log any error
    res.status(500).json({ message: "Error sending reply SMS." });
  }
});
app.get("/api/get-role", async (req, res) => {
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
});
app.get("/api/target-time", async (req, res) => {
  try {
    // Fetch campaigns from the database (replace this with actual query logic)
    const campaigns = await client.query(
      "SELECT campaign_id, selected_numbers, created_at FROM campaigns"
    );

    // Get current date and time
    const currentDateTime = new Date().getTime();

    // Filter out campaigns that are in the past
    const futureCampaigns = campaigns.rows.filter((campaign) => {
      const campaignDateTime = new Date(campaign.created_at).getTime();
      return campaignDateTime > currentDateTime; // Only consider future campaigns
    });

    if (futureCampaigns.length === 0) {
      return res.status(404).json({ message: "No upcoming campaign found." });
    }

    // Find the campaign with the closest created_at timestamp (the nearest future campaign)
    let closestCampaign = futureCampaigns[0];
    let closestTimeDifference = Infinity;

    futureCampaigns.forEach((campaign) => {
      const campaignDateTime = new Date(campaign.created_at).getTime();
      const timeDifference = campaignDateTime - currentDateTime;

      // If this campaign has a closer created_at timestamp, update closestCampaign
      if (timeDifference < closestTimeDifference) {
        closestCampaign = campaign;
        closestTimeDifference = timeDifference;
      }
    });

    // If a closest future campaign is found, return the created_at as target date and time
    const targetDate = new Date(closestCampaign.created_at)
      .toISOString()
      .split("T")[0]; // Format as YYYY-MM-DD
    const targetTime = new Date(closestCampaign.created_at)
      .toTimeString()
      .split(" ")[0]; // Format as HH:mm:ss

    // Fetch contacts associated with the closest campaign and include the campaignId
    const contacts = closestCampaign.selected_numbers;

    // Return target date, target time, campaignId, and contacts
    res.json({
      targetDate: targetDate,
      targetTime: targetTime,
      campaignId: closestCampaign.campaign_id, // Returning the campaignId
      contacts: contacts, // Returning the associated contacts
    });
  } catch (error) {
    console.error("Error fetching target date and time:", error);
    res.status(500).json({ message: "Error fetching target date and time." });
  }
});
app.post("/api/trigger-notification", async (req, res) => {
  const { campaignId, contacts, userEmail } = req.body;

  // console.log('Received request:', req.body);  // Log the full incoming request body

  if (
    !campaignId ||
    !Array.isArray(contacts) ||
    contacts.length === 0 ||
    !userEmail
  ) {
    return res
      .status(400)
      .json({ message: "Campaign ID, contacts, and user email are required." });
  }

  try {
    // Fetch the message template for the campaign
    const campaignMessageQuery =
      "SELECT message FROM campaign_messages WHERE campaign_id = $1";
    const result = await client.query(campaignMessageQuery, [campaignId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No message found for the campaign." });
    }

    const messageTemplate = result.rows[0].message;
    console.log(`Message Template: ${messageTemplate}`); // Log the fetched message template

    // Iterate through the contacts and send SMS
    const sendSmsPromises = contacts.map(async (contact, index) => {
      let { country_code, phone } = contact;

      console.log(`Processing contact ${index + 1}:`, contact); // Log each contact before processing

      // Ensure the country code has '+' at the start (for formatting purposes only)
      if (!country_code.startsWith("+")) {
        country_code = `+${country_code}`;
      }

      // Clean the phone number to remove any spaces or country code part
      phone = phone.replace(/\s+/g, ""); // Remove spaces if any
      if (phone.startsWith(country_code)) {
        phone = phone.slice(country_code.length); // Remove country code from the phone number if present
      }

      console.log(`Cleaned phone number: ${phone}`); // Log the cleaned phone number

      // Construct the full phone number by combining country code and phone number
      const fullPhoneNumber = `${country_code}${phone}`;
      console.log(`Full phone number: ${fullPhoneNumber}`); // Log the full phone number

      // Query for the contact name using only the phone number (no country code)
      const contactQuery = "SELECT name FROM contacts WHERE phone = $1";
      const contactResult = await client.query(contactQuery, [phone]);

      if (contactResult.rows.length === 0) {
        console.log(`Contact not found: ${fullPhoneNumber}`); // Log when contact is not found
        return; // Skip if contact is not found
      }

      const contactName = contactResult.rows[0].name;
      console.log(`Contact name found: ${contactName}`); // Log the contact name found

      const personalizedMessage = messageTemplate.replace(
        "[Name]",
        contactName
      );
      console.log(`Personalized message: ${personalizedMessage}`); // Log the personalized message

      try {
        const message = await twilioClient.messages.create({
          to: fullPhoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: personalizedMessage,
        });

        console.log(`SMS sent to ${fullPhoneNumber}: ${message.sid}`); // Log the successful SMS sending

        // Insert SMS details into the sent_campaign_sms table
        const insertQuery = `
          INSERT INTO sent_campaign_sms (
            campaign_id, email, phone, message_sid, message, "from", sent_at
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
          campaignId,
          userEmail,
          fullPhoneNumber,
          message.sid,
          personalizedMessage,
          process.env.TWILIO_PHONE_NUMBER, // The Twilio phone number used to send the SMS
          new Date().toISOString(),
        ];

        await client.query(insertQuery, values);

        console.log(`SMS details stored for ${fullPhoneNumber}`);
      } catch (err) {
        console.error(`Failed to send SMS to ${fullPhoneNumber}:`, err); // Log any error during SMS sending
      }
    });

    await Promise.all(sendSmsPromises);
    res.status(200).json({ message: "Campaign triggered successfully." });
  } catch (error) {
    console.error("Error triggering campaign:", error); // Log any error in the API processing
    res.status(500).json({ message: "Error triggering campaign." });
  }
});
app.get("/api/get-email-by-campaign", async (req, res) => {
  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ message: "Campaign ID is required." });
  }

  try {
    // Query the database to get the email associated with the campaign ID
    const query = "SELECT email FROM campaigns WHERE campaign_id = $1";
    const result = await client.query(query, [campaignId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    // Return the email found in the campaign record
    const email = result.rows[0].email;
    res.json({ email });
  } catch (error) {
    console.error("Error fetching email for campaign:", error);
    res.status(500).json({ message: "Error fetching email for campaign." });
  }
});

app.get("/metrics/charts", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM sms_metrics ORDER BY fetched_at DESC LIMIT 30"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching chart data:", err);
    res.status(500).send("Error fetching chart data");
  }
});

// Endpoint to fetch metrics from the database

app.get("/metrics", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM sms_metrics ORDER BY fetched_at DESC LIMIT 1"
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No metrics found" });
    }
    res.json(result.rows[0]); // Return the most recent metrics
  } catch (error) {
    console.error("Error fetching metrics from DB:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/sms", async (req, res) => {
  try {
    const messages = await twilioClient.messages.list({ limit: 10 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching SMS messages" });
  }
});

app.get("/api/sms/received-count", async (req, res) => {
  try {
    // Fetch all messages sent to your Twilio phone number
    const messages = await twilioClient.messages.list({
      to: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
    });

    if (!messages || messages.length === 0) {
      return res.json({ totalReceived: 0 }); // No received SMS found
    }

    // Filter for inbound (received) messages
    const receivedSms = messages.filter(
      (message) => message.direction === "inbound"
    );

    // Count the total received SMS
    const totalReceived = receivedSms.length;

    res.json({ totalReceived });
  } catch (error) {
    console.error("Error fetching received SMS from Twilio:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch received SMS count from Twilio" });
  }
});


app.get("/sms/metrics", async (req, res) => {
  try {
    console.log("Fetching organization details...");
    const { rows: organizations } = await client.query(
      "SELECT org_name, twilio_phone_number FROM twilio_numbers"
    );

    if (organizations.length === 0) {
      return res.status(404).json({ message: "No organizations found" });
    }

    const SMS_PER_SECOND = 10; // const value

    // Fetch messages for all organizations in parallel
    const metricsPromises = organizations.map(async (org) => {
      console.log(`Fetching SMS data for ${org.org_name}...`);
      let outboundMessages = [];
      let inboundMessages = [];
      let pageToken = null;

      // Fetch OUTBOUND messages (sent by the org)
      do {
        const page = await twilioClient.messages.list({
          from: org.twilio_phone_number, // ✅ Fetch outbound (sent) messages
          pageSize: 1000,
          pageToken,
        });
        outboundMessages = outboundMessages.concat(page);
        pageToken = page.nextPageToken;
      } while (pageToken);

      // Fetch INBOUND messages (received by the org)
      pageToken = null;
      do {
        const page = await twilioClient.messages.list({
          to: org.twilio_phone_number, // ✅ Fetch inbound (received) messages
          pageSize: 1000,
          pageToken,
        });
        inboundMessages = inboundMessages.concat(page);
        pageToken = page.nextPageToken;
      } while (pageToken);

      console.log(
        `Org: ${org.org_name}, Outbound: ${outboundMessages.length}, Inbound: ${inboundMessages.length}`
      );

      if (outboundMessages.length === 0 && inboundMessages.length === 0)
        return null; // Skip if no messages

      // Calculate metrics
      const totalSent = outboundMessages.length;
      const totalReceived = inboundMessages.length;
      const deliveredMessages = outboundMessages.filter((msg) =>
        ["delivered", "sent"].includes(msg.status?.toLowerCase())
      ).length;
      const successRate =
        totalSent > 0 ? (deliveredMessages / totalSent) * 100 : 0;
      const totalCost = outboundMessages.reduce(
        (sum, msg) => sum + (msg.price ? Math.abs(parseFloat(msg.price)) : 0),
        0
      );
      const costPerSms = totalSent > 0 ? totalCost / totalSent : 0;

      // ✅ FIX: Correctly Calculate SMS per Second
      const smsPerSecond = SMS_PER_SECOND;

      return {
        org_name: org.org_name,
        twilio_phone_number: org.twilio_phone_number,
        total_sent: totalSent,
        total_received: totalReceived, // ✅ Now correctly counted
        total_cost: totalCost.toFixed(4),
        cost_per_sms: costPerSms.toFixed(4),
        sms_per_second: smsPerSecond.toFixed(2),
        success_rate: successRate.toFixed(2),
      };
    });

    // Wait for all organizations to be processed
    const metrics = await Promise.all(metricsPromises);
    const validMetrics = metrics.filter((m) => m !== null); // Remove skipped orgs

    if (validMetrics.length === 0) {
      return res.json({ message: "No valid metrics to store" });
    }

    // Batch insert/update in a single query
    const values = validMetrics
      .map(
        (m) =>
          `('${m.org_name}', '${m.twilio_phone_number}', ${m.total_sent}, ${m.total_received}, ${m.total_cost}, ${m.cost_per_sms}, ${m.sms_per_second}, ${m.success_rate}, NOW())`
      )
      .join(", ");

    const query = `
      INSERT INTO sms_metrics_storing (org_name, twilio_phone_number, total_sent, total_received, total_cost, cost_per_sms, sms_per_second, success_rate, last_updated)
      VALUES ${values}
      ON CONFLICT (org_name, twilio_phone_number) DO UPDATE
      SET total_sent = EXCLUDED.total_sent, total_received = EXCLUDED.total_received, total_cost = EXCLUDED.total_cost, 
          cost_per_sms = EXCLUDED.cost_per_sms, sms_per_second = EXCLUDED.sms_per_second, success_rate = EXCLUDED.success_rate, last_updated = NOW();
    `;

    await client.query(query);
    console.log(`Metrics updated for ${validMetrics.length} organizations`);

    res.json({ message: "Metrics stored successfully" });
  } catch (error) {
    console.error("Error storing SMS metrics:", error);
    res.status(500).json({ error: "Failed to store SMS metrics" });
  }
});

//reset password
app.post("/api/reset-password", async (req, res) => {
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
});

//photo upload

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload Profile Photo API
app.post(
  "/api/upload-photo/:username",
  upload.single("photo"),
  async (req, res) => {
    const username = req.params.username;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = `/uploads/${req.file.filename}`;

    try {
      const result = await client.query(
        "UPDATE users SET profile_url = $1 WHERE username = $2 RETURNING *",
        [filePath, username]
      );
      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
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
  }
);

// Get User Profile API
app.get("/api/user/:username", async (req, res) => {
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
});
app.get("/api/get-org-name", async (req, res) => {
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
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

