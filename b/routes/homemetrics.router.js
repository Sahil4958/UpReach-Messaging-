const express = require("express");
const { homeMetrics } = require("../controllers/homemetrics.controller.js");

const homeMetricsRouter = express.Router();

homeMetricsRouter.get("/homemetrics", homeMetrics);

module.exports = homeMetricsRouter;
