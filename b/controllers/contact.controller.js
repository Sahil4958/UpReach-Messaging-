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



  //create contact

  const createContact = async(req,res) =>{
    
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

  }


  //get contacts
const getContacts = async(req,res) =>{
    
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

}


//get contacts by name

const getContactsByName = async(req,res) =>{
    
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

}

//upload via excel
const contactUpload = async(req,res) =>{

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
  
}
  module.exports = {createContact,getContacts,getContactsByName,contactUpload}