import React, { useState, useEffect } from "react";
import { 
  Bell, Settings, HelpCircle, PlusCircle, BarChart2, Users, 
  Send, Calendar, ChevronRight, Edit, Trash2, Play, PauseCircle 
} from "react-feather";
import config from "../config"; 
import "./Home.css";

const Home = ({ setActiveTab }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem('username') || 'User');  // Get the username from localStorage

  // State for the statistics
  const [metrics, setMetrics] = useState({
    totalSmsSent: 0,
    deliveryRate: 0,
    failedMessages: 0,
    totalCost: 0,
    perSmsCost: 0,
    timeToSendSms: 0,
    smsPerSecond: 0,
    latency: 0,
    throughput: 0,
    totalSmsReceived: 0,
  });

  // Helper function to get a greeting based on PST time.
  const getGreeting = () => {
    const options = { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false };
    const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(new Date()), 10);
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');  // Get the email from local storage

    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/campaigns1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail,   // Pass email in headers
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }

        const data = await response.json();
        setCampaigns(data.campaigns);
      } catch (error) {
        setError(error.message);
        console.error('Error fetching campaigns:', error);
      }
    };

    const fetchMetrics = async () => {
      try {
        const orgName = localStorage.getItem('org_name');  // Get the organization name from localStorage
        const response = await fetch(`${config.apiBaseUrl}/homemetrics`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-org-name': orgName,  // Pass organization name in headers
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch homemetrics');
        }

        const data = await response.json();
        setMetrics({
          totalSmsSent: Number(data.totalSmsSent) || 0,
          deliveryRate: Number(data.deliveryRate) || 0,
          failedMessages: Number(data.failedMessages) || 0,
          totalCost: Number(data.totalCost) || 0,
          perSmsCost: Number(data.perSmsCost) || 0,
          timeToSendSms: Number(data.timeToSendSms) || 0,
          smsPerSecond: Number(data.smsPerSecond) || 0,
          latency: Number(data.latency) || 0,
          throughput: Number(data.throughput) || 0,
          totalSmsReceived: Number(data.totalSmsReceived) || 0,
        });
      } catch (error) {
        console.error('Error fetching homemetrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
    fetchMetrics();
  }, []);

  return (
    <div className="home">
      <main>
        {/* Display dynamic greeting and username */}
        <h1>{getGreeting()}, {username}</h1>

        <section className="dashboard">
          <div className="dashboard-header">
            <h2>Campaign Overview</h2>
            <button className="new-campaign" onClick={() => setActiveTab('Campaign Flow')}>
  <PlusCircle size={16} /> New Campaign
</button>

          </div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <BarChart2 size={24} />
              <h3>Total SMS Sent</h3>
              <p>{metrics.totalSmsSent}</p>
              <span className="stat-trend">↑ 8%</span>
            </div>
            <div className="stat-card">
              <Users size={24} />
              <h3>Delivery Rate</h3>
              <p>{metrics.deliveryRate}%</p>
              <span className="stat-trend">↑ 12%</span>
            </div>
            <div className="stat-card">
              <Send size={24} />
              <h3>Failed Messages</h3>
              <p>{metrics.failedMessages}</p>
              <span className="stat-trend">↑ 5%</span>
            </div>
            <div className="stat-card">
              <Calendar size={24} />
              <h3>Total Cost</h3>
              <p>${Math.abs(Number(metrics.totalCost)).toFixed(2)}</p>
              <span className="stat-trend">↑ 3%</span>
            </div>
          </div>
        </section>

        <section className="quick-actions">
          <h2 className="text-[#0e0e1b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Quick Actions
          </h2>

          <div className="action-item">
            <div className="action-content">
              <p className="action-title">Start Campaign</p>
              <p className="action-description">Start a new campaign to send messages.</p>
            </div>
            <button className="action-button" onClick={() => setActiveTab("Trigger Campaign")}>
              Start Campaign
            </button>
          </div>

          <div className="action-item">
            <div className="action-content">
              <p className="action-title">Edit Campaign</p>
              <p className="action-description">Make changes to an existing campaign.</p>
            </div>
            <button className="action-button" onClick={() => setActiveTab("Edit Campaign")}>
              Edit Campaign
            </button>
          </div>

          <div className="action-item">
            <div className="action-content">
              <p className="action-title">Delete Campaign</p>
              <p className="action-description">Permanently delete a campaign.</p>
            </div>
            <button className="action-button" onClick={() => setActiveTab("Edit Campaign")}>
              Delete Campaign
            </button>
          </div>
        </section>

        <section className="campaigns">
          <div className="campaigns-header">
            <h2>Recent Campaigns</h2>
            <button className="view-all" onClick={() => setActiveTab("View Campaign Log")}>
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className="campaign-cards">
            {!loading && !error && campaigns.length === 0 && (
              <p>No campaigns found.</p>
            )}
            {campaigns.map((campaign) => {
              const scheduledTime = new Date(campaign.created_at);
              const currentTime = new Date();
              const status = scheduledTime > currentTime ? "Active" : "Triggered";

              return (
                <div key={campaign.campaign_id} className="campaign-card">
                  <div className="campaign-info">
                    <h3>{campaign.campaign_name}</h3>
                    <span className={`status ${status.toLowerCase()}`}>{status}</span>
                  </div>
                  <div className="campaign-stats">
                    <div className="stat">
                      <span>Scheduled At </span>
                      <span>{scheduledTime.toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                  <div className="campaign-actions">
                    <button className="action-button1" onClick={() => setActiveTab("View Campaign Log")}>
                      View
                    </button>
                    <button className="action-button1" onClick={() => setActiveTab(`Edit Campaign/${campaign.campaign_id}`)}>
                      Edit
                    </button>
                    <button className="action-button1" onClick={() => setActiveTab(`Edit Campaign/${campaign.campaign_id}`)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
