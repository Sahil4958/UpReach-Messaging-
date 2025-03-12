require('dotenv').config();
const { Client } = require('pg');
const Twilio = require('twilio');
const cron = require('node-cron');

// Initialize PostgreSQL client
const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});


// Initialize Twilio client
const clientTwilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Connect to PostgreSQL database
client.connect()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));

// Function to calculate time, latency, SMS per second, and throughput using predefined details
const calculateMetrics = async () => {
  // Predefined details for metrics
  const timeToSend = 0.394;  // Time to send SMS in seconds
  const latency = -1.000;    // Simulated latency in seconds
  const smsPerSecond = 10;   // Simulated throughput: 10 SMS per second
  const throughput = 10;     // Simulated throughput

  console.log(`Time to send SMS: ${timeToSend.toFixed(3)}s`);
  console.log(`Latency: ${latency.toFixed(3)}s`);
  console.log(`SMS Sent Per Second: ${smsPerSecond}`);
  console.log(`Throughput: ${throughput}`);

  return { timeToSend, latency, smsPerSecond, throughput };
};

// Function to get detailed usage data from Twilio (accurate usage)
const getTotalCharges = async () => {
  try {
    const usage = await clientTwilio.api.v2010.accounts(clientTwilio.accountSid).usage.records.list({
      category: 'sms',
      startDate: '2024-08-01',
      endDate: new Date().toISOString().split('T')[0],
    });

    if (usage && usage.length > 0) {
      const totalMoneySpent = usage.reduce((sum, record) => sum + parseFloat(record.price), 0);
      const totalSmsSent = usage.reduce((sum, record) => sum + parseInt(record.count), 0);
      const perSmsCost = totalSmsSent > 0 ? totalMoneySpent / totalSmsSent : 0;

      return { totalMoneySpent, totalSmsSent, perSmsCost };
    } else {
      console.log('No usage data found.');
      return { totalMoneySpent: 0, totalSmsSent: 0, perSmsCost: 0 };
    }
  } catch (error) {
    console.error('Error fetching total charges from Twilio:', error);
    return { totalMoneySpent: 0, totalSmsSent: 0, perSmsCost: 0 };
  }
};

// Function to insert metrics into the database
const insertMetrics = async () => {
  try {
    console.log('Fetching metrics from Twilio...');
    const { totalMoneySpent, totalSmsSent, perSmsCost } = await getTotalCharges();
    
    const failedMessages = 0;  // No message data needed
    const delivered = totalSmsSent;  // Assume all are delivered for simplicity
    const deliveryRate = totalSmsSent > 0 ? (delivered / totalSmsSent) * 100 : 0;
    const totalCost = totalMoneySpent;

    // Get metrics for time to send SMS, latency, SMS per second, and throughput
    const { timeToSend, latency, smsPerSecond, throughput } = await calculateMetrics();

    // Insert a new record with the latest metrics
    console.log('Inserting new metrics...');
    const metricsQuery = `
      INSERT INTO sms_metrics (total_sms_sent, delivery_rate, failed_messages, total_cost, per_sms_cost, 
        time_to_send_sms, sms_per_second, latency, throughput)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;
    `;
    const result = await client.query(metricsQuery, [
      totalSmsSent, 
      deliveryRate, 
      failedMessages, 
      totalCost, 
      perSmsCost,
      timeToSend,
      smsPerSecond,
      latency,
      throughput
    ]);
    console.log('New metrics inserted with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error inserting metrics:', error);
  }
};

// Endpoint to fetch metrics from the database
const fetchMetrics = async () => {
  try {
    const result = await client.query('SELECT * FROM sms_metrics ORDER BY fetched_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      console.log('No metrics found.');
    } else {
      console.log('Latest metrics:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error fetching metrics from DB:', error);
  }
};

// For debugging, manually call the insertMetrics function
insertMetrics();
fetchMetrics();
