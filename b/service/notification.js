const axios = require("axios");
const config = require("../config");

// State variables to store fetched data
let notification = "";
let targetDate = "";
let targetTime = "";
let campaignId = "";
let contacts = [];
let loading = true;

// Fetch the target date and time
const fetchTargetTime = async () => {
  try {
    console.log("API Base URL:", config.apiBaseUrl); // Debugging
    const response = await axios.get(`${config.apiBaseUrl}/api/target-time`);
    console.log("API Response:", response.data);

    targetDate = response.data.targetDate;
    targetTime = response.data.targetTime;
    campaignId = response.data.campaignId;
    contacts = response.data.contacts;
    loading = false;
  } catch (error) {
    loading = false;
  }
};

// Trigger notification logic
const checkAndTriggerNotification = async () => {
  if (
    !targetDate ||
    !targetTime ||
    !Array.isArray(contacts) ||
    contacts.length === 0
  ) {
    return;
  }

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format
  const currentTime = now.toTimeString().split(" ")[0]; // HH:mm:ss format

  if (currentDate === targetDate && currentTime === targetTime) {
    notification = "It’s time for your notification!";
    console.log(notification);

    try {
      // Fetch email from the new API based on campaignId
      const response = await axios.get(
        `${config.apiBaseUrl}/api/get-email-by-campaign`,
        {
          params: { campaignId },
        }
      );

      const userEmail = response.data.email;
      if (!userEmail) {
        console.error("User email not found.");
        return;
      }

      // Format contacts
      const formattedContacts = contacts.map((contact) => {
        const [country_code, phone] = contact.split(" ");
        return { country_code, phone };
      });

      const payload = {
        campaignId,
        contacts: formattedContacts,
        userEmail,
      };

      console.log("Payload:", payload);

      await axios.post(
        `${config.apiBaseUrl}/api/trigger-notification`,
        payload
      );
      console.log("Payload sent successfully");
    } catch (error) {
      console.error("Error fetching email or sending payload:", error);
    }
  }
};

// Start periodic tasks
const startNotificationService = () => {
  // Initial fetch
  fetchTargetTime();

  // Fetch the target time every 30 seconds
  setInterval(fetchTargetTime, 30000);

  // Check for target time match every second
  setInterval(checkAndTriggerNotification, 1000);
};

// Export the function to start the service
module.exports = {
  startNotificationService,
  getState: () => ({
    notification,
    targetDate,
    targetTime,
    campaignId,
    contacts,
    loading,
  }),
};
