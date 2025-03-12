import React, { useState } from "react";
import CampaignInitialSetup from "../CampaignSetup/CampaignInitialSetup";
import CampaignSetup from "../CampaignSetup/CampaignSetup";
import Campaigns from "../Campaigns";
import "./CampaignFlow.css";

const CampaignFlow = ({ onRedirectToTriggerCampaign }) => {
  const [step, setStep] = useState(1);
  const [campaignDetails, setCampaignDetails] = useState({
    campaignName: "",
    scheduleDatetime: "",
  });
  const [campaignData, setCampaignData] = useState(null);

  const handleInitialSetupComplete = (details) => {
    if (!details || typeof details !== "object") {
      console.error("handleInitialSetupComplete: Invalid details provided.");
      return;
    }

    const { campaignName = "", scheduleDatetime = "" } = details;

    if (!campaignName || !scheduleDatetime) {
      console.error("Both campaignName and scheduleDatetime are required.");
      return;
    }

    setCampaignDetails({ campaignName, scheduleDatetime });
    setStep(2);
  };

  const handleCampaignCreated = (createdCampaignData) => {
    if (!createdCampaignData?.campaignId) {
      console.error("handleCampaignCreated: Invalid campaign data provided.");
      return;
    }
    setCampaignData(createdCampaignData);
    setStep(3);
  };

  const handleMessageSaved = () => {
    setCampaignData(null);
    setCampaignDetails({ campaignName: "", scheduleDatetime: "" });
    setStep(1); // Reset after completion
    onRedirectToTriggerCampaign?.();
  };

  return (
    <div className="campaign-flow-container">
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? "active" : ""}`}>
          1
          <span className="step-label">Initial Setup</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? "active" : ""}`}>
          2
          <span className="step-label">Campaign Setup</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step === 3 ? "active" : ""}`}>
          3
          <span className="step-label">Configure</span>
        </div>
      </div>

      {step === 1 && (
        <div className="step-container">
          <CampaignInitialSetup 
            onInitialSetupComplete={handleInitialSetupComplete} 
          />
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <CampaignSetup 
            campaignDetails={campaignDetails} 
            onCampaignCreated={handleCampaignCreated} 
          />
        </div>
      )}

      {step === 3 && campaignData && (
        <div className="step-container">
          <Campaigns 
            campaignData={campaignData} 
            onMessageSaved={handleMessageSaved} 
          />
        </div>
      )}
    </div>
  );
};

export default CampaignFlow;