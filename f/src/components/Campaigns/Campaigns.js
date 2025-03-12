import React, { useState, useEffect } from "react";
import "./Campaigns.css";
import config from "../config";

function Campaigns({ campaignData, onMessageSaved }) {
  const [campaigns, setCampaigns] = useState([]); // List of campaigns
  const [selectedCampaign, setSelectedCampaign] = useState(""); // Selected campaign ID
  const [templateCategories, setTemplateCategories] = useState([]); // List of template categories
  const [selectedCategory, setSelectedCategory] = useState(""); // Selected category
  const [, setMessages] = useState([]); // List of messages for the selected category
  const [message, setMessage] = useState(""); // Message content
  const [loading, setLoading] = useState(false); // Loading state for fetch calls
  const [error, setError] = useState(""); // Error state for better user feedback
  const [successMessage, setSuccessMessage] = useState(""); // Success message state

  // Fetch campaigns on component mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      setError("");
    
      try {
        const userEmail = localStorage.getItem('userEmail'); // Fetch the email from localStorage
        const response = await fetch(`${config.apiBaseUrl}/api/campaigns1`, {
          headers: { 'x-user-email': userEmail },
        });
        const data = await response.json();
    
        if (data?.campaigns) {
          setCampaigns(data.campaigns);
        } else {
          console.log("No campaigns found.");
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        setError("Failed to fetch campaigns. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    

    fetchCampaigns();
  }, []); // Only run once on component mount

  // Fetch template categories on component mount
  useEffect(() => {
    const fetchTemplateCategories = async () => {
      setLoading(true); // Start loading
      setError(""); // Reset errors
      try {
        console.log("Fetching template categories...");
        const response = await fetch(`${config.apiBaseUrl}/api/template-categories`);
        if (!response.ok) {
          setError("Failed to fetch template categories. Please try again.");
          return;
        }
        const data = await response.json();
        console.log("Fetched categories:", data);
        if (data?.categories) {
          setTemplateCategories(data.categories);
        } else {
          console.log("No categories found.");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("Error fetching categories. Please try again.");
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchTemplateCategories(); // Fetch categories when the component mounts
  }, []);

  // Fetch messages for the selected category
  useEffect(() => {
    console.log("Selected category changed:", selectedCategory);
    if (selectedCategory) {
      const fetchMessagesForCategory = async () => {
        setLoading(true); // Start loading
        setError(""); // Reset errors
        try {
          console.log("Fetching messages for category:", selectedCategory);
          const response = await fetch(`${config.apiBaseUrl}/api/messages?category=${selectedCategory}`);
          const data = await response.json();
          console.log("Fetched messages for category:", data);
          if (data?.messages && data.messages.length > 0) {
            setMessages(data.messages);
            // Join message lines into a single message to populate the message box
            const combinedMessage = data.messages.join("\n");
            setMessage(combinedMessage); // Ensure message state is updated correctly
            console.log("Combined message set:", combinedMessage);
          } else {
            setMessages([]);
            setMessage(""); // Clear message box if no messages found
            console.log("No messages found for the selected category.");
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
          setError("Error fetching messages. Please try again.");
        } finally {
          setLoading(false); // Stop loading
        }
      };

      fetchMessagesForCategory();
    }
  }, [selectedCategory]); // Triggered whenever the selectedCategory changes

  // Handle campaign selection
  const handleCampaignSelect = (e) => {
    setSelectedCampaign(e.target.value);
    console.log("Campaign selected:", e.target.value);
  };

  // Handle category selection
  const handleCategorySelect = (e) => {
    setSelectedCategory(e.target.value);
    console.log("Category selected:", e.target.value);
  };

  // Handle message typing (no need to handle placeholders, just store as-is)
  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);  // Just store the message as-is
    console.log("Message changed:", newMessage);
  };

  // Save the message (save as-is with placeholders like [Name])
  const handleSave = async () => {
    if (!selectedCampaign) {
      alert("Please select a campaign.");
      return;
    }

    // The message is stored as-is, with placeholders like [Name] kept intact
    try {
      console.log("Saving message...");
      const response = await fetch(`${config.apiBaseUrl}/api/save-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          message: message, // Store the message with placeholders as-is
        }),
      });

      if (response.ok) {
        setSuccessMessage("Message saved successfully!"); // Show success message
        console.log("Message saved:", { campaignId: selectedCampaign, message });
      } else {
        console.error("Failed to save message.");
        alert("Error saving the message.");
      }
    } catch (error) {
      console.error("Error saving message:", error);
      alert("An error occurred while saving the message.");
    }
    onMessageSaved();
  };

  // Reset the form
  const handleCancel = () => {
    setMessage("");
    setSelectedCategory(""); // Clear selected category on cancel
    setMessages([]); // Clear messages
    setSuccessMessage(""); // Clear success message
    console.log("Message canceled.");
  };

  return (
    <div className="campaigns-container">
      <h2 className="campaigns-title">Campaign Message Management</h2>

      {/* Campaign selection */}
      <label htmlFor="campaign-select" className="campaign-select-label">
        Select Campaign
      </label>
      <select
        id="campaign-select"
        value={selectedCampaign}
        onChange={handleCampaignSelect}
        className="campaign-select"
        disabled={loading} // Disable during loading
      >
        <option value="" disabled>
          Select a campaign...
        </option>
        {campaigns.map((campaign) => (
          <option key={campaign.campaign_id} value={campaign.campaign_id}>
            {campaign.campaign_name}
          </option>
        ))}
      </select>

      {/* Template category selection */}
      <label htmlFor="category-select" className="category-select-label">
        Select Template Category
      </label>
      <select
        id="category-select"
        value={selectedCategory}
        onChange={handleCategorySelect}
        className="category-select"
        disabled={loading} // Disable during loading
      >
        <option value="" disabled>
          Select a category...
        </option>
        {templateCategories.map((category, index) => (
          <option key={index} value={category}>
            {category}
          </option>
        ))}
      </select>

      {/* Display success message */}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Display error message if any */}
      {error && <div className="error-message">{error}</div>}

      {/* Message textarea */}
      <label htmlFor="message-textarea" className="message-textarea-label">
        Message
      </label>
      <textarea
        id="message-textarea"
        value={message}
        onChange={handleMessageChange}
        placeholder="Type your message here..."
        className="message-textarea"
        disabled={loading} // Disable during loading
        maxLength={1000} // Set the maximum character limit

      />
<div className="character-count">
  {1000 - message.length} characters remaining
</div>
      {/* Save and Cancel buttons */}
      <div className="campaign-buttons">
        <button onClick={handleSave} className="save-button" disabled={loading}>
          Save
        </button>
        <button onClick={handleCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default Campaigns;
