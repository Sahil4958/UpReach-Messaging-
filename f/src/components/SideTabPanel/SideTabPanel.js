import React, { useState, useEffect } from "react";
import {
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaUserCircle,
  FaFileAlt,
  FaUpload,
  FaCalendarAlt,
  FaClipboard,
  FaEdit, // Add this line
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SideTabPanel.css";
import Accounts from "../Accounts/Accounts";
import CampaignCalendar from "../Campaigns/CampaignCalendar/CampaignCalendar";
import CampaignFlow from "../Campaigns/CampaignFlow/CampaignFlow";
import Dashboard from "../Dashboard/Dashboard";
import Users from "../Users/Users";
import UsingForm from "../Contacts/UsingForm/UsingForm";
import UsingExcelUpload from "../Contacts/UsingExcelUpload/UsingExcelUpload";
import ViewContacts from "../Contacts/ViewContacts/ViewContacts";
import CampaignConsentForm from "../Campaigns/CampaignConsentForm/CampaignConsentForm";
import TriggerCampaign from "../Campaigns/TriggerCampaign/TriggerCampaign";
import CampaignLogs from "../Campaigns/CampaignLogs/CampaignLogs";
import ManageLogs from "../ManageLogs/ManageLogs";
import config from "../config";
import ResetPassword from "./ResetPassword";
import Profile from "./photoUpload";
import EditCampaign from "../Campaigns/EditCampaign/EditCampaign"
import Home from "../Home/Home";
import "./profile.css"

const SideTabPanel = () => {
  const [activeTab, setActiveTab] = useState("Home");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isContactsExpanded, setContactsExpanded] = useState(false);
  const [isCampaignsExpanded, setCampaignsExpanded] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const [profileUrl, setProfileUrl] = useState(localStorage.getItem("profileUrl"));
  const username = localStorage.getItem("username");
  const email = localStorage.getItem("userEmail");

  const handleTabClick = (tab) => {
    if (tab === "Contacts") {
      setContactsExpanded(!isContactsExpanded);
      setActiveTab("Using Form"); // Always set to "Using Form" when expanding contacts
    } else if (tab === "Campaigns") {
      setCampaignsExpanded(!isCampaignsExpanded);
      setActiveTab("Campaign Flow"); // Default to "Campaign Setup" when expanding campaigns
    } else if (tab === "View Campaign Log") {
      setActiveTab("View Campaign Log");
    } else if (tab === "Manage Logs") {
      setContactsExpanded(false);
      setCampaignsExpanded(false);
      setActiveTab("Manage Logs"); // Ensure Manage Logs is handled
    } else {
      setContactsExpanded(false);
      setCampaignsExpanded(false);
      setActiveTab(tab);
    }
  };

  const handleRedirectToTriggerCampaign = () => {
    setCampaignsExpanded(true); // Expand the Campaigns submenu
    setActiveTab("Trigger Campaign"); // Set the active tab
  };
  const handleResetPasswordClick = () => {
    setIsResetPasswordOpen(true);
  };

  const handleUploadPhotoClick = () => {
    setIsProfileOpen(true);
  };

  const handleCloseUploadPhotoClick = () => {
    setIsProfileOpen(false);
  };

  const handleCloseResetPassword = () => {
    setIsResetPasswordOpen(false);
  };

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const handleLogout = () => {
    localStorage.clear();
    alert("Logged out successfully!");
    navigate("/login");
  };
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const { data } = await axios.get(`${config.apiBaseUrl}/api/user/${username}`);
        const userData = data.user;
  
        if (userData?.profile_url) {
          const updatedUrl = `${config.apiBaseUrl}${userData.profile_url}`;
          setProfileUrl(updatedUrl);
          localStorage.setItem("profileUrl", updatedUrl);
        } else {
          setProfileUrl(null); // Clear profile state if no URL
          localStorage.removeItem("profileUrl"); // Clear stale local data
        }
  
      } catch (err) {
        console.error("Error fetching user details:", err);
        setProfileUrl(null); // Clear profile state on error
        localStorage.removeItem("profileUrl"); // Clear stale data on error
      }
    };
  
    if (username) fetchUserDetails();
  }, [username, isProfileOpen]); // Refetch when profile modal closes
  
  // Fetch role from the API
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/get-role`, {
          headers: {
            "x-user-email": email, // Send email in headers
          },
        });

        if (response.data && response.data.user_role) {
          setRole(response.data.user_role); // Set role directly from user_role field
        } else {
          setRole("Unknown Role");
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("Unknown Role");
      }
    };

    fetchRole();
  }, [email]);

  return (
    <div className="side-tab-panel">
      {/* Username and Role Display at the Top Center */}
      <div className="user-info-overlay">
        <span className="user-info-text">
          Logged in User: <strong>{username}</strong> | Role:{" "}
          <strong>{role}</strong>
        </span>
      </div>
  
      <div className={`tabs ${isExpanded ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="brand-name1">UpReach</div>
          <button className="toggle-button" onClick={toggleSidebar}>
            {isExpanded ? <FaTimes /> : <FaBars />}
          </button>
        </div>
  
        {/* Tabs */}
        {[
          "Home",  // New Home tab (first in the list)
          "Accounts",
          "Contacts",
          "Campaigns",
          "Manage Logs",
          "Dashboard",
          "Users",
        ].map((tab) => (
          <div key={tab}>
            <div
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              <span className="first-letter">{tab[0]}</span>
              <span className="full-text">{tab}</span>
            </div>
  
            {/* Contacts Submenu */}
            {tab === "Contacts" && isContactsExpanded && (
              <div className="contacts-sub-tabs">
                <div
                  className={`sub-tab ${
                    activeTab === "Using Form" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Using Form")}
                >
                  <FaFileAlt className="sub-tab-icon" />
                  <span className="first-letter">F</span>
                  <span className="full-text">Using Form</span>
                </div>
                <div
                  className={`sub-tab ${
                    activeTab === "Using Excel Upload" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Using Excel Upload")}
                >
                  <FaUpload className="sub-tab-icon" />
                  <span className="first-letter">E</span>
                  <span className="full-text">Using Excel Upload</span>
                </div>
                <div
                  className={`sub-tab ${
                    activeTab === "ViewContacts" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("ViewContacts")}
                >
                  <FaUpload className="sub-tab-icon" />
                  <span className="first-letter">V</span>
                  <span className="full-text">View Contacts</span>
                </div>
              </div>
            )}
  
            {/* Campaigns Submenu */}
            {tab === "Campaigns" && isCampaignsExpanded && (
              <div className="campaigns-sub-tabs">
                <div
                  className={`sub-tab ${
                    activeTab === "Campaign Flow" ? "active" : ""
                  }`}
                
                  onClick={() => setActiveTab("Campaign Flow")}
                >
                  <FaClipboard className="sub-tab-icon" />
                  <span className="first-letter">S</span>
                  <span className="full-text">Campaign Flow</span>
                </div>
                
                <div
                  className={`sub-tab ${
                    activeTab === "Campaign Calendar" ? "active" : ""
                  }`}

  

                  onClick={() => setActiveTab("Campaign Calendar")}
                >
                  <FaCalendarAlt className="sub-tab-icon" />
                  <span className="first-letter">C</span>
                  <span className="full-text">Campaign Calendar</span>
                </div>
                <div
                  className={`sub-tab ${
                    activeTab === "Trigger Campaign" ? "active" : ""
                  }`}
               
                  onClick={() => setActiveTab("Trigger Campaign")}
                >
                  <FaUpload className="sub-tab-icon" />
                  <span className="first-letter">T</span>
                  <span className="full-text">Trigger Campaign</span>
                </div>
                <div
                  className={`sub-tab ${
                    activeTab === "View Campaign Log" ? "active" : ""
                  }`}
             
                  onClick={() => setActiveTab("View Campaign Log")}
                >
                  <FaFileAlt className="sub-tab-icon" />
                  <span className="first-letter">L</span>
                  <span className="full-text">View Campaign Log</span>
                </div>
                <div
                  className={`sub-tab ${
                    activeTab === "Campaign Consent Form" ? "active" : ""
                  }`}
               
                  onClick={() => setActiveTab("Campaign Consent Form")}
                >
                  <FaClipboard className="sub-tab-icon" />
                  <span className="first-letter">F</span>
                  <span className="full-text">Campaign Consent Form</span>
                </div>
                {/* New "Edit Campaign" Sub-tab */}
                <div
                  className={`sub-tab ${
                    activeTab === "Edit Campaign" ? "active" : ""
                  }`}
                
                  onClick={() => setActiveTab("Edit Campaign")}
                >
                  <FaEdit className="sub-tab-icon" />
                  <span className="first-letter">E</span>
                  <span className="full-text">Edit Campaign</span>
                </div>
              </div>
            )}
          </div>
        ))}
  
        {/* Logout Section */}
        <div className="logout-container" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          {isExpanded && <span className="logout-text">Logout</span>}
        </div>
      </div>
  
      {/* Profile Menu */}
      <div className="profile-button-container" onClick={() => setMenuOpen(!isMenuOpen)}>
        {profileUrl ? (
          <img src={profileUrl} alt={username} className="profile-icon" />
        ) : (
          <FaUserCircle className="profile-icon" />
        )}
      </div>
      {isMenuOpen && (
        <div className="profile-menu">
          <div className="profile-menu-item">
            <span className="username">{username}</span>
            <div className="email">{email}</div>
          </div>
          <div className="profile-menu-item" onClick={handleUploadPhotoClick}>
            Profile
          </div>
          <div className="profile-menu-item" onClick={handleResetPasswordClick}>
            Settings
          </div>
          <div className="profile-menu-item" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" /> Logout
          </div>
        </div>
      )}
  
      {/* Main Content Area */}
      <div className="content">
        <ResetPassword
          isOpen={isResetPasswordOpen}
          onClose={handleCloseResetPassword}
        />
        <Profile isOpen={isProfileOpen} onClose={handleCloseUploadPhotoClick} />
        {activeTab === "Home" && <Home setActiveTab={setActiveTab} />}
        {activeTab === "Accounts" && <Accounts />}
        {activeTab === "Campaign Calendar" && (
    <CampaignCalendar setActiveTab={setActiveTab} />
  )}        {activeTab === "Campaign Flow" && (
  <CampaignFlow onRedirectToTriggerCampaign={handleRedirectToTriggerCampaign} />
)}
        {activeTab === "Manage Logs" && <ManageLogs />}
        {activeTab === "Dashboard" && <Dashboard />}
        {activeTab === "Users" && <Users />}
        {activeTab === "Using Form" && <UsingForm />}
        {activeTab === "Using Excel Upload" && <UsingExcelUpload />}
        {activeTab === "ViewContacts" && <ViewContacts />}
        {activeTab === "Campaign Consent Form" && <CampaignConsentForm />}
        {activeTab === "View Campaign Log" && <CampaignLogs />}
        {activeTab === "Trigger Campaign" && <TriggerCampaign />}
        {activeTab.startsWith("Edit Campaign") && (
  <EditCampaign campaignId={activeTab.split('/')[1]} />
)}      </div>
    </div>
  );
  
};

export default SideTabPanel;