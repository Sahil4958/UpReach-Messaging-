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


const uploadContacts = async (req, res) => {
  console.log("Upload contacts request received");

  try {
    const userEmail = req.user?.email;
    const { contacts } = req.body;

    if (!userEmail) {
      return res
        .status(400)
        .json({ message: "User email is missing from the request." });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: "Contacts array is required." });
    }

    // Fetch user details (uploaded_contacts, user_role)
    const userQuery =
      "SELECT uploaded_contacts, user_role FROM users WHERE email = $1";
    const userResult = await client.query(userQuery, [userEmail]);

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found in the database." });
    }

    const { uploaded_contacts: uploadedContacts, user_role: userRole } =
      userResult.rows[0];

    const maxLimit = 10;
    const availableSlots = maxLimit - uploadedContacts;

    console.log(
      `Uploaded Contacts: ${uploadedContacts}, Available Slots: ${availableSlots}, Contacts Being Uploaded: ${contacts.length}`
    );

    // If Guest User & No slots left, return error message
    if (userRole === "Guest User" && availableSlots <= 0) {
      return res.status(403).json({
        message: "Upload limit exceeded. You cannot upload more contacts.",
      });
    }

    // Limit contacts to available slots for Guest User
    const contactsToUpload =
      userRole === "Guest User" ? contacts.slice(0, availableSlots) : contacts;
    console.log("✅ Contacts to Upload:", contactsToUpload.length);

    // Update uploaded_contacts count in users table

    // await client.query(
    //   "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
    //   [contactsToUpload.length, userEmail]
    // );

    if (contactsToUpload.length > 0) {
      // Update uploaded_contacts count based on actual number uploaded
      await client.query(
        "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
        [contactsToUpload.length, userEmail]
      );
    }

    // Return success message with warning only if some contacts were skipped
    if (userRole === "Guest User" && contacts.length > availableSlots) {
      return res.status(200).json({
        message: `Only ${availableSlots} contacts were uploaded. The remaining contacts were skipped due to the limit.`,
        uploadedContacts: uploadedContacts + contactsToUpload.length,
      });
    }

    return res.status(200).json({
      message: "Contacts uploaded successfully.",
      uploadedContacts: uploadedContacts + contactsToUpload.length,
    });
  } catch (error) {
    console.error("❌ Error uploading contacts:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while uploading contacts." });
  }
};

const uploadForm = async (req, res) => {
  console.log("Upload form req received");

  try {
    const userEmail = req.user?.email;
    const { contacts } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required." });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: "Contacts array is required." });
    }

    // Fetch user details (uploaded_contacts & user_role)
    const userQuery =
      "SELECT uploaded_contacts, user_role FROM users WHERE email = $1";
    const userResult = await client.query(userQuery, [userEmail]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const { uploaded_contacts: uploadedContacts, user_role: userRole } =
      userResult.rows[0];

    let maxLimit = 10;
    let availableSlots = maxLimit - uploadedContacts;

    // If Guest User & No slots left, return error message
    if (userRole === "Guest User" && availableSlots <= 0) {
      return res.status(400).json({
        message: "Limit reached: Max 10 contacts allowed for Guest users.",
      });
    }

    // Limit contacts to available slots for Guest User
    const contactsToUpload =
      userRole === "Guest User" ? contacts.slice(0, availableSlots) : contacts;

    console.log("✅ Contacts to Upload:", contactsToUpload.length);

    // Update uploaded_contacts count in users table
    await client.query(
      "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
      [contactsToUpload.length, userEmail]
    );

    // If Guest User & added contacts are limited, show available slots message
    if (userRole === "Guest User" && contacts.length > availableSlots) {
      return res.status(400).json({
        message: `You can only add ${availableSlots} more contacts.`,
      });
    }

    return res.status(201).json({
      message: "Contacts processed successfully!",
      uploadedContacts: uploadedContacts + contactsToUpload.length,
    });
  } catch (error) {
    console.error("❌ Error updating contact limit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userDetails = async (req, res) => {
  const userEmail = req.user.email;

  try {
    const { rows } = await client.query(
      `SELECT email, username, user_role, profile_url, org_name, trial_end_date,
              contacts_limit, uploaded_contacts, sms_limit, sent_sms
       FROM users
       WHERE email = $1`,
      [userEmail]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ message: "Here is the user's details", user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Error fetching user details." });
  }
};

module.exports = { uploadContacts, userDetails, uploadForm };
