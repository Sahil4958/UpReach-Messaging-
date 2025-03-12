import React, { useState, useEffect } from "react";
import "./UsingForm.css"; // Add your CSS styling here
import config from "../../config"; // Import the config file

const UsingForm = () => {
  const [formData, setFormData] = useState({
    customer: "",
    name: "",
    title: "",
    countryCode: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [contactList, setContactList] = useState([]); // To store added contacts
  const [customers, setCustomers] = useState([]); // To store the customer list from the API
  const [loading, setLoading] = useState(true); // Track loading state
  const [error, setError] = useState(null); // To track any API errors

  const [countryCodes] = useState([
    { code: "+93", name: "Afghanistan" },
    { code: "+355", name: "Albania" },
    { code: "+213", name: "Algeria" },
    { code: "+376", name: "Andorra" },
    { code: "+244", name: "Angola" },
    { code: "+1-268", name: "Antigua and Barbuda" },
    { code: "+54", name: "Argentina" },
    { code: "+374", name: "Armenia" },
    { code: "+61", name: "Australia" },
    { code: "+43", name: "Austria" },
    { code: "+994", name: "Azerbaijan" },
    { code: "+1-242", name: "Bahamas" },
    { code: "+973", name: "Bahrain" },
    { code: "+880", name: "Bangladesh" },
    { code: "+1-246", name: "Barbados" },
    { code: "+375", name: "Belarus" },
    { code: "+32", name: "Belgium" },
    { code: "+501", name: "Belize" },
    { code: "+229", name: "Benin" },
    { code: "+975", name: "Bhutan" },
    { code: "+591", name: "Bolivia" },
    { code: "+387", name: "Bosnia and Herzegovina" },
    { code: "+267", name: "Botswana" },
    { code: "+55", name: "Brazil" },
    { code: "+673", name: "Brunei" },
    { code: "+359", name: "Bulgaria" },
    { code: "+226", name: "Burkina Faso" },
    { code: "+257", name: "Burundi" },
    { code: "+238", name: "Cabo Verde" },
    { code: "+855", name: "Cambodia" },
    { code: "+237", name: "Cameroon" },
    { code: "+1", name: "Canada" },
    { code: "+236", name: "Central African Republic" },
    { code: "+235", name: "Chad" },
    { code: "+56", name: "Chile" },
    { code: "+86", name: "China" },
    { code: "+57", name: "Colombia" },
    { code: "+269", name: "Comoros" },
    { code: "+242", name: "Congo (Congo-Brazzaville)" },
    { code: "+506", name: "Costa Rica" },
    { code: "+385", name: "Croatia" },
    { code: "+53", name: "Cuba" },
    { code: "+357", name: "Cyprus" },
    { code: "+420", name: "Czechia (Czech Republic)" },
    { code: "+45", name: "Denmark" },
    { code: "+253", name: "Djibouti" },
    { code: "+1-767", name: "Dominica" },
    { code: "+1-809", name: "Dominican Republic" },
    { code: "+593", name: "Ecuador" },
    { code: "+20", name: "Egypt" },
    { code: "+503", name: "El Salvador" },
    { code: "+240", name: "Equatorial Guinea" },
    { code: "+291", name: "Eritrea" },
    { code: "+372", name: "Estonia" },
    { code: "+268", name: 'Eswatini (fmr. "Swaziland")' },
    { code: "+251", name: "Ethiopia" },
    { code: "+679", name: "Fiji" },
    { code: "+358", name: "Finland" },
    { code: "+33", name: "France" },
    { code: "+241", name: "Gabon" },
    { code: "+220", name: "Gambia" },
    { code: "+995", name: "Georgia" },
    { code: "+49", name: "Germany" },
    { code: "+233", name: "Ghana" },
    { code: "+30", name: "Greece" },
    { code: "+1-473", name: "Grenada" },
    { code: "+502", name: "Guatemala" },
    { code: "+224", name: "Guinea" },
    { code: "+592", name: "Guyana" },
    { code: "+509", name: "Haiti" },
    { code: "+504", name: "Honduras" },
    { code: "+36", name: "Hungary" },
    { code: "+354", name: "Iceland" },
    { code: "+91", name: "India" },
    { code: "+62", name: "Indonesia" },
    { code: "+98", name: "Iran" },
    { code: "+964", name: "Iraq" },
    { code: "+353", name: "Ireland" },
    { code: "+972", name: "Israel" },
    { code: "+39", name: "Italy" },
    { code: "+1-876", name: "Jamaica" },
    { code: "+81", name: "Japan" },
    { code: "+962", name: "Jordan" },
    { code: "+7", name: "Kazakhstan" },
    { code: "+254", name: "Kenya" },
    { code: "+965", name: "Kuwait" },
    { code: "+996", name: "Kyrgyzstan" },
    { code: "+856", name: "Laos" },
    { code: "+371", name: "Latvia" },
    { code: "+961", name: "Lebanon" },
    { code: "+266", name: "Lesotho" },
    { code: "+231", name: "Liberia" },
    { code: "+218", name: "Libya" },
    { code: "+423", name: "Liechtenstein" },
    { code: "+370", name: "Lithuania" },
    { code: "+352", name: "Luxembourg" },
    { code: "+261", name: "Madagascar" },
    { code: "+265", name: "Malawi" },
    { code: "+60", name: "Malaysia" },
    { code: "+960", name: "Maldives" },
    { code: "+223", name: "Mali" },
    { code: "+356", name: "Malta" },
    { code: "+52", name: "Mexico" },
    { code: "+377", name: "Monaco" },
    { code: "+976", name: "Mongolia" },
    { code: "+212", name: "Morocco" },
    { code: "+258", name: "Mozambique" },
    { code: "+95", name: "Myanmar (Burma)" },
    { code: "+264", name: "Namibia" },
    { code: "+977", name: "Nepal" },
    { code: "+31", name: "Netherlands" },
    { code: "+64", name: "New Zealand" },
    { code: "+234", name: "Nigeria" },
    { code: "+47", name: "Norway" },
    { code: "+968", name: "Oman" },
    { code: "+92", name: "Pakistan" },
    { code: "+63", name: "Philippines" },
    { code: "+48", name: "Poland" },
    { code: "+351", name: "Portugal" },
    { code: "+974", name: "Qatar" },
    { code: "+40", name: "Romania" },
    { code: "+7", name: "Russia" },
    { code: "+966", name: "Saudi Arabia" },
    { code: "+65", name: "Singapore" },
    { code: "+27", name: "South Africa" },
    { code: "+82", name: "South Korea" },
    { code: "+34", name: "Spain" },
    { code: "+94", name: "Sri Lanka" },
    { code: "+46", name: "Sweden" },
    { code: "+41", name: "Switzerland" },
    { code: "+66", name: "Thailand" },
    { code: "+90", name: "Turkey" },
    { code: "+971", name: "United Arab Emirates" },
    { code: "+44", name: "United Kingdom" },
    { code: "+1", name: "United States" },
    { code: "+84", name: "Vietnam" },
    { code: "+260", name: "Zambia" },
    { code: "+263", name: "Zimbabwe" },
  ]);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  // Example country codes

  // Fetch customers from the backend when the component mounts
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Retrieve email from localStorage
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          setError('Email is not available in localStorage!');
          setLoading(false);
          return;
        }

        // Fetch customers from the backend using the email
        const response = await fetch(`${config.apiBaseUrl}/api/customers?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();

        if (response.ok) {
          setCustomers(data.data); // Set the fetched customer list
          setLoading(false); // Set loading to false once data is fetched
        } else {
          throw new Error(data.message || 'Failed to fetch customers');
        }
      } catch (error) {
        setError(error.message); // Store the error message
        setLoading(false); // Stop loading
      }
    };

    fetchCustomers();
  }, []); // Empty dependency array ensures this runs once after the component mounts
   // Empty dependency array ensures this runs once when the component mounts

  // Fetch contacts when the component mounts or when a new contact is added
  useEffect(() => {
    const fetchContacts = async () => {
      if (!selectedCustomerName) {
        setError(null); // Clear any previous errors when a new customer is selected
        return;
      }
  
      try {
        // Fetch contacts for the selected customer
        const response = await fetch(
          `${config.apiBaseUrl}/api/contacts1?customerName=${selectedCustomerName}`
        );
        const data = await response.json();
  
        if (response.ok) {
          setContactList(data.data || []); // Use an empty array if no data is returned
        } else {
          setContactList([]); // Ensure contactList is empty on error
          throw new Error(data.message || "Failed to fetch contacts");
        }
      } catch (error) {
        setError(error.message); // Store the error message
      }
    };
  
    fetchContacts();
  }, [selectedCustomerName]);
  // This effect depends on selectedCustomerName
   // Runs once when the component mounts

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
   // Handle customer selection change
   const handleCustomerChange = (e) => {
    const { value } = e.target;
    setFormData({ ...formData, customer: value });
    setSelectedCustomerName(value || ""); // Set to an empty string if no customer is selected
  };
  
  // Basic validation function
  const validateForm = () => {
    let formErrors = {};
    if (!formData.customer) formErrors.customer = "Customer is required";
    if (!formData.name) formErrors.name = "Name is required";
    if (!formData.title) formErrors.title = "Title is required";
    if (!formData.countryCode)
      formErrors.countryCode = "Country code is required";
    if (!formData.phone) formErrors.phone = "Phone number is required";

    // Phone number validation (basic pattern)
    const phonePattern = /^[0-9]{10}$/;
    if (formData.phone && !phonePattern.test(formData.phone)) {
      formErrors.phone = "Please enter a valid 10-digit phone number";
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Get the email from localStorage
      const userEmail = localStorage.getItem("userEmail");

      // Add the email to the form data
      const formDataWithEmail = { ...formData, email: userEmail };

      try {
        // Send form data to the backend API to store it in the database
        const response = await fetch(`${config.apiBaseUrl}/api/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataWithEmail), // Send the form data with email as JSON
        });

        const data = await response.json();

        if (response.ok) {
          // Handle successful form submission (you can clear the form or show a success message)
          setContactList([...contactList, formData]);
          setFormData({
            customer: "",
            name: "",
            title: "",
            countryCode: "",
            phone: "",
          });
          setErrors({});
          alert("Contact saved successfully!");
        } else {
          // Handle errors
          alert(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error("Error saving contact:", error);
        alert("An error occurred while saving the contact.");
      }
    }
  };

  return (
    <div className="using-form">
      <h3>Contact Set Up Form</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
        <div className="form-group">
            <label htmlFor="customer">Customer:</label>
<select
  id="customer"
  name="customer"
  value={formData.customer}
  onChange={(e) => {
    // Clear any previous error when a new customer is selected
    setError(null); // Assuming setError is the function to clear the error
    handleCustomerChange(e); // Continue with your existing customer change handler
  }}
>
  <option value="">Select Customer</option>
  {loading ? (
    <option value="" disabled>
      Loading customers...
    </option>
  ) : (
    customers.map((customer, index) => (
      <option key={index} value={customer.customer_name}>
        {customer.customer_name}
      </option>
    ))
  )}
</select>
{error && !loading && (
  <p className="error-message">{`Error: ${error}`}</p>
)}



            {errors.customer && (
              <span className="error">{errors.customer}</span>
            )}
        </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Contact Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="countryCode">Country Code:</label>
            <select
              id="countryCode"
              name="countryCode"
              value={formData.countryCode}
              onChange={handleInputChange}
            >
              <option value="">Select Country Code</option>
              {countryCodes.map((country, index) => (
                <option key={index} value={country.code}>
                  {country.code} - {country.name}
                </option>
              ))}
            </select>
            {errors.countryCode && (
              <span className="error">{errors.countryCode}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>
        </div>

        <button type="submit">Save</button>
      </form>

      {/* Show contact list only if a customer is selected */}
      {formData.customer && (
        <div className="contact-list">
          <h4>Contact List</h4>
          {contactList.length > 0 ? (
            <div className="table-container">
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
                  {contactList.map((contact, index) => (
                    <tr key={index}>
                      <td>{contact.customer_name}</td>
                      <td>{contact.name}</td>
                      <td>{contact.title}</td>
                      <td>
                        {contact.country_code}
                        {contact.phone}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No contacts added yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UsingForm;
