import React, { useEffect, useState, useRef } from "react";
import "./Dashboard.css";
import axios from "axios";
import config from "../config"; // Import config file
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FaSms,
  FaDollarSign,
  FaTachometerAlt,
  FaExchangeAlt,
} from "react-icons/fa"; // Font Awesome icons

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [totalCostData, setTotalCostData] = useState({
    labels: [], // Initial empty labels
    datasets: [
      {
        label: "Total Cost Over Time",
        data: [],
        borderColor: "rgba(255,99,132,1)",
        backgroundColor: "rgba(255,99,132,0.2)",
        fill: true,
        tension: 0.4, // Smooth curve
      },
    ],
  });
  const [loading, setLoading] = useState(true);
  const previousMetricsRef = useRef(null);
  const intervalRef = useRef(null);
  const totalCostChartRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Retrieve org_name and userEmail from local storage
      const orgName = localStorage.getItem("org_name");
      const userEmail = localStorage.getItem("userEmail");
  
      if (!orgName || !userEmail) {
        console.error("Missing org_name or userEmail in local storage.");
        setLoading(false);
        return;
      }
  
      const [homeMetricsResponse, trendResponse, smsResponse] = await Promise.all([
        axios.get(`${config.apiBaseUrl}/homemetrics`, {
          headers: { 
            "x-org-name": orgName,
            "x-user-email": userEmail,
          },
        }),
        axios.get(`${config.apiBaseUrl}/metrics/charts`),
        axios.get(`${config.apiBaseUrl}/sms`),
      ]);
  
      const homeMetrics = homeMetricsResponse.data;
  
      // Only update state if the data has changed
      if (JSON.stringify(homeMetrics) !== JSON.stringify(previousMetricsRef.current)) {
        // Convert negative totalCost to positive using Math.abs
        setMetrics({
          total_cost: Math.abs(Number(homeMetrics.totalCost)) || 0,
          total_sms_sent: Number(homeMetrics.totalSmsSent) || 0,
          total_sms_received: Number(homeMetrics.totalSmsReceived) || 0,
          sms_per_second: Number(homeMetrics.smsPerSecond) || 10,
          throughput: Number(homeMetrics.throughput) || 10,
        });
        previousMetricsRef.current = homeMetrics;
  
        // Update real-time graph for Total Cost, also ensuring positive value
        setTotalCostData((prevData) => {
          const newLabels = [
            ...prevData.labels,
            new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" }),
          ].slice(-10); // Keep only the last 10 points
  
          const newData = [
            ...prevData.datasets[0].data,
            Math.abs(Number(homeMetrics.totalCost)) || 0,
          ].slice(-10);
  
          return {
            ...prevData,
            labels: newLabels,
            datasets: [{ ...prevData.datasets[0], data: newData }],
          };
        });
      }
  
      // Format trend data if it's an array
      if (Array.isArray(trendResponse.data)) {
        const formattedTrendData = trendResponse.data.map((item) => ({
          ...item,
          timestamp: item.timestamp || new Date().toLocaleTimeString(),
        }));
        setTrendData(formattedTrendData);
      }
  
      // Update SMS messages list
      const updatedSmsMessages = smsResponse.data.map((message) => ({
        ...message,
        price: message.price_per_sms || 0,
      }));
      setSmsMessages(updatedSmsMessages);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const roundValue = (value, decimals = 2) => {
    if (value !== null && value !== undefined) {
      return value.toFixed(decimals);
    }
    return "N/A";
  };

  const chartData = {
    labels:
      trendData.length > 0 ? trendData.map((trend) => trend.timestamp) : [],
    datasets: [
      {
        label: "SMS Sent Per Second",
        data:
          trendData.length > 0
            ? trendData.map((trend) => trend.sms_per_second)
            : [],
        borderColor: "rgba(75,192,192,1)",
        fill: false,
      },
      {
        label: "Total Cost",
        data:
          trendData.length > 0
            ? trendData.map((trend) => trend.total_cost)
            : [],
        borderColor: "rgba(255,99,132,1)",
        fill: false,
      },
      {
        label: "Latency",
        data:
          trendData.length > 0 ? trendData.map((trend) => trend.latency) : [],
        borderColor: "rgba(153,102,255,1)",
        fill: false,
      },
      {
        label: "Throughput",
        data:
          trendData.length > 0
            ? trendData.map((trend) => trend.throughput)
            : [],
        borderColor: "rgba(255,159,64,1)",
        fill: false,
      },
    ],
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">SMS Loading...</div>
      </div>
    );
  }

  return (
<div className="dashboard-container">
  <h1>Upreach Dashboard</h1>
  <div className="metrics-container-box">
    {/* Total Cost Metric with Animated Graph */}
    <div className="total-cost">
      <div className="total-cost-header">
        <FaDollarSign className="total-cost-icon" />
        <div>
          <h3>Total Cost</h3>
          <p>${roundValue(Math.abs(metrics?.total_cost || 0))}</p>
        </div>
      </div>
      <div className="line-graph">
        <Line
          data={totalCostData}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
            },
            animations: {
              tension: {
                duration: 2000,
                easing: "easeInOutQuad",
                from: 0.3,
                to: 0.8,
                loop: true,
              },
            },
            scales: {
              x: { display: false },
              y: {
                beginAtZero: true,
                ticks: {
                  color: "#dfe6e9", // Light text color
                  callback: (val) => `$${val}`,
                },
                grid: { color: "#555" },
              },
            },
          }}
        />
      </div>
    </div>

    {/* Other Metrics */}
    <div className="metrics-container">
      <div className="metric-card">
        <FaSms />
        <h3>Total SMS Sent</h3>
        <p>{metrics?.total_sms_sent || 0}</p>
      </div>
      <div className="metric-card">
        <FaTachometerAlt />
        <h3>SMS Sent Per Second</h3>
        <p>{roundValue(metrics?.sms_per_second || 10)}</p>
      </div>
      <div className="metric-card">
        <FaSms />
        <h3>Total SMS Received</h3>
        <p>{metrics?.total_sms_received || 0}</p>
      </div>
      <div className="metric-card">
        <FaExchangeAlt />
        <h3>Throughput</h3>
        <p>{roundValue(metrics?.throughput || 10)}</p>
      </div>
    </div>
  </div>

  {/* Trend Charts */}
  <div className="trend-charts">
    <h3>Trends Over Time</h3>
    <div className="chart-container">
      <div className="chart-card">
        <h4>SMS Sent Per Second & Total Cost</h4>
        <Line data={chartData} />
      </div>
      <div className="chart-card">
        <h4>Latency & Throughput</h4>
        <Line
          data={{
            labels: chartData.labels,
            datasets: chartData.datasets.slice(2),
          }}
        />
      </div>
    </div>
  </div>

  {/* Recent SMS Messages */}
  <div className="sms-messages">
    <h2>Recent SMS Messages</h2>
    <table>
      <thead>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Body</th>
          <th>Date Sent</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {smsMessages.map((message) => (
          <tr key={message.sid}>
            <td>{message.from}</td>
            <td>{message.to}</td>
            <td>{message.body}</td>
            <td>
              {message.dateSent
                ? new Date(message.dateSent).toLocaleString("en-US", {
                    timeZone: "America/Los_Angeles",
                    hour12: true,
                  })
                : "N/A"}
            </td>
            <td>{message.status || "Unknown"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

  );
};

export default Dashboard;
