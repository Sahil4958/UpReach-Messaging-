import React, { useState, useEffect } from 'react';
import './ViewContacts.css';
import config from '../../config';

const ViewContacts = () => {
  const [contactList, setContactList] = useState([]); // All contacts from the API
  const [filteredContacts, setFilteredContacts] = useState([]); // Contacts to display (filtered)
  const [customerList, setCustomerList] = useState([]); // List of unique customers for the dropdown
  const [selectedCustomer, setSelectedCustomer] = useState(''); // Selected customer for filtering
  const [searchTerm, setSearchTerm] = useState(''); // Search term for filtering contacts
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  // Fetch contacts from the backend on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        // Get the userEmail from localStorage
        const userEmail = localStorage.getItem('userEmail');
  
        if (!userEmail) {
          throw new Error('User email not found in localStorage.');
        }
  
        // Fetch contacts for the specific userEmail
        const response = await fetch(`${config.apiBaseUrl}/api/contacts?userEmail=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
  
        if (response.ok) {
          setContactList(data.data);
          setFilteredContacts(data.data); // Initially, show all contacts
  
          // Extract unique customer names for the dropdown
          const customers = Array.from(new Set(data.data.map(contact => contact.customer_name)));
          setCustomerList(customers);
  
          setLoading(false);
        } else {
          throw new Error(data.message || 'Failed to fetch contacts.');
        }
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };
  
    fetchContacts();
  }, []);
  

  // Filter contacts by selected customer and search term
// Filter contacts by selected customer and search term
useEffect(() => {
  let updatedContacts = contactList;

  // Filter by selected customer
  if (selectedCustomer) {
    updatedContacts = updatedContacts.filter(contact => contact.customer_name === selectedCustomer);
  }

  // Filter by search term (searching in the specified headers)
  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    updatedContacts = updatedContacts.filter(contact =>
      (contact.customer_name && contact.customer_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (contact.name && contact.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (contact.title && contact.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (contact.phone && contact.phone.includes(lowerCaseSearchTerm)) 
    );
  }

  setFilteredContacts(updatedContacts);
}, [selectedCustomer, searchTerm, contactList]);


  return (
    <div className="view-contacts">
      <h3>Contact List</h3>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by Customer Name, Contact Name, Title, Phone Number, or Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Dropdown to select a customer */}
      <div className="customer-dropdown">
        <label htmlFor="customer">Customer:</label>
        <select
          id="customer"
          name="customer"
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">All Customers</option>
          {customerList.map((customer, index) => (
            <option key={index} value={customer}>
              {customer}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading contacts...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <div className="table1-container">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Name</th>
                <th>Title</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact, index) => (
                  <tr key={index}>
                    <td>{contact.customer_name}</td>
                    <td>{contact.name}</td>
                    <td>{contact.title}</td>
                    <td>{contact.country_code} {contact.phone}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No contacts available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewContacts;
