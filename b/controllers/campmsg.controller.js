const { Client } = require("pg");
const dotenv = require("dotenv");
const moment = require("moment");
const Twilio = require("twilio");
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

// create message

const createMessage = async (req, res) => {
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
};

//template-category

const getTempCategories = async (req, res) => {
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
};
//get messages

const getMessages = async (req, res) => {
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
};

const triggerCampaign = async (req, res) => {
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
};

//get received message

const getReceivedMessages = async (req, res) => {
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
};

//get sent camp sms

const getSentCampSms = async (req, res) => {
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
};

//get msg by id

const getReceivedMessagesById = async (req, res) => {
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
};

//trigger sms reply

const triggerSmsReply = async(req,res)=>{
    
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

}

const triggerNotification = async(req,res)=>{
    
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

}



module.exports = {
  createMessage,
  getTempCategories,
  getMessages,
  triggerCampaign,
  triggerSmsReply ,
  triggerNotification,
  getReceivedMessages,
  getReceivedMessagesById,
  getSentCampSms,
};
