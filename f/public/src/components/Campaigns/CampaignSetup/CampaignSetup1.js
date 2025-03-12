import React, { useState, useEffect } from "react";
import "./CampaignSetup.css";
import config from "../../config";

const CampaignSetup = () => {
  const [campaignName, setCampaignName] = useState("");
  const [customerNames, setCustomerNames] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [numbersForCustomers, setNumbersForCustomers] = useState({});
  const [showContacts, setShowContacts] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [scheduleDatetime, setScheduleDatetime] = useState(""); 
  useEffect(() => {
    // Fetch customer names
    const fetchCustomerNames = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/customers`);
        const data = await response.json();
        if (data && data.data) {
          setCustomerNames(data.data);
        } else {
          setError("Failed to load customer data.");
          setTimeout(() => setError(""), 3000);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
        setError("Error fetching customer data.");
        setTimeout(() => setError(""), 3000);
      }
    };

    fetchCustomerNames();
  }, []);

  const fetchCustomerNumbers = async () => {
    if (selectedCustomers.length === 0) {
      setError("Please select at least one customer.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const numbers = {};
    try {
      for (const customer of selectedCustomers) {
        const response = await fetch(
          `${config.apiBaseUrl}/api/customers/${customer}/numbers`
        );
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          numbers[customer] = data.data;
        } else {
          setError(`No valid numbers found for customer: ${customer}`);
          setTimeout(() => setError(""), 3000);
        }
      }
      setNumbersForCustomers(numbers);
      setShowContacts(true);
    } catch (error) {
      console.error("Error fetching numbers:", error);
      setError("Error fetching customer numbers.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleCustomerSelection = (e) => {
    const { value, checked } = e.target;
    setSelectedCustomers((prev) =>
      checked ? [...prev, value] : prev.filter((customer) => customer !== value)
    );
  };

  const handleNumberSelection = (e, phoneNumber) => {
    if (e.target.checked) {
      setSelectedNumbers((prev) => [...prev, phoneNumber]);
    } else {
      setSelectedNumbers((prev) => prev.filter((num) => num !== phoneNumber));
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNumbers([]);
    } else {
      const allNumbers = Object.values(numbersForCustomers)
        .flat()
        .map((number) => number.phoneNumber);
      setSelectedNumbers(allNumbers);
    }
    setSelectAll(!selectAll);
  };
// Added state for schedule date and time


  // (Rest of your existing code remains unchanged)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!scheduleDatetime) {
      setError("Please select a schedule date and time.");
      setTimeout(() => setError(""), 3000);
      setLoading(false);
      return;
    }

    if (selectedNumbers.length === 0) {
      setError("Please select at least one phone number.");
      setTimeout(() => setError(""), 3000);
      setLoading(false);
      return;
    }

    const formattedNumbers = `{${selectedNumbers
      .map((num) => `"${num}"`)
      .join(",")}}`;

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignName,
          scheduleDatetime, // Include schedule datetime in the request body
          selectedCustomers,
          selectedNumbers: formattedNumbers,
        }),
      });

      const data = await response.json();
      if (data && data.campaignId) {
        setCampaignId(data.campaignId);
        alert(`Campaign created successfully! Campaign ID: ${data.campaignId}`);
        setLoading(false);

        // Hide show contacts section and reset form after 5 seconds
        setTimeout(() => {
          setCampaignName("");
          setScheduleDatetime(""); // Reset schedule datetime
          setSelectedCustomers([]);
          setSelectedNumbers([]);
          setNumbersForCustomers({});
          setCampaignId("");
          setError("");
          setShowContacts(false);
        }, 5000);
      } else {
        setError("Failed to create campaign");
        setTimeout(() => setError(""), 3000);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Error creating campaign.");
      setTimeout(() => setError(""), 3000);
      setLoading(false);
    }
  };

  return (
    <div className="campaign-setup-container">
      <h2 className="campaign-setup-header">Create Campaign</h2>

      {error && <div className="error-message">{error}</div>}

      <form className="campaign-setup-form" onSubmit={handleSubmit}>
        <div className="form_campaign_name">
          <label>Campaign Name</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            required
          />
        </div>

        {/* New Schedule Date & Time Input */}
        <div className="form_schedule_datetime">
          <label>Schedule Date & Time</label>
          <input
            type="datetime-local"
            value={scheduleDatetime}
            onChange={(e) => setScheduleDatetime(e.target.value)}
            required
          />
        </div>

        {/* (Rest of your existing code remains unchanged) */}
        <div className="customers-data">
          <div className="datas">
            <label>Customers</label>
            <div className="customer-list">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Customer Name</th>
                  </tr>
                </thead>
                <tbody>
                  {customerNames.map((customer, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          value={customer.customer_name}
                          checked={selectedCustomers.includes(
                            customer.customer_name
                          )}
                          onChange={handleCustomerSelection}
                        />
                      </td>
                      <td>{customer.customer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="show-contacts-button"
          onClick={fetchCustomerNumbers}
        >
          Show Contacts
        </button>

        {showContacts && (
          <div>
            <h3>Customer Contacts</h3>

            <table className="scrollable-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Number</th>
                  <th>Customer Name</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(numbersForCustomers).map(
                  ([customer, numbers]) =>
                    numbers.map((number, index) => (
                      <tr key={`${customer}-${index}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedNumbers.includes(
                              number.phoneNumber
                            )}
                            onChange={(e) =>
                              handleNumberSelection(e, number.phoneNumber)
                            }
                          />
                        </td>
                        <td>{number.phoneNumber}</td>
                        <td>{number.customerName}</td>
                        <td>{number.name}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>

            <div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="select-all-button"
              >
                {selectAll ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>
        )}

        <div>
          <button type="submit" disabled={loading}>
            {loading ? "Creating Campaign..." : "Create Campaign"}
          </button>
        </div>
      </form>

      {campaignId && (
        <div className="campaign-id">Campaign ID: {campaignId}</div>
      )}
    </div>
  );
};

export default CampaignSetup;
