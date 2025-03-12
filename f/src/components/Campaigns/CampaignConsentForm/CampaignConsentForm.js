import React, { useState, useEffect } from 'react';
import config from '../../config';

const CampaignConsentForm = () => {
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Retrieve the email from localStorage
        const email = localStorage.getItem('userEmail');
        
        // Make the API request, including the email as a query parameter or in the headers
        const response = await fetch(`${config.apiBaseUrl}/api/customers?email=${email}`);
        const data = await response.json();

        if (response.ok) {
          const customers = data.data.map((item) => item.customer_name);
          setCustomerList(customers);
          setLoading(false);
        } else {
          throw new Error(data.message || 'Failed to fetch customers');
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Get email from localStorage
    const email = localStorage.getItem('userEmail');
    
    if (!selectedCustomer || !consentAccepted) {
      alert('Please select a customer and accept the consent terms.');
      return;
    }

    if (email) {
      alert(`Consent form accepted for ${selectedCustomer} by ${email}`);
    } else {
      alert('Email not found.');
    }

    setSelectedCustomer('');
    setConsentAccepted(false);
  };

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#f9f9f9',
    },
    header: {
      textAlign: 'center',
      fontSize: '24px',
      marginBottom: '20px',
    },
    error: {
      color: 'red',
      fontSize: '14px',
      marginBottom: '10px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
    },
    select: {
      width: '100%',
      padding: '8px',
      fontSize: '14px',
      border: '1px solid #ccc',
      borderRadius: '4px',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
    },
    submitButton: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#007BFF',
      color: 'white',
      fontSize: '16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      textAlign: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
    consentText: {
      fontSize: '14px',
      marginBottom: '15px',
    },
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Campaign Consent Form</h3>

      {loading ? (
        <p>Loading customers...</p>
      ) : error ? (
        <p style={styles.error}>Error: {error}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="customer" style={styles.label}>
              Select Customer:
            </label>
            <select
              id="customer"
              name="customer"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Select a Customer --</option>
              {customerList.map((customer, index) => (
                <option key={index} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.consentText}>
            <p>
              By accepting this form, you agree to allow us to send promotional campaigns to your contacts.
              Campaigns will be managed responsibly and within compliance with the applicable regulations.
              For more details, please contact our support team.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              I accept the terms and conditions
            </label>
          </div>

          <div style={styles.formGroup}>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(selectedCustomer && consentAccepted
                  ? {}
                  : styles.submitButtonDisabled),
              }}
              disabled={!selectedCustomer || !consentAccepted}
            >
              Submit Consent
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CampaignConsentForm;
