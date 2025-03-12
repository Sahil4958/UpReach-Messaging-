import React, { useState, useEffect } from "react";
import "./UsingExcelUpload.css"; // Add your CSS styling here
import config from "../../config"; // Import the config file
import * as XLSX from "xlsx";

const UsingExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [contacts, setContacts] = useState([]); // Store contacts list

  const uploadContacts = async (contacts) => {
    const userEmail = localStorage.getItem("userEmail");
    console.log("User Email from Local Storage:", userEmail);

    if (!userEmail) {
      alert("User email is missing. Please log in again.");
      return false;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/upload-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail, // Use consistent header key
        },
        body: JSON.stringify({ contacts }),
      });

      console.log("Form Data Being Sent:", JSON.stringify({ contacts }));

      const data = await response.json();

      if (response.ok) {
        return true;
      } else {
        if (
          data.message.includes("Limit reached") ||
          data.message.includes("only add")
        ) {
          alert(data.message); // Show alert for limit-related messages
        } else {
          alert(data.message || "Failed to upload contacts.");
        }
        return false;
      }
    } catch (error) {
      console.error(" Error uploading contacts:", error);
      alert("An error occurred while uploading contacts.");
      return false;
    }
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Retrieve email from localStorage
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          setErrors(["Email is not available in localStorage!"]);
          return;
        }

        // Fetch customers from the backend using the email
        const response = await fetch(
          `${config.apiBaseUrl}/api/customers?email=${encodeURIComponent(
            userEmail
          )}`
        );
        const data = await response.json();

        if (response.ok) {
          setCustomers(data.data); // Only the customer names will be stored in customers
        } else {
          throw new Error(data.message || "Failed to fetch customers");
        }
      } catch (error) {
        setErrors([error.message]);
      }
    };

    fetchCustomers();
  }, []); // Empty dependency array ensures this runs once after the component mounts

  // Fetch contacts from the backend
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          setErrors(["Email is not available in localStorage!"]);
          return;
        }

        const response = await fetch(
          `${config.apiBaseUrl}/api/contacts?userEmail=${encodeURIComponent(
            userEmail
          )}`
        );
        const data = await response.json();

        if (response.ok) {
          setContacts(data.data);
        } else {
          throw new Error(data.message || "No contacts found");
        }
      } catch (error) {
        setErrors([error.message]);
      }
    };

    fetchContacts();
  }, []);

  const handleCustomerChange = (e) => {
    setSelectedCustomer(e.target.value);
    setErrors([]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
    }
  };

  const handleFileUpload = () => {
    if (!file) {
      alert("Please select an Excel file first!");
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const binaryData = event.target.result;
      const workbook = XLSX.read(binaryData, { type: "binary" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Add "+" to each CountryCode if missing
      const formattedData = jsonData.map((row) => {
        const countryCode = String(row.CountryCode || ""); // Ensure CountryCode is a string
        return {
          ...row,
          CountryCode: countryCode.startsWith("+")
            ? countryCode
            : `+${countryCode}`,
        };
      });

      console.log("Parsed and formatted Excel Data:", formattedData);

      const validationErrors = validateExcelData(formattedData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
      } else {
        setExcelData(formattedData);
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validateExcelData = (data) => {
    const errors = [];

    data.forEach((row, index) => {
      const { Name, Title, CountryCode, Phone } = row;

      if (!Name || !Title || !CountryCode || !Phone) {
        errors.push(`Row ${index + 1}: Missing required fields.`);
      }

      // Ensure Phone is a string before applying replace
      const cleanedPhone = String(Phone).replace(/[^0-9+]/g, ""); // Convert Phone to string and clean it

      // Validate phone number format after cleaning
      const phonePattern = /^[0-9]{10}$/;
      if (cleanedPhone && !phonePattern.test(cleanedPhone)) {
        errors.push(`Row ${index + 1}: Invalid phone number format.`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (excelData.length === 0) {
      alert("No valid data to submit!");
      return;
    }

    try {
      setLoading(true);

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        alert("Email is not available in localStorage!");
        setLoading(false);
        return;
      }

      if (!selectedCustomer) {
        alert("Please select a customer!");
        setLoading(false);
        return;
      }

      const formData = excelData.map((row) => ({
        name: row.Name,
        title: row.Title,
        country_code: row.CountryCode,
        phone: row.Phone,
        email: userEmail,
        customer_name: selectedCustomer,
      }));

      await uploadContacts(formData);
      const response = await fetch(`${config.apiBaseUrl}/api/contact/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error saving contact");
      }

      alert("Contacts uploaded successfully!");
      setExcelData([]);
      setLoading(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setExcelData([]);
    setSelectedCustomer("");
    setErrors([]);
  };

  // Filtered contacts for the selected customer
  const filteredContacts = contacts.filter(
    (contact) => contact.customer_name === selectedCustomer
  );

  useEffect(() => {
    const downloadButton = document.getElementById("download-template-button");
    const handleDownloadClick = () => {
      const templateFilePath = "/Upreach.xlsx"; // Correct path from the public folder

      // Create a hidden anchor element to trigger the download
      const anchor = document.createElement("a");
      anchor.href = templateFilePath;
      anchor.download = "template.xlsx"; // This sets the filename for download
      anchor.click();
    };

    if (downloadButton) {
      downloadButton.addEventListener("click", handleDownloadClick);
    }

    // Cleanup function to remove event listener when the component unmounts
    return () => {
      if (downloadButton) {
        downloadButton.removeEventListener("click", handleDownloadClick);
      }
    };
  }, []);

  return (
    <div className="using-excel-upload">
      <h3>Upload Contacts Using Excel</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="customer">Customer:</label>
          <select
            id="customer"
            name="customer"
            value={selectedCustomer}
            onChange={handleCustomerChange}
          >
            <option value="">Select Customer</option>
            {customers.length > 0 ? (
              customers.map((customer, index) => (
                <option key={index} value={customer.customer_name}>
                  {customer.customer_name}
                </option>
              ))
            ) : (
              <option value="">Loading customers...</option>
            )}
          </select>
          {errors.length > 0 && (
            <div className="error">
              {errors.map((err, idx) => (
                <p key={idx}>{err}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="upload-section">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <button
          onClick={handleFileUpload}
          disabled={loading}
          style={{
            display: "inline-block",
            marginTop: "15px",
            width: "48%",
            textAlign: "center",
            borderRadius: "8px",
            marginRight: "4%",
          }}
        >
          {loading ? "Processing..." : "Upload Excel File"}
        </button>
      </div>

      <div
        className="button-container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "10px",
        }}
      >
        <button
          id="download-template-button"
          style={{
            width: "48%",
            textAlign: "center",
            borderRadius: "8px",
          }}
        >
          Download Template
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || excelData.length === 0}
          style={{
            width: "48%",
            textAlign: "center",
            borderRadius: "8px",
            marginRight: "10px",
          }}
        >
          {loading ? "Saving Contacts..." : "Save"}
        </button>

        <button
          onClick={handleClear}
          disabled={loading}
          style={{
            width: "48%",
            textAlign: "center",
            borderRadius: "8px",
          }}
        >
          Clear
        </button>
      </div>

      {excelData.length > 0 && (
        <div className="excel-data">
          <h4>Extracted Data</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Country Code</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {excelData.map((row, index) => (
                <tr key={index}>
                  <td>{row.Name}</td>
                  <td>{row.Title}</td>
                  <td>{row.CountryCode}</td>
                  <td>{row.Phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && (
        <div className="contacts-list">
          <h4 style={{ marginTop: "30px" }}>Contact List</h4>
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Name</th>
                <th>Title</th>
                <th>Country Code</th>
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
                    <td>{contact.country_code}</td>
                    <td>{contact.phone}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    No contacts available for the selected customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsingExcelUpload;
