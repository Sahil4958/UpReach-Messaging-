// CampaignSetup.jsx
import React, { useState, useEffect } from "react";
import styles from "./CampaignSetup.module.css";
import config from "../../config";

const CampaignSetup = ({ campaignDetails, onCampaignCreated }) => {
  const { campaignName, scheduleDatetime } = campaignDetails;

  const [customerNames, setCustomerNames] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [numbersForCustomers, setNumbersForCustomers] = useState({});
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectAllCustomers, setSelectAllCustomers] = useState(true);
  const [selectAllNumbers, setSelectAllNumbers] = useState(true);

  useEffect(() => {
    const fetchCustomerNames = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      try {
        const response = await fetch(
          `${config.apiBaseUrl}/api/customers?email=${userEmail}`
        );
        const data = await response.json();
        if (data?.data) {
          setCustomerNames(data.data);
          setSelectedCustomers(data.data.map((customer) => customer.customer_name));
        } else {
          setError("No customers found.");
        }
      } catch {
        setError("Error fetching customer data.");
      } finally {
        setTimeout(() => setError(""), 3000);
      }
    };

    fetchCustomerNames();
  }, []);

  useEffect(() => {
    const fetchCustomerNumbers = async () => {
      if (selectedCustomers.length === 0) return;

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      const updatedNumbers = {};
      for (const customer of selectedCustomers) {
        try {
          const response = await fetch(
            `${config.apiBaseUrl}/api/customers/${customer}/numbers?email=${userEmail}`
          );
          const data = await response.json();
          if (data?.data) {
            updatedNumbers[customer] = data.data;
          }
        } catch {
          setError(`Error fetching numbers for ${customer}.`);
        }
      }

      setNumbersForCustomers(updatedNumbers);

      // Select all numbers by default
      const allNumbers = Object.values(updatedNumbers).flat().map((num) => num.phoneNumber);
      setSelectedNumbers(allNumbers);
    };

    fetchCustomerNumbers();
  }, [selectedCustomers]);

  const toggleSelectAllCustomers = async () => {
    if (selectAllCustomers) {
      // Deselect all customers and clear contacts asynchronously
      setSelectedCustomers([]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      setSelectedNumbers([]);
      setNumbersForCustomers({});
    } else {
      // Select all customers
      setSelectedCustomers(
        customerNames.map((customer) => customer.customer_name)
      );
    }
    setSelectAllCustomers(!selectAllCustomers);
  };
  
  const toggleSelectAllNumbers = () => {
    if (selectAllNumbers) {
      setSelectedNumbers([]);
    } else {
      const allNumbers = Object.values(numbersForCustomers).flat().map((num) => num.phoneNumber);
      setSelectedNumbers(allNumbers);
    }
    setSelectAllNumbers(!selectAllNumbers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setError("Email not found.");
      setLoading(false);
      return;
    }

    if (selectedNumbers.length === 0) {
      setError("Please select at least one phone number.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          selectedCustomers,
          selectedNumbers,
          scheduleDatetime,
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (data?.campaignId) {
        setCampaignId(data.campaignId);
        alert(`Campaign created successfully! ID: ${data.campaignId}`);
        onCampaignCreated({
          campaignId: data.campaignId,
          campaignName,
          selectedCustomers,
          selectedNumbers,
          scheduleDatetime,
        });
      } else {
        setError("Failed to create campaign.");
      }
    } catch (error) {
      console.error("API Error:", error);
      setError("Error creating campaign.");
    } finally {
      setLoading(false);
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className={styles.csu_container}>
      <h2 className={styles.csu_header}>Step 2: Campaign Setup</h2>
      {error && <div className={styles.csu_errorMessage}>{error}</div>}
  
      <form onSubmit={handleSubmit} className={styles.csu_form}>
        <div className={styles.csu_flexContainer}>
          {/* Customers Table */}
          <div className={styles.csu_customersData}>
            <h3>Customers ({selectedCustomers.length} Selected)</h3>
            <div className={styles.csu_scrollableTable}>
              <table className={styles.csu_table}>
                <thead
                  style={{
                    position: "sticky",
                    top: "0",
                    zIndex: 4,
                  }}
                >
                  <tr>
                    <th
                      style={{
                        position: "sticky",
                        top: "0",
                        backgroundColor: "#0e1083",
                        color: "#fff",
                        zIndex: 3,
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        className={styles.csu_selectAllCheckbox}
                        checked={selectAllCustomers}
                        onChange={toggleSelectAllCustomers}
                      />
                      Select
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: "0",
                        backgroundColor: "#0e1083",
                        color: "#fff",
                        zIndex: 2,
                      }}
                    >
                      Customer Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerNames.map((customer, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(
                            customer.customer_name
                          )}
                          onChange={() => {
                            setSelectedCustomers((prev) =>
                              prev.includes(customer.customer_name)
                                ? prev.filter(
                                    (name) => name !== customer.customer_name
                                  )
                                : [...prev, customer.customer_name]
                            );
                          }}
                        />
                      </td>
                      <td>{customer.customer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
  
          {/* Customer Contacts Table */}
          {Object.keys(numbersForCustomers).length > 0 && (
            <div className={styles.csu_contactsData}>
              <h3>Customer Contacts ({selectedNumbers.length} Selected)</h3>
              <div className={styles.csu_scrollableTable}>
                <table className={styles.csu_table}>
                  <thead
                    style={{
                      position: "sticky",
                      top: "0",
                      zIndex: 5,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          top: "0",
                          backgroundColor: "#0e1083",
                          color: "#fff",
                          zIndex: 4,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          className={styles.csu_selectAllCheckbox}
                          checked={selectAllNumbers}
                          onChange={toggleSelectAllNumbers}
                        />
                        Select
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          top: "0",
                          backgroundColor: "#0e1083",
                          color: "#fff",
                          zIndex: 3,
                        }}
                      >
                        Number
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          top: "0",
                          backgroundColor: "#0e1083",
                          color: "#fff",
                          zIndex: 2,
                        }}
                      >
                        Customer Name
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          top: "0",
                          backgroundColor: "#0e1083",
                          color: "#fff",
                          zIndex: 1,
                        }}
                      >
                        Name
                      </th>
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
                                onChange={(e) => {
                                  setSelectedNumbers((prev) =>
                                    e.target.checked
                                      ? [...prev, number.phoneNumber]
                                      : prev.filter(
                                          (num) => num !== number.phoneNumber
                                        )
                                  );
                                }}
                              />
                            </td>
                            <td>{number.phoneNumber}</td>
                            <td>{customer}</td>
                            <td>{number.name || "N/A"}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
  
        <div className={styles.csu_formSubmit}>
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>
  
      {campaignId && (
        <div className={styles.csu_successMessage}>
          Campaign created successfully! <strong>ID: {campaignId}</strong>
        </div>
      )}
    </div>
  );
  
  
};

export default CampaignSetup;
