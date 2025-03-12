import "./profile.css";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import config from "../config";
import { IoClose } from "react-icons/io5";

const Profile = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false); // Upload state for feedback
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/user/${username}`);
        setUser(response.data.user);
        const userData = response.data.user;
      if (userData) {
        setUser(userData);

        if (response.data.user?.profile_url) {
          localStorage.setItem("profileUrl", `${config.apiBaseUrl}${response.data.user.profile_url}`);
        } else {
          localStorage.removeItem("profileUrl"); // Remove if no profile_url in DB
        }

      } else {
        setUser(null); // Clear user state
        localStorage.removeItem("profileUrl"); // Remove stale data if no user in DB
      }

    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null); // Ensure state is cleared on error
      localStorage.removeItem("profileUrl"); // Clear stale local data
    }
    };
    if (username) fetchUserProfile();
  }, [username]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", selectedFile);
    setUploading(true);

    try {
      const response = await axios.post(
        `${config.apiBaseUrl}/api/upload-photo/${username}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const updatedUrl = `${config.apiBaseUrl}${response.data.photoUrl}`;
      setUser((prevUser) => ({ ...prevUser, profile_url: response.data.photoUrl }));
      localStorage.setItem("profileUrl", updatedUrl);
      toast.success("Photo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Try again.");
    } finally {
      setUploading(false);
      setSelectedFile(null); // Reset file input
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal open">
      <div className="profile-content">
        <IoClose className="close-button" onClick={onClose} />
        <h2>User Profile</h2>

        {user ? (
          <>
            {user.profile_url ? (
              <img src={`${config.apiBaseUrl}${user.profile_url}`} alt="Profile" className="profile-photo" />
            ) : (
              <p>No profile photo uploaded.</p>
            )}
            <h3>{user.username}</h3>
            <p>Email: {user.email}</p>
            <p>Role: {user.user_role}</p>

            <form onSubmit={handleUpload}>
              <input
                type="file"
                accept="image/jpeg, image/png, image/gif, image/jpg"
                onChange={handleFileChange}
              />
              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
            </form>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
