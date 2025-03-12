import React, { useState, useEffect } from "react";
import config from "../../config";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import styles from "./CampaignCalendar.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const localizer = momentLocalizer(moment);

const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navButtonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    transition: "transform 0.3s ease, background-color 0.3s ease",
    padding: "10px",
    color: "#007bff",
    borderRadius: "50%",
    ...(isHovered && { backgroundColor: "#f1f1f1" }),
  };

  return (
    <div className={styles.customToolbarContainer}>
      <div className={styles.customNavButtons}>
        <button
          className={styles.navButton}
          onClick={() => onNavigate("PREV")}
          style={navButtonStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <span className={styles.customLabel}>{label}</span>

        <button
          className={styles.navButton}
          onClick={() => onNavigate("NEXT")}
          style={navButtonStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      <div className={styles.viewButtons}>
        <button
          className={`${styles.viewButton} ${view === "week" ? styles.activeView : ""}`}
          onClick={() => onView("week")}
        >
          Week
        </button>
        <button
          className={`${styles.viewButton} ${view === "day" ? styles.activeView : ""}`}
          onClick={() => onView("day")}
        >
          Day
        </button>
      </div>
    </div>
  );
};

const CampaignCalendar = () => {
  const [events, setEvents] = useState([]);
  const [fetchedEvents, setFetchedEvents] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [campaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCampaigns = async () => {
      const userEmail = localStorage.getItem('userEmail');
    
      if (!userEmail) {
        console.error('User email is not found in localStorage');
        return;
      }
    
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/campaigns2`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'user-email': userEmail,  // Send userEmail in the headers
          },
        });
    
        const data = await response.json();
    
        if (response.ok) {
          const formattedEvents = data.map((campaign) => ({
            campaignId: campaign.campaign_id,
            title: campaign.campaign_name,
            start: moment.utc(campaign.created_at).local().toDate(),
            message: campaign.message || 'No message provided',
          }));
    
          setFetchedEvents(formattedEvents);
        } else {
          console.error('Failed to fetch campaigns:', data.message);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };
    

    fetchCampaigns();
  }, []);

  const handleSelectSlot = ({ start }) => {
    setCurrentEvent({
      start: start,
      triggerTime: moment(start).format("HH:mm"),
      campaignId: "",
      message: "",
    });
    setShowPopup(true);
    setIsEditing(false);
  };

  const handleSelectEvent = (event) => {
    setShowPopup(true);
    setIsEditing(true);
    setCurrentEvent({
      ...event,
      triggerTime: moment(event.start).format("HH:mm"),
    });
  };

  const handleUpdateEvent = async () => {
    const updatedStart = moment(currentEvent.start)
      .set({
        hour: moment(currentEvent.triggerTime, "HH:mm").hour(),
        minute: moment(currentEvent.triggerTime, "HH:mm").minute(),
      })
      .local()
      .utc()
      .toDate();

    const updatedEvent = {
      ...currentEvent,
      start: updatedStart,
    };

    try {
      if (currentEvent.campaignId) {
        const response = await fetch(
          `${config.apiBaseUrl}/api/campaigns/${currentEvent.campaignId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updatedDatetime: updatedStart }),
          }
        );

        if (!response.ok) throw new Error("Failed to update campaign.");

        setFetchedEvents((prev) =>
          prev.map((event) =>
            event.campaignId === currentEvent.campaignId ? updatedEvent : event
          )
        );
      } else {
        setEvents((prev) =>
          prev.map((event) =>
            event.start === currentEvent.start ? updatedEvent : event
          )
        );
      }

      setShowPopup(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update the event.");
    }
  };

  const filteredEvents = [...events, ...fetchedEvents].filter((event) =>
    event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.calendarContainer}>
      <header className={styles.calendarHeader}>
        <h2 className={styles.pageTitle}>Campaign Calendar</h2>
        <p className={styles.pageDescription}>Plan, schedule, and manage your campaigns with ease.</p>
        <div className={styles.calendarSearchBar}>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </header>

      <Calendar
        localizer={localizer}
        events={filteredEvents}
        startAccessor="start"
        endAccessor="start"
        selectable
        defaultView="week"
        views={["week", "day"]}
        style={{ height: "300vh" }}
        components={{
          toolbar: CustomToolbar,
          event: ({ event }) => (
            <div className={styles.customEvent}>
              {event.title}
            </div>
          ),
        }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
      />

      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            {isEditing ? (
              <>
                <h3 className={styles.popupTitle}>Edit Campaign</h3>
                <div className={styles.inputGroup}>
                  <label>Message</label>
                  <textarea
                    value={currentEvent.message}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        message: e.target.value,
                      })
                    }
                    className={styles.textarea}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Trigger Time</label>
                  <input
                    type="time"
                    value={currentEvent.triggerTime}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        triggerTime: e.target.value,
                      })
                    }
                    className={styles.timeInput}
                  />
                </div>
                <div className={styles.popupButtonGroup}>
                  <button className={styles.saveButton} onClick={handleUpdateEvent}>Update</button>
                  <button className={styles.cancelButton} onClick={() => setShowPopup(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.popupTitle}>Create New Campaign</h3>
                <div className={styles.inputGroup}>
                  <label>Select Campaign</label>
                  <select
                    value={currentEvent.campaignId}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        campaignId: e.target.value,
                      })
                    }
                    className={styles.selectInput}
                  >
                    <option value="">-- Select a campaign --</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.campaign_id} value={campaign.campaign_id}>
                        {campaign.campaign_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Message</label>
                  <textarea
                    value={currentEvent.message}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        message: e.target.value,
                      })
                    }
                    className={styles.textarea}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Trigger Time</label>
                  <input
                    type="time"
                    value={currentEvent.triggerTime}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        triggerTime: e.target.value,
                      })
                    }
                    className={styles.timeInput}
                  />
                </div>
                <div className={styles.popupButtonGroup}>
                  <button className={styles.saveButton} onClick={handleUpdateEvent}>Save</button>
                  <button className={styles.cancelButton} onClick={() => setShowPopup(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignCalendar;
