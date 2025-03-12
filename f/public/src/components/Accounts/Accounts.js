import React, { useEffect, useState } from 'react';
import config from '../config';
import Comp from './comp';

const Accounts = () => {
  // State for form fields and customer list
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  const [customerList, setCustomerList] = useState([]);

  // Track the window width for responsive inline styles
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine breakpoints
  const isMobile = windowWidth <= 767;
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;

  // Base container styles, modified based on device size
  const containerStyle = {
    padding: '20px', // Adjust as needed
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection:'column',
  };
  

  const formContainerStyle = {
    backgroundColor: '#ffffff',
    padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
    borderRadius: '15px',
    boxShadow: '0 15px 45px rgba(0, 0, 0, 0.1)',
    marginTop: '20px',
    width: '100%',
    maxWidth: isMobile ? '100%' : '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    transition: 'box-shadow 0.3s ease',
  };

  const formTitleStyle = {
    fontSize: isMobile ? '24px' : '32px',
    color: '#003d94',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '15px',
  };

  const inputRowStyle = {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: isMobile ? 'center' : 'space-between',
    flexDirection: isMobile ? 'column' : 'row',
  };

  const inputGroupStyle = {
    flex: '1',
    minWidth: '250px',
    display: 'flex',
    flexDirection: 'column',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
    marginBottom: '20px',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease',
  };

  const buttonRowStyle = {
    display: 'flex',
    gap: '20px',
    justifyContent: isMobile ? 'center' : 'space-between',
    flexDirection: isMobile ? 'column' : 'row',
  };

  const saveButtonStyle = {
    padding: '14px 30px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: isMobile ? '100%' : '48%',
    backgroundColor: '#003d94',
    color: 'white',
    border: 'none',
  };

  const clearButtonStyle = {
    padding: '14px 30px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: isMobile ? '100%' : '48%',
    backgroundColor: '#f1f1f1',
    color: 'white',
    border: '1px solid #ddd',
  };

  const customerListContainerStyle = {
    marginTop: '50px',
    width: '100%',
    maxWidth: isMobile ? '100%' : '1200px',
    padding: isMobile ? '20px' : isTablet ? '25px' : '30px',
    backgroundColor: '#ffffff',
    borderRadius: '15px',
    boxShadow: '0 15px 45px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const listTitleStyle = {
    fontSize: isMobile ? '24px' : '28px',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '20px',
  };

  const tableContainerStyle = {
    width: '100%',
    maxHeight: '240px',
    overflowY: 'auto',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const thStyle = {
    padding: '14px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: 'white',
    borderBottom: '2px solid #ddd',
    backgroundColor: 'rgb(0, 61, 148)',
    textTransform: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };

  const tdStyle = {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #ddd',
  };

  // Fetch stored email and customer accounts on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setEmail(storedEmail);
      fetchCustomerAccounts(storedEmail);
    }
  }, []);

  const fetchCustomerAccounts = async (userEmail) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/customer?email=${userEmail}`);
      const data = await response.json();
      if (data.data) {
        setCustomerList(data.data);
      }
    } catch (err) {
      console.error('Error fetching customer accounts:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newCustomer = {
      email,
      customerName,
      customerEmail,
      industry,
      subdomain,
      natureOfBusiness,
    };

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      const data = await response.json();
      if (data.data) {
        setCustomerName('');
        setCustomerEmail('');
        setIndustry('');
        setSubdomain('');
        setNatureOfBusiness('');
        fetchCustomerAccounts(email);
      } else {
        alert('Error saving customer details');
      }
    } catch (err) {
      console.error('Error saving customer details:', err);
    }
  };

  const handleClear = () => {
    setCustomerName('');
    setCustomerEmail('');
    setIndustry('');
    setSubdomain('');
    setNatureOfBusiness('');
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        <h3 style={formTitleStyle}>Company Account Setup</h3>
        <form onSubmit={handleSubmit}>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label htmlFor="customerName" style={labelStyle}>
                Company Name: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={inputGroupStyle}>
              <label htmlFor="industry" style={labelStyle}>
                Industry: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={inputGroupStyle}>
              <label htmlFor="natureOfBusiness" style={labelStyle}>
                Nature of Business: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="natureOfBusiness"
                value={natureOfBusiness}
                onChange={(e) => setNatureOfBusiness(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label htmlFor="customerEmail" style={{ ...labelStyle, marginTop: '20px' }}>
                Company Email:
              </label>
              <input
                type="email"
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{ ...inputStyle, marginBottom: '20px' }}
              />
            </div>
            <div style={inputGroupStyle}>
              <label htmlFor="subdomain" style={{ ...labelStyle, marginTop: '20px' }}>
                Subdomain:
              </label>
              <input
                type="text"
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={buttonRowStyle}>
            <button type="submit" style={saveButtonStyle}>
              Save
            </button>
            <button type="button" style={clearButtonStyle} onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      </div>

      <div style={customerListContainerStyle}>
        <h3 style={listTitleStyle}>Customer List</h3>
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Company Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Industry</th>
                <th style={thStyle}>Subdomain</th>
                <th style={thStyle}>Nature of Business</th>
              </tr>
            </thead>
            <tbody>
              {customerList.map((customer, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{customer.customer_name}</td>
                  <td style={tdStyle}>{customer.customer_email}</td>
                  <td style={tdStyle}>{customer.industry}</td>
                  <td style={tdStyle}>{customer.subdomain}</td>
                  <td style={tdStyle}>{customer.nature_of_business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Comp />
    </div>
  );
};

export default Accounts;
