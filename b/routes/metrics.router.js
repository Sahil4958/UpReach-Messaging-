const express = require("express");
const {
  getChartData,
  getMetrics,
  getSms,
  getSmsCount,
  fetchFromTwilio,

} = require("../controllers/metrics.controller");

const metricsRouter = express.Router();

metricsRouter.get("/metrics/charts", getChartData);
metricsRouter.get("/metrics", getMetrics);
metricsRouter.get("/sms", getSms);
metricsRouter.get("/sms/received-count", getSmsCount);
metricsRouter.get("/sms/metrics", fetchFromTwilio);

module.exports = metricsRouter;
