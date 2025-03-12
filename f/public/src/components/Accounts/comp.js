import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import config from '../config'; // Import the config

const Comp = () => {
  const [notification, setNotification] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState('');
  const [contacts, setContacts] = useState([]);

  // Fetch the target date and time from the database initially
  const fetchTargetTime = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/target-time`);
      console.log("API Response:", response.data); // Log the response for debugging
      setTargetDate(response.data.targetDate);
      setTargetTime(response.data.targetTime);
      setCampaignId(response.data.campaignId);
      setContacts(response.data.contacts); // Correctly set contacts here
      setLoading(false);
    } catch (error) {
      console.error('Error fetching target date and time:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargetTime(); // Initial fetch
    const interval = setInterval(fetchTargetTime, 30000); // Fetch target-time every 30 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []); // Empty dependency array ensures it only runs once on mount

  // Notification and API trigger logic
  useEffect(() => {
    if (!targetDate || !targetTime || !Array.isArray(contacts) || contacts.length === 0) {
      console.error('No valid contacts available.');
      return; // Early exit if target date, time, or contacts are invalid
    }

    const interval = setInterval(async () => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().split(' ')[0]; // HH:mm:ss format

      console.log(`Checking time: ${currentDate} ${currentTime}`); // Log the current date and time

      // Check if both the current date and time match the target
      if (currentDate === targetDate && currentTime === targetTime) {
        setNotification('It’s time for your notification!');

        // Trigger the API call at the target date and time
        try {
          const userEmail = localStorage.getItem('userEmail'); 

          if (!userEmail) {
            console.error('User email not found in localStorage.');
            return;
          }

          // Log contacts to verify format
          console.log("Contacts data:", contacts);

          // Map contacts correctly based on the data format
          const formattedContacts = contacts.map((contact) => {
            const [country_code, phone] = contact.split(' ');
            return { country_code, phone };
          });

          console.log("Formatted Contacts:", formattedContacts); // Log the formatted contacts

          const payload = {
            campaignId: campaignId,
            contacts: formattedContacts,
            userEmail: userEmail,
          };

          console.log("Payload:", payload); // Log the payload before sending

          // Make the POST request to the API with the payload
          await axios.post(`${config.apiBaseUrl}/api/trigger-notification`, payload); // Replace with your actual API endpoint
          console.log('Payload sent successfully');
        } catch (error) {
          console.error('Error sending payload:', error);
        }
      }
    }, 1000); // Check every second (to get a more precise match)

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [targetDate, targetTime, campaignId, contacts]);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {notification && <div className="notification">{notification}</div>}
        </>
      )}
    </div>
  );
};

export default Comp;
