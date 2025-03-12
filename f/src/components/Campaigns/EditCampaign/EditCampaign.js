import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import config from "../../config"; // API base URL
import styles from "./EditCampaign.module.css"; // CSS Modules

const EditCampaign = ({ campaignId }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || "");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]); // Holds the selected phone numbers
  const [scheduleDate, setScheduleDate] = useState(null);
  const [campaignMessage, setCampaignMessage] = useState(""); // State for campaign message
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupStatus, setPopupStatus] = useState("");
  const [userEmail, setUserEmail] = useState(""); // To store user email

  // Helper function to format a Date object into a PST-based string "YYYY-MM-DD HH:mm:ss"
  const formatDateForDB = (date) => {
    // Format date part using the en-CA locale to get YYYY-MM-DD format
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    
    // Format time part using en-GB locale to get HH:mm:ss in 24-hour format
    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const getPart = (parts, type) =>
      parts.find((part) => part.type === type)?.value || "";

    const formattedDate = `${getPart(dateParts, "year")}-${getPart(dateParts, "month")}-${getPart(dateParts, "day")}`;
    const formattedTime = `${getPart(timeParts, "hour")}:${getPart(timeParts, "minute")}:${getPart(timeParts, "second")}`;
    
    return `${formattedDate} ${formattedTime}`;
  };

  // Fetch the email of the logged-in user from localStorage
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      setUserEmail(email);
    }
  }, []);

  // Fetch the campaigns when the component mounts
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/campaigns1`, {
          headers: { "x-user-email": userEmail },
        });
        setCampaigns(response.data.campaigns);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };
    if (userEmail) {
      fetchCampaigns();
    }
  }, [userEmail]);

  // Fetch details of the selected campaign, including its saved message
  useEffect(() => {
    if (selectedCampaign) {
      const fetchCampaignDetails = async () => {
        try {
          const response = await axios.get(`${config.apiBaseUrl}/api/campaignDetails`, {
            params: { campaignId: selectedCampaign },
            headers: { "user-email": userEmail },
          });

          console.log("Campaign Details Response:", response.data);

          const transformedCustomers = response.data.customerNames.map((customerName, index) => ({
            name: customerName,
            contactName: response.data.contactNames[index],
            phone: response.data.selectedNumbers[index],
            countryCode: response.data.countryCodes[index],
            normalizedCampaignNumber: response.data.normalizedCampaignNumbers[index],
            normalizedContactPhone: response.data.normalizedContactPhones[index],
          }));

          setCustomers(transformedCustomers);
          setSelectedCustomers(response.data.selectedNumbers || []);
          setScheduleDate(response.data.scheduleDatetime ? new Date(response.data.scheduleDatetime) : null);
        } catch (error) {
          console.error("Error fetching campaign details:", error);
        }
      };

      fetchCampaignDetails();

      // Fetch the saved campaign message
      const fetchCampaignMessage = async () => {
        try {
          const response = await axios.get(
            `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}/message`,
            { headers: { "user-email": userEmail } }
          );
          setCampaignMessage(response.data.message || "");
        } catch (error) {
          console.error("Error fetching campaign message:", error);
        }
      };
      fetchCampaignMessage();
    }
  }, [selectedCampaign, userEmail]);

  // Handle customer selection/deselection
  const handleCustomerSelection = (customerId, isSelected) => {
    setSelectedCustomers((prevState) => {
      if (isSelected) {
        return [...prevState, customerId];
      } else {
        return prevState.filter((id) => id !== customerId);
      }
    });
  };

  // Combine saving selected numbers, campaign message, and schedule changes
  const handleSaveAllChanges = async () => {
    try {
      // Update selected numbers
      await axios.put(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}/selectNumbers`,
        { selectedNumbers: selectedCustomers, email: userEmail },
        { headers: { "user-email": userEmail } }
      );
  
      // Update campaign message
      await axios.put(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}/message`,
        { message: campaignMessage, email: userEmail },
        { headers: { "user-email": userEmail } }
      );
      
      // Format the schedule date to PST "YYYY-MM-DD HH:mm:ss" before updating
      const formattedSchedule = scheduleDate ? formatDateForDB(scheduleDate) : null;
      
      // Update schedule date and time
      await axios.put(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}/schedule`,
        { scheduleDatetime: formattedSchedule, email: userEmail },
        { headers: { "user-email": userEmail } }
      );
  
      setPopupMessage("Campaign updated successfully!");
      setPopupStatus("success");
      setShowPopup(true);
    } catch (error) {
      console.error(
        "Error updating campaign:",
        error.response ? error.response.data : error.message
      );
      setPopupMessage("Failed to update campaign.");
      setPopupStatus("error");
      setShowPopup(true);
    }
  };

  // Handle schedule date change using react-datepicker
  const handleScheduleChange = (date) => {
    setScheduleDate(date);
  };

  // Handle campaign deletion
  const handleDeleteCampaign = async () => {
    try {
      const response = await axios.delete(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}`,
        { data: { email: userEmail } }
      );

      setCampaigns((prevCampaigns) =>
        prevCampaigns.filter((campaign) => campaign.campaign_id !== selectedCampaign)
      );

      setPopupMessage(response.data.message);
      setPopupStatus("success");
      setShowPopup(true);
      setSelectedCampaign("");
    } catch (error) {
      console.error("Error deleting campaign:", error.response ? error.response.data : error.message);
      setPopupMessage("Failed to delete campaign.");
      setPopupStatus("error");
      setShowPopup(true);
    }
  };

  // Close the popup
  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className={styles.editCampaignContainer}>
      <h2 className={styles.editCampaignHeader}>Edit Campaign</h2>

      <div className={styles.campaignDropdownContainer}>
        <label className={styles.campaignDropdownLabel}>Select Campaign:</label>
        <select
          onChange={(e) => setSelectedCampaign(e.target.value)}
          value={selectedCampaign}
          className={styles.campaignDropdownSelect}
        >
          <option value="">-- Select --</option>
          {campaigns.map((campaign) => (
            <option key={campaign.campaign_id} value={campaign.campaign_id}>
              {campaign.campaign_name}
            </option>
          ))}
        </select>
      </div>

      {selectedCampaign && (
        <>
          <div className={styles.customersTableContainer}>
            <h3 className={styles.customersListHeader}>Selected Contacts</h3>
            {customers.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.customersTable}>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Contact Name</th>
                      <th>Contact Number</th>
                      <th>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr key={index}>
                        <td>{customer.name}</td>
                        <td>{customer.contactName}</td>
                        <td>{customer.phone}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer.phone)}
                            onChange={(e) =>
                              handleCustomerSelection(customer.phone, e.target.checked)
                            }
                            className={styles.customerCheckbox}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noCustomers}>No customers found for this campaign</p>
            )}
          </div>

          <div className={styles.scheduleContainer}>
            <label className={styles.scheduleLabel}>Schedule Date and Time:</label>
            <DatePicker 
              selected={scheduleDate}
              onChange={handleScheduleChange}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              className={styles.scheduleInput}
              placeholderText="Select date and time"
              shouldCloseOnSelect={true}
            />
          </div>

          {/* Campaign Message Section */}
          <div className={styles.messageContainer}>
            <label className={styles.messageLabel}>Campaign Message:</label>
            <textarea 
              className={styles.messageInput}
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              placeholder="No message saved yet..."
              rows={4}
            />
          </div>

          <div className={styles.actionsContainer}>
            <button onClick={handleSaveAllChanges} className={styles.saveChangesButton}>
              Save Changes
            </button>
            <button onClick={handleDeleteCampaign} className={styles.deleteCampaignButton}>
              Delete Campaign
            </button>
          </div>
        </>
      )}

      {showPopup && (
        <div
          className={`${styles.popup} ${
            popupStatus === "success" ? styles.popupSuccess : styles.popupError
          }`}
        >
          <p className={styles.popupMessage}>{popupMessage}</p>
          <button onClick={handleClosePopup} className={styles.popupCloseButton}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default EditCampaign;
