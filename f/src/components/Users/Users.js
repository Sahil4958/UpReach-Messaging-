import React, { useEffect, useState } from 'react';
import config from '../config'; // Import the config
import './Users.css';
import { ToastContainer, toast } from 'react-toastify'; // Import Toastify
import 'react-toastify/dist/ReactToastify.css'; // Import Toastify CSS

const UsersTab = () => {
  const [canAccess, setCanAccess] = useState(false);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('normal');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkUserRole = async () => {
      const userEmail = localStorage.getItem('userEmail'); // Retrieve email from localStorage

      if (!userEmail) {
        console.error('User email not found in localStorage.');
        return;
      }

      try {
        const response = await fetch(`${config.apiBaseUrl}/api/check-role`, {
          method: 'GET',
          headers: {
            'x-user-email': userEmail,
          },
        });

        const data = await response.json();

        if (data.access) {
          setCanAccess(true); // User can access the "Users" tab
        } else {
          setCanAccess(false); // Access denied
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create user object to send to backend
    const newUser = {
      username,
      email: userEmail,
      password,
      role: userRole,
    };

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (data.success) {
        // Show success toast
        toast.success('Awesome! User created successfully!', {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });

        // Optionally reset form after successful submission
        setUsername('');
        setUserEmail('');
        setPassword('');
        setUserRole('normal');
      } else {
        setMessage('Failed to create user: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage('An error occurred while creating the user.');
    }
  };

  if (!canAccess) {
    return <div className="access-restricted">Access to the Users tab is restricted.</div>;
  }

  return (
    <div className="create-user-form">
      <div className="form-title">
        Create a New User<br /><span>Fill in the details</span>
      </div>
      <form onSubmit={handleSubmit} className="user-form" autoComplete="off">
        <input
          className="form-input"
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          autoComplete="off"
        />
        <input
          className="form-input"
          type="email"
          id="userEmail"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="new-email"  // Prevent autofill for email field
        />
        <input
          className="form-input"
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoComplete="new-password"  // Prevent autofill for password field
        />
        <div className="input-group">
          <label htmlFor="userRole" className="input-label">User Role:</label>
          <select
            id="userRole"
            className="form-input"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="privileged">Privileged</option>
          </select>
        </div>

        <button type="submit" className="submit-btn">Create User</button>
      </form>

      {message && (
  <div className={`toast ${message.type}`}>
    {message.text}
    <button className="toast-close-btn" onClick={() => setMessage('')}>×</button>
  </div>
)}

      {/* Add ToastContainer here to display notifications */}
      <ToastContainer />
    </div>
  );
};

export default UsersTab;
