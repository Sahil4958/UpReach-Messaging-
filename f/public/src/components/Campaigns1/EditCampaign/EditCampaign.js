import React, { useState, useEffect } from "react"; 
import axios from "axios";
import config from "../../config"; // Import your config for the API base URL
import styles from "./EditCampaign.module.css"; // Assuming you're using CSS Modules

const EditCampaign = ({ campaignId }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || "");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]); // Holds the selected phone numbers
  const [scheduleDate, setScheduleDate] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupStatus, setPopupStatus] = useState("");
  const [userEmail, setUserEmail] = useState(""); // To store user email

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
          headers: { "x-user-email": userEmail }, // Passing the email in the request header
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

  // Fetch details of the selected campaign
  useEffect(() => {
    if (selectedCampaign) {
      const fetchCampaignDetails = async () => {
        try {
          const response = await axios.get(`${config.apiBaseUrl}/api/campaignDetails`, {
            params: { campaignId: selectedCampaign },
            headers: { "user-email": userEmail },
          });

          console.log("Campaign Details Response:", response.data);

          // Transform the response into a customers array
          const transformedCustomers = response.data.customerNames.map((customerName, index) => ({
            name: customerName,
            contactName: response.data.contactNames[index],
            phone: response.data.selectedNumbers[index],
            countryCode: response.data.countryCodes[index],
            normalizedCampaignNumber: response.data.normalizedCampaignNumbers[index],
            normalizedContactPhone: response.data.normalizedContactPhones[index],
          }));

          // Set the transformed customers data
          setCustomers(transformedCustomers);
          setSelectedCustomers(response.data.selectedNumbers || []); // Initialize selected customers with the data from the API
          setScheduleDate(response.data.scheduleDatetime || "");

        } catch (error) {
          console.error("Error fetching campaign details:", error);
        }
      };

      fetchCampaignDetails();
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

  // Submit the selected phone numbers to the backend
  const handleSubmitChanges = async () => {
    try {
      await axios.put(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}/selectNumbers`,  // Endpoint for updating selected numbers
        { selectedNumbers: selectedCustomers, email: userEmail },  // Send the updated list and user email
        {
          headers: { "user-email": userEmail }, // Pass email in the request header
        }
      );
      setPopupMessage("Campaign numbers updated successfully!");
      setPopupStatus("success");
      setShowPopup(true);
    } catch (error) {
      setPopupMessage("Failed to update campaign numbers.");
      setPopupStatus("error");
      setShowPopup(true);
    }
  };

  // Handle schedule date change
  const handleScheduleChange = (e) => {
    setScheduleDate(e.target.value);
  };

  // Handle campaign deletion
  const handleDeleteCampaign = async () => {
    try {
      const response = await axios.delete(
        `${config.apiBaseUrl}/api/campaigns/${selectedCampaign}`, 
        { 
          data: { email: userEmail }  // Send email in the body
        }
      );
      
      // Remove the deleted campaign from the state
      setCampaigns(prevCampaigns => prevCampaigns.filter(campaign => campaign.campaign_id !== selectedCampaign));
  
      setPopupMessage(response.data.message);
      setPopupStatus('success');
      setShowPopup(true);
      setSelectedCampaign(""); // Clear the selected campaign after deletion
    } catch (error) {
      setPopupMessage('Failed to delete campaign.');
      setPopupStatus('error');
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
            <h3 className={styles.customersListHeader}>Customers</h3>
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
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={handleScheduleChange}
              className={styles.scheduleInput}
            />
          </div>

          <div className={styles.actionsContainer}>
            <button
              onClick={handleSubmitChanges}
              className={styles.saveChangesButton}
            >
              Save Changes
            </button>
            <button
              onClick={handleDeleteCampaign}
              className={styles.deleteCampaignButton}
            >
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