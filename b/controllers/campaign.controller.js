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

//Create Campaign
const createCampaign = async (req, res) => {
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
};

// get campaign by id
const getCampaignByEmail = async (req, res) => {
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
};

//get campaign
const getCampaign = async (req, res) => {
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
};

//update campaign

const updateCampaign = async (req, res) => {
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
};


//get campaign details

const getCampaignDetails = async(req,res)=>{
    
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

}

//target-time

const campaignTargetTime = async(req,res)=>{
    
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

}

//email by campaign

const getEmailByCamp = async(req,res)=>{
  
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

}

//update campaign numbers

const updateCampaignNumbers = async(req,res)=>{
  
  const { campaignId } = req.params;
  const { selectedNumbers, email } = req.body;

  // Check if the email is provided
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Update the selected_numbers field for the campaign matching the campaignId and email
    const result = await client.query(
      `UPDATE campaigns 
       SET selected_numbers = $1 
       WHERE campaign_id = $2 AND email = $3 
       RETURNING *`,
      [selectedNumbers, campaignId, email]
    );

    // If no rows were updated, the campaign may not exist or does not belong to this user
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    res.status(200).json({
      message: "Campaign numbers updated successfully!",
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating campaign numbers:", error);
    res.status(500).json({ message: "Error updating campaign numbers." });
  }

}


//delete campaign
const deleteCampaign = async (req, res) => {
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
};

//update schedule

const updateCampaignSchedule = async(req,res)=>{
  
  const { campaignId } = req.params;
  const { scheduleDatetime, email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const result = await client.query(
      `UPDATE campaigns 
       SET created_at = $1 
       WHERE campaign_id = $2 AND email = $3 
       RETURNING *`,
      [scheduleDatetime, campaignId, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    res.status(200).json({
      message: "Campaign schedule updated successfully!",
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating campaign schedule:", error);
    res.status(500).json({ message: "Error updating campaign schedule." });
  }

}

//get campaign message

const getCampaignMessage = async(req,res) =>{
  
  const { campaignId } = req.params;
  try {
    const result = await client.query(
      `SELECT message FROM campaign_messages WHERE campaign_id = $1;`,
      [campaignId]
    );
    if (result.rows.length > 0) {
      res.json({ message: result.rows[0].message });
    } else {
      res.json({ message: "" });
    }
  } catch (error) {
    console.error("Error fetching campaign message:", error);
    res.status(500).json({ error: "Failed to fetch campaign message" });
  }

}

//update campaign message

const updateCampaignMessage = async(req,res) =>{
  
  const { campaignId } = req.params;
  const { message, email } = req.body; // email can be used for authorization if needed
  try {
    const result = await client.query(
      `INSERT INTO campaign_messages (campaign_id, message)
       VALUES ($1, $2)
       ON CONFLICT (campaign_id)
       DO UPDATE SET message = EXCLUDED.message
       RETURNING id;`,
      [campaignId, message]
    );
    res.json({ message: "Campaign message updated successfully", id: result.rows[0].id });
  } catch (error) {
    console.error("Error updating campaign message:", error);
    res.status(500).json({ error: "Failed to update campaign message" });
  }

}


module.exports = {
  createCampaign,
  getCampaignByEmail,
  getCampaign,
  getCampaignDetails,
  getEmailByCamp,
  getCampaignMessage,
  campaignTargetTime,
  updateCampaign,
  updateCampaignNumbers,
  updateCampaignSchedule,
  updateCampaignMessage,
  deleteCampaign,
};
