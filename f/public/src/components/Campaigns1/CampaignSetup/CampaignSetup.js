import React, { useState, useEffect } from "react";
import styles from "./CampaignSetup.module.css";  // Import the CSS Module
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
  const [scheduleDatetime, setScheduleDatetime] = useState("");

  useEffect(() => {
    const fetchCustomerNames = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      try {
        const response = await fetch(`${config.apiBaseUrl}/api/customers?email=${userEmail}`);
        const data = await response.json();
        if (data && data.data) {
          setCustomerNames(data.data);
          const allCustomerNames = data.data.map((customer) => customer.customer_name);
          setSelectedCustomers(allCustomerNames);
        } else {
          setTimeout(() => setError(""), 3000);
        }
      } catch {
        setError("Error fetching customer data.");
        setTimeout(() => setError(""), 3000);
      }
    };
    fetchCustomerNames();
  }, []);

  useEffect(() => {
    const fetchCustomerNumbers = async (customerName) => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      try {
        const response = await fetch(`${config.apiBaseUrl}/api/customers/${customerName}/numbers?email=${userEmail}`);
        const data = await response.json();
        if (data && data.data) {
          setNumbersForCustomers((prev) => ({
            ...prev,
            [customerName]: data.data,
          }));
          const allNumbers = Object.values(data.data).flat().map((number) => number.phoneNumber);
          setSelectedNumbers((prev) => [...prev, ...allNumbers]);
        } else {
          setTimeout(() => setError(""), 3000);
        }
      } catch {
        setError("Error fetching customer numbers.");
        setTimeout(() => setError(""), 3000);
      }
    };
    selectedCustomers.forEach((customerName) => {
      fetchCustomerNumbers(customerName);
    });
  }, [selectedCustomers]);

  const handleCustomerSelection = (e) => {
    const { value, checked } = e.target;
    setSelectedCustomers((prev) => {
      let updatedSelection;
      if (checked) {
        updatedSelection = [...prev, value];
      } else {
        updatedSelection = prev.filter((customer) => customer !== value);
        setSelectedNumbers((prevNumbers) =>
          prevNumbers.filter((num) => !numbersForCustomers[value]?.find((n) => n.phoneNumber === num))
        );
      }
      return updatedSelection;
    });
  };

  const handleCustomerSelectAll = () => {
    if (selectedCustomers.length === customerNames.length) {
      setSelectedCustomers([]);
      setSelectedNumbers([]);
    } else {
      const allCustomerNames = customerNames.map((customer) => customer.customer_name);
      setSelectedCustomers(allCustomerNames);
    }
  };

  const handleNumberSelection = (e, phoneNumber) => {
    if (e.target.checked) {
      setSelectedNumbers((prev) => [...prev, phoneNumber]);
    } else {
      setSelectedNumbers((prev) => prev.filter((num) => num !== phoneNumber));
    }
  };

  const handleContactSelectAll = () => {
    const allNumbers = Object.values(numbersForCustomers).flat().map((number) => number.phoneNumber);
    setSelectedNumbers(selectedNumbers.length === allNumbers.length ? [] : allNumbers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      setError("Email not found in localStorage");
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

    const formattedNumbers = `{${selectedNumbers.map((num) => `"${num}"`).join(",")}}`;

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignName,
          selectedCustomers,
          selectedNumbers: formattedNumbers,
          scheduleDatetime,
          email: userEmail,
        }),
      });

      const data = await response.json();
      if (data && data.campaignId) {
        setCampaignId(data.campaignId);
        alert(`Campaign created successfully! Campaign ID: ${data.campaignId}`);
        setLoading(false);
        setTimeout(() => {
          setCampaignName("");
          setSelectedCustomers([]);
          setSelectedNumbers([]);
          setNumbersForCustomers({});
          setCampaignId("");
          setError("");
          setScheduleDatetime("");
        }, 5000);
      } else {
        setError("Failed to create campaign");
        setTimeout(() => setError(""), 3000);
        setLoading(false);
      }
    } catch {
      setError("Error creating campaign.");
      setTimeout(() => setError(""), 3000);
      setLoading(false);
    }
  };

  return (
    <div className={styles.csu_container}>
      <h2 className={styles.csu_header}>Create Campaign</h2>
      {error && <div className={styles.csu_errorMessage}>{error}</div>}
      <form className={styles.csu_form} onSubmit={handleSubmit}>
        <div className={styles.csu_formRow}>
          <div className={styles.csu_formCampaignName}>
            <label>Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className={styles.csu_inputText}
              required
            />
          </div>
          <div className={styles.csu_formScheduleDatetime}>
            <label>Schedule Date and Time</label>
            <input
              type="datetime-local"
              value={scheduleDatetime}
              onChange={(e) => setScheduleDatetime(e.target.value)}
              required
              className={styles.csu_inputDatetime}
            />
          </div>
        </div>

        <div className={styles.csu_customersData}>
          <h3>Customers</h3>
          <div className={styles.csu_scrollableTable}>
            <table className={styles.csu_table}>
              <thead>
                <tr>
                  <th>
                    <input
                      className={styles.csu_selectAllCheckbox}
                      type="checkbox"
                      onChange={handleCustomerSelectAll}
                      checked={selectedCustomers.length === customerNames.length}
                    />
                    Select All
                  </th>
                  <th>Customer Name</th>
                </tr>
              </thead>
              <tbody>
                {customerNames.map((customer, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        className={styles.csu_inputCheckbox}
                        type="checkbox"
                        value={customer.customer_name}
                        checked={selectedCustomers.includes(customer.customer_name)}
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

        {Object.keys(numbersForCustomers).length > 0 && (
          <div className={styles.csu_customerContacts}>
            <h3>Customer Contacts</h3>
            <div className={styles.csu_scrollableTable}>
              <table className={styles.csu_contactsTable}>
                <thead>
                  <tr>
                    <th>
                      <input
                        className={styles.csu_selectAllCheckbox}
                        type="checkbox"
                        onChange={handleContactSelectAll}
                        checked={selectedNumbers.length === Object.values(numbersForCustomers).flat().length}
                      />
                      Select All
                    </th>
                    <th>Number</th>
                    <th>Customer Name</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(numbersForCustomers).map(
                    ([customer, numbers]) =>
                      numbers.map((number, index) =>
                        selectedCustomers.includes(customer) && (
                          <tr key={`${customer}-${index}`}>
                            <td>
                              <input
                                className={styles.csu_inputCheckbox}
                                type="checkbox"
                                checked={selectedNumbers.includes(number.phoneNumber)}
                                onChange={(e) => handleNumberSelection(e, number.phoneNumber)}
                              />
                            </td>
                            <td>{number.phoneNumber}</td>
                            <td>{number.customerName}</td>
                            <td>{number.name}</td>
                          </tr>
                        )
                      )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.csu_formSubmit}>
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>

      {campaignId && (
        <div className={styles.csu_successMessage}>
          <span>
            Campaign created successfully!
            <span className={styles.csu_successId}>Campaign ID: {campaignId}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default CampaignSetup;
