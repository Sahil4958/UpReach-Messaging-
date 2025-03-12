import React, { useState, useEffect } from "react";
import config from "../../config";
import styles from "./CampaignLogs.module.css"; // Import the CSS Module

const ViewCampaignLog = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term

  useEffect(() => {
    // Retrieve userEmail from localStorage
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
      console.error("User email is not found in localStorage.");
      return;
    }

    // Fetching the campaigns from the API, passing the email as a query parameter
    fetch(`${config.apiBaseUrl}/api/campaigns1?email=${userEmail}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched campaigns:", data);
        setCampaigns(data.campaigns || []);
      })
      .catch((error) => console.error("Error fetching campaigns:", error));
  }, []);

  const handleCampaignSelect = (campaignId) => {
    // Toggle expand/collapse
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      setCampaignDetails([]);
    } else {
      setExpandedCampaignId(campaignId);

      // Fetch campaign details for the selected campaign
      fetch(`${config.apiBaseUrl}/api/campaignDetails?campaignId=${campaignId}`)
        .then((response) => response.json())
        .then((data) => {
          console.log("Fetched campaign details:", data);

          // Map the response data into a usable format for the table
          const contacts = data.selectedNumbers.map((number, index) => ({
            id: index,
            customerName: data.customerNames[index],
            contactName: data.contactNames[index],
            phone_number: number,
          }));

          setCampaignDetails(contacts);
        })
        .catch((error) => console.error("Error fetching campaign details:", error));
    }
  };

  // Function to determine the status of the campaign
  const getStatus = (scheduledDate) => {
    const currentTime = new Date().getTime();
    const scheduledTime = new Date(scheduledDate).getTime();
    return scheduledTime > currentTime ? "Pending" : "Triggered";
  };

// Function to format the scheduled date in Pacific Time (PST/PDT)
// Function to format the scheduled date in Pacific Time (PST/PDT)
// as "DD/MM/YYYY hh:mm:ss AM/PM" (12-hour format)
const formatScheduledDate = (dateString) => {
  if (!dateString || isNaN(new Date(dateString).getTime())) {
    return "Invalid Date";
  }

  const date = new Date(dateString);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true, // Use 12-hour format
    timeZone: "America/Los_Angeles", // Force Pacific Time
  });
};



  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filter campaigns based on search term
  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.campaign_id.toString().includes(searchTerm)
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📊 Campaign Logs</h1>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Campaigns..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className={styles.campaignList}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeader}>Campaign ID</th>
              <th className={styles.tableHeader}>Campaign Name</th>
              <th className={styles.tableHeader}>Scheduled Date</th>
              <th className={styles.tableHeader}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign) => {
              const status = getStatus(campaign.created_at);
              return (
                <React.Fragment key={campaign.campaign_id}>
                  <tr
                    className={styles.row}
                    onClick={() => handleCampaignSelect(campaign.campaign_id)}
                  >
                    <td className={styles.cell}>{campaign.campaign_id}</td>
                    <td className={styles.cell}>{campaign.campaign_name}</td>
                    <td className={styles.cell}>
                      {formatScheduledDate(campaign.created_at)}
                    </td>
                    <td
                      className={`${styles.cell} ${
                        status === "Pending" ? styles.statusPending : styles.statusExpired
                      }`}
                    >
                      {status}
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedCampaignId === campaign.campaign_id && (
                    <tr>
                      <td colSpan={4}>
                        <div className={styles.expandedRow}>
                          <h3 className={styles.expandedRowTitle}>
                            📋 Customer Names and Contact Numbers
                          </h3>
                          {campaignDetails.length > 0 ? (
                            <table className={styles.contactsTable}>
                              <thead>
                                <tr>
                                  <th className={styles.tableHeader}>Customer Name</th>
                                  <th className={styles.tableHeader}>Contact Name</th>
                                  <th className={styles.tableHeader}>Phone Number</th>
                                </tr>
                              </thead>
                              <tbody>
                                {campaignDetails.map((contact, index) => (
                                  <tr key={index}>
                                    <td className={styles.contactCell}>{contact.customerName}</td>
                                    <td className={styles.contactCell}>{contact.contactName}</td>
                                    <td className={styles.contactCell}>{contact.phone_number}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p>No contact details available.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewCampaignLog;
