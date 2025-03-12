const express = require("express");
const {
  createCampaign,
  deleteCampaign,
  getCampaignByEmail,
  getCampaign,
  updateCampaign,
  getCampaignDetails,
  campaignTargetTime,
  getEmailByCamp,
  updateCampaignNumbers,
  updateCampaignSchedule,
  getCampaignMessage,
  updateCampaignMessage,
} = require("../controllers/campaign.controller");

const campaignRouter = express.Router();

campaignRouter.post("/campaigns", createCampaign);

campaignRouter.get("/campaigns1", getCampaignByEmail);
campaignRouter.get("/campaigns2", getCampaign);
campaignRouter.get("/campaignDetails", getCampaignDetails);
campaignRouter.get("/target-time", campaignTargetTime);
campaignRouter.get("/get-email-by-campaign",getEmailByCamp)
campaignRouter.get("/campaigns/:campaignId/message",getCampaignMessage)

campaignRouter.put("/campaigns/:campaignId", updateCampaign);
campaignRouter.put("/campaigns/:campaignId/selectNumbers",updateCampaignNumbers);
campaignRouter.put("/campaigns/:campaignId/schedule",updateCampaignSchedule);
campaignRouter.put("/campaigns/:campaignId/message",updateCampaignMessage)

campaignRouter.delete("/campaigns/:campaignId", deleteCampaign);

module.exports = campaignRouter;
