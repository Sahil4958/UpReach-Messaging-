const { Client } = require("pg");
const Twilio = require("twilio");
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

// Initialize Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const getChartData = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM sms_metrics ORDER BY fetched_at DESC LIMIT 30"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching chart data:", err);
    res.status(500).send("Error fetching chart data");
  }
};

const getMetrics = async (req, res) => {
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
};

//get sms

const getSms = async (req, res) => {
  try {
    const messages = await twilioClient.messages.list({ limit: 10 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching SMS messages" });
  }
};

const getSmsCount = async (req, res) => {
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
};

//direct fetch from twilio

const fetchFromTwilio = async (req, res) => {
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
};



module.exports = {
  getChartData,
  getMetrics,
  getSms,
  getSmsCount,
  fetchFromTwilio,
 
};
