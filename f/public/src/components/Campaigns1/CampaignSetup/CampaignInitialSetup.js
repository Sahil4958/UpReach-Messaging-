// CampaignInitialSetup.jsx
import React, { useState } from "react";
import styles from "./CampaignInitialSetup.module.css"; // Import the CSS module if needed

const CampaignInitialSetup = ({ onInitialSetupComplete }) => {
  const [campaignName, setCampaignName] = useState("");
  const [scheduleDatetime, setScheduleDatetime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!campaignName || !scheduleDatetime) return;

    onInitialSetupComplete({ campaignName, scheduleDatetime });
  };

  return (
    <div className={styles.cis_container}>
      <h2 className={styles.cis_header}>Step 1: Campaign Initial Setup</h2>
      <form className={styles.cis_form} onSubmit={handleSubmit}>
        <div className={styles.cis_formRow}>
          <div className={styles.cis_formCampaignName}>
            <label>Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className={styles.cis_inputText}
              required
            />
          </div>
          <div className={styles.cis_formScheduleDatetime}>
            <label>Schedule Date and Time</label>
            <input
              type="datetime-local"
              value={scheduleDatetime}
              onChange={(e) => setScheduleDatetime(e.target.value)}
              required
              className={styles.cis_inputDatetime}
            />
          </div>
        </div>
        <div className={styles.cis_formSubmit}>
          <button type="submit">Next</button>
        </div>
      </form>
    </div>
  );
};

export default CampaignInitialSetup;
