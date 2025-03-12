import React, { useState, useEffect } from "react";
import config from "../../config";

const TriggerCampaign = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  useEffect(() => {
    // Retrieve user email from localStorage
    const userEmail = localStorage.getItem("userEmail");

    // Check if userEmail exists
    if (!userEmail) {
      console.error("User email not found in localStorage.");
      return;
    }

    // Fetch campaigns with userEmail passed as a query parameter or header
    fetch(`${config.apiBaseUrl}/api/campaigns1?email=${userEmail}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched campaigns:", data);
        setCampaigns(data.campaigns || []);
      })
      .catch((error) => console.error("Error fetching campaigns:", error));
  }, []);
  const formatDateToPST = (utcDate) => {
    const options = { timeZone: "America/Los_Angeles" }; // PST
    const pstDate = new Date(utcDate).toLocaleString("en-US", options); // Convert to PST
    const date = new Date(pstDate);
  
    // Extract date components
    const day = String(date.getDate()).padStart(2, "0"); // Day (DD)
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Month (MM)
    const year = date.getFullYear(); // Year (YYYY)
    const time = date.toLocaleTimeString("en-US", { hour12: true }); // Time (hh:mm:ss AM/PM)
  
    return `${day}/${month}/${year} ${time}`;
  };
  
  const handleCampaignSelect = (campaign) => {
    if (expandedCampaignId === campaign.campaign_id) {
      setExpandedCampaignId(null);
      setSelectedCampaign(null);
      setContacts([]);
      setSelectedContacts([]);
      return;
    }

    setSelectedCampaign(campaign);
    setExpandedCampaignId(campaign.campaign_id);

    fetch(`${config.apiBaseUrl}/api/campaignDetails?campaignId=${campaign.campaign_id}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched campaign details:", data);

        if (data.selectedNumbers && data.customerNames && data.contactNames) {
          const contactsList = data.selectedNumbers.map((number, index) => ({
            id: index,
            customerName: data.customerNames[index],
            contactName: data.contactNames[index],
            phone_number: number,
          }));

          setContacts(contactsList);
          setSelectedContacts(contactsList.map((_, index) => index));
        } else {
          setContacts([]);
        }
      })
      .catch((error) => console.error("Error fetching campaign details:", error));
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts((prevSelected) =>
      prevSelected.includes(contactId)
        ? prevSelected.filter((id) => id !== contactId)
        : [...prevSelected, contactId]
    );
  };

  const handleTriggerCampaign = () => {
    if (!selectedCampaign || selectedContacts.length === 0) {
      alert("Please select a campaign and at least one contact.");
      return;
    }

    // Retrieve userEmail from localStorage
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      alert("User email is required, but not found in localStorage.");
      return;
    }

    // Map selected contacts to include only phone number and country code
    const selectedContactDetails = selectedContacts.map((contactId) => {
      const contact = contacts.find((contact) => contact.id === contactId);
      return {
        phone: contact.phone_number,
        country_code: contact.phone_number.split(' ')[0], // Assuming country_code is the first part of the phone number (e.g. +1 for US)
      };
    });

    const payload = {
      campaignId: selectedCampaign.campaign_id,
      contacts: selectedContactDetails,
      userEmail: userEmail,
    };

    // Trigger cooldown
    setIsCooldown(true);

    fetch(`${config.apiBaseUrl}/api/triggerCampaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        alert("Campaign triggered successfully!");
        console.log("Trigger response:", data);
      })
      .catch((error) => {
        console.error("Error triggering campaign:", error);
        alert("Failed to trigger the campaign.");
      })
      .finally(() => {
        // Re-enable the button after 5 seconds
        setTimeout(() => {
          setIsCooldown(false);
        }, 5000);
      });
  };
  

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📈 Trigger Your Campaign</h1>
  
      <div style={styles.campaignList}>
        <h2 style={styles.subtitle}>Select a Campaign</h2>
        {campaigns.map((campaign) => (
          <div key={campaign.campaign_id} style={styles.campaignWrapper}>
            <div
              style={{
                ...styles.campaignItem,
                ...(selectedCampaign?.campaign_id === campaign.campaign_id
                  ? styles.selectedCampaignItem
                  : {}),
              }}
              onClick={() => handleCampaignSelect(campaign)}
            >
              <div style={styles.campaignName}>{campaign.campaign_name}</div>
              <div
                style={{
                  ...styles.campaignInfo,
                  ...(selectedCampaign?.campaign_id === campaign.campaign_id
                    ? { color: "#ffffff" }
                    : {}),
                }}
              >
                ID: {campaign.campaign_id}
              </div>
              <div
                style={{
                  ...styles.campaignInfo,
                  ...(selectedCampaign?.campaign_id === campaign.campaign_id
                    ? { color: "#ffffff" }
                    : {}),
                }}
              >
Scheduled Time: {formatDateToPST(campaign.created_at)}
</div>
            </div>
  
            {expandedCampaignId === campaign.campaign_id && (
              <div style={styles.expandedSection}>
                <h3 style={styles.tableTitle}>
                  📋 Customer Names and Contact Numbers
                </h3>
                <div style={styles.scrollableTable}>
                  <table style={styles.contactsTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Select</th>
                        <th style={styles.tableHeader}>Customer Name</th>
                        <th style={styles.tableHeader}>Contact Name</th>
                        <th style={styles.tableHeader}>Phone Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact.id} style={styles.contactRow}>
                          <td style={styles.contactCell}>
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={() => toggleContactSelection(contact.id)}
                              style={styles.checkbox}
                            />
                          </td>
                          <td style={styles.contactCell}>{contact.customerName}</td>
                          <td style={styles.contactCell}>{contact.contactName}</td>
                          <td style={styles.contactCell}>{contact.phone_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  style={{
                    ...styles.triggerButton,
                    ...(isCooldown && { background: "#cccccc", cursor: "not-allowed" }),
                  }}
                  onMouseEnter={(e) =>
                    !isCooldown &&
                    (e.target.style.background =
                      styles.triggerButtonHover.background)
                  }
                  onMouseLeave={(e) =>
                    !isCooldown &&
                    (e.target.style.background = styles.triggerButton.background)
                  }
                  onClick={!isCooldown ? handleTriggerCampaign : null}
                  disabled={isCooldown} // Disable button during cooldown
                >
                  {isCooldown ? "Cooldown " : "🚀 Trigger Campaign"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );};
  
  // Updated inline styles
  const styles = {
    container: {
      fontFamily: "'Roboto', sans-serif",
      backgroundColor: "#f8faff",
      padding: "40px",
      borderRadius: "12px",
      boxShadow: "0 12px 24px rgba(0, 0, 0, 0.1)",
      maxWidth: "1200px",
      margin: "auto",
    },
    title: {
      fontSize: "42px",
      color: "#2c3e50",
      textAlign: "center",
      marginBottom: "30px",
      fontWeight: "700",
    },
    subtitle: {
      fontSize: "28px",
      color: "#34495e",
      marginBottom: "20px",
      fontWeight: "500",
    },
    campaignList: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    campaignWrapper: {
      marginBottom: "20px",
    },
    campaignItem: {
      padding: "20px",
      borderRadius: "10px",
      backgroundColor: "#ffffff",
      boxShadow: "0 6px 12px rgba(0, 0, 0, 0.05)",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    selectedCampaignItem: {
      backgroundColor: "#091175",
      color: "#ffffff",
      boxShadow: "0 6px 12px rgba(0, 123, 255, 0.3)",
    },
    campaignName: {
      fontSize: "22px",
      fontWeight: "600",
    },
    campaignInfo: {
      fontSize: "16px",
      color: "#7f8c8d",
    },
    expandedSection: {
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      padding: "20px",
      marginTop: "10px",
    },
    tableTitle: {
      fontSize: "20px",
      fontWeight: "600",
      marginBottom: "20px",
      textAlign: "center",
    },
    scrollableTable: {
      maxHeight: "300px", // Adjust based on your preference
      overflowY: "auto",  // Enable scrolling
    },
    contactsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
      textAlign:"left"
    },
    tableHeader: {
      padding: "10px",
      backgroundColor: "#091175",
      color: "#ffffff",
      textAlign: "left",
      position: "sticky", // Make header sticky
      top: 0,  // Stick to top of the table container
      zIndex: 1, // Ensure header is above the rows
      textTransform: "none", // Prevent text transformation
    },
    contactRow: {
      borderBottom: "1px solid #ddd",
    },
    contactCell: {
      padding: "10px",
      textAlign:"left"
    },
    triggerButton: {
      width: "40%",
      display: "block",
      background: "linear-gradient(90deg, #007bff, #0056b3)",
      color: "#ffffff",
      border: "none",
      padding: "12px 20px",
      fontSize: "16px",
      borderRadius: "5px",
      cursor: "pointer",
      margin: "10px auto 0",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    triggerButtonHover: {
      background: "linear-gradient(90deg, #0056b3, #00408a)",
    },
  };
  

export default TriggerCampaign;
