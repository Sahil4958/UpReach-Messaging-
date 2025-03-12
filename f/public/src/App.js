// src/App.js

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SideTabPanel from "./components/SideTabPanel/SideTabPanel";
import Login from "./components/Login/Login";

import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sideTabpanel/*" element={<SideTabPanel />} />
         
        </Routes>
      </div>
    </Router>
  );
}

export default App;
