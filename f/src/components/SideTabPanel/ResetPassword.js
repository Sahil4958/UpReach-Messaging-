import { useState } from "react";
import "./resetPassword.css";
import axios from "axios";
import config from "../config";
import { toast,ToastContainer } from "react-toastify";
import {IoClose} from "react-icons/io5"

const ResetPassword = ({ isOpen, onClose }) => {
  const [value, setValue] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const email = localStorage.getItem("userEmail");
      if (!email || !value) {
        toast.error("Could not Found User Data!!" ,{position: "top-center"});
        return;
      }
      const formData = new FormData();
      formData.append("newPassword", value);
      formData.append("email", email);
      console.log(formData);
      const response = await axios.post(
        `${config.apiBaseUrl}/api/reset-password`,
        {
          newPassword: value,
          email,
        }
      );
      if (response.data?.success) {
        toast.success("Password has been set successfully",{position: "top-center"});
       
      } else {
        throw new Error("Could not change Password!!",{position: "top-center"});
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      onClose();
    }
  };
  return (
    <>
    <ToastContainer/>
      {isOpen && (
        <div className={`overlay ${isOpen ? "show" : ""}`}>
          <div className="form-container">
            <div className="logo-container">Reset Password</div>
            <IoClose className="close-icon" onClick={onClose} /> {/* Close Icon */}
            <form onSubmit={handleSubmit} method="post" className="form">
              <div className="form-group">
                <label for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <button className="form-submit-btn" type="submit">
                Reset Password
              </button>
            </form>
           
          </div>
        </div>
      )}
    </>
  );
};

export default ResetPassword;
