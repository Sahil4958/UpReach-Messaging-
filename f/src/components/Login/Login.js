import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import config from '../config';

const Login = () => {
  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regErrorMessage, setRegErrorMessage] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // State to toggle between Login and Register
  const [isRegistering, setIsRegistering] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage(''); // clear any previous success messages
    setLoading(true);

    try {
      const apiUrl = config.apiBaseUrl;
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (response.status === 200) {
        console.log('Login successful');
        localStorage.setItem('userEmail', username);
        localStorage.setItem('username', data.username);

        // Optionally, fetch organization name
        const orgResponse = await fetch(`${apiUrl}/api/get-org-name?email=${username}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          localStorage.setItem('org_name', orgData.org_name);
        } else {
          console.error('Failed to fetch org_name');
        }

        navigate('/sideTabpanel');
      } else {
        setErrorMessage(data.message || 'Invalid login credentials');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setErrorMessage('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setRegErrorMessage("Passwords do not match.");
      return;
    }
    setRegErrorMessage('');
    setRegLoading(true);

    try {
      const apiUrl = config.apiBaseUrl;
      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          org_name: regOrgName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (response.status === 201 || response.status === 200) {
        console.log("Registration successful");
        // Instead of logging the user in automatically, we show a success message on the login form.
        setSuccessMessage("Registration successful. Please log in.");
        setIsRegistering(false);

        // Optionally, clear the registration form fields
        setRegName('');
        setRegEmail('');
        setRegOrgName('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setRegErrorMessage(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setRegErrorMessage("An error occurred during registration.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="left-column">
          <div className="brand-theme">
            <h1>UpReach</h1>
            <p>Your Gateway to Seamless Message Campaigns</p>
            <div className="animation-container">
              <div className="message-icon">✉️</div>
              <div className="animation-text">Send. Engage. Succeed.</div>
            </div>
          </div>
        </div>
        <div className="right-column">
          <div className="flip-card">
            <div className={`flip-card-inner ${isRegistering ? "flipped" : ""}`}>
              {/* Front: Login Form */}
              <div className="flip-card-front">
                <div className="login-form">
                  <h2>Login</h2>
                  {successMessage && <div className="success-message">{successMessage}</div>}
                  <form onSubmit={handleLogin}>
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="Email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                      {loading ? 'Loading...' : 'Login'}
                    </button>
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                  </form>
                  <div className="toggle-link">
                    Don't have an account?{" "}
                    <span onClick={() => setIsRegistering(true)}>Register</span>
                  </div>
                </div>
              </div>
              {/* Back: Register Form */}
              <div className="flip-card-back">
                <div className="register-form">
                  <h2>Register</h2>
                  <form onSubmit={handleRegister}>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="Email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Organization Name"
                        value={regOrgName}
                        onChange={(e) => setRegOrgName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="login-button" disabled={regLoading}>
                      {regLoading ? 'Loading...' : 'Register'}
                    </button>
                    {regErrorMessage && <div className="error-message">{regErrorMessage}</div>}
                  </form>
                  <div className="toggle-link">
                    Already have an account?{" "}
                    <span onClick={() => setIsRegistering(false)}>Login</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>    
    </div>
  );
};

export default Login;
