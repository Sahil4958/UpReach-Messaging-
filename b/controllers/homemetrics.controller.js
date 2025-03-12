
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


const homeMetrics = async (req, res) => {
    try {
      // Retrieve the organization name from the request headers
      const orgName = req.headers["x-org-name"];
      if (!orgName) {
        return res.status(400).json({ message: "Missing org_name in headers" });
      }
  
      // Query the most recent metrics record for the given organization
      const result = await client.query(
        `SELECT * FROM public.twilio_sms_metrics 
         WHERE org_name = $1 
         ORDER BY fetched_at DESC 
         LIMIT 1`,
        [orgName]
      );
  
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "No metrics found for the given organization" });
      }
  
      const metrics = result.rows[0];
  
      // Return the metrics in camelCase format for the frontend
      res.status(200).json({
        totalSmsSent: metrics.total_sms_sent,
        deliveryRate: metrics.delivery_rate,
        failedMessages: metrics.failed_messages,
        totalCost: metrics.total_cost_usd,
        smsPerSecond: metrics.sms_per_second,
        latency: metrics.latency_ms,
        throughput: metrics.throughput,
        totalSmsReceived: metrics.total_sms_received,
        timeToSendSms: metrics.time_to_send_sms,
      });
    } catch (error) {
      console.error("Error fetching home metrics:", error);
      res
        .status(500)
        .json({ message: "An error occurred fetching home metrics" });
    }
  };

  module.exports = {homeMetrics}