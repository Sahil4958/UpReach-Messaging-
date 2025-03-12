// CampaignInitialSetup.jsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./CampaignInitialSetup.module.css";

const CampaignInitialSetup = ({ onInitialSetupComplete }) => {
  const [campaignName, setCampaignName] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!campaignName || !selectedDate) return;
  
    // Ensure the selectedDate has both the date and time from the DatePicker.
    // Format the date as "DD/MM/YYYY hh:mm AM/PM" in Pacific Time
    const options = {
      timeZone: "America/Los_Angeles",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    
    // Using toLocaleString directly ensures the time portion is preserved
    const pstDateString = selectedDate.toLocaleString("en-GB", options);
  
    onInitialSetupComplete({
      campaignName,
      scheduleDatetime: pstDateString,
    });
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
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              showTimeSelect
              timeIntervals={15}
              dateFormat="dd/MM/yyyy hh:mm aa"  // 12-hour format with AM/PM
              placeholderText="Select date and time"
              className={styles.cis_inputDatetime}
              shouldCloseOnSelect={true}
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
