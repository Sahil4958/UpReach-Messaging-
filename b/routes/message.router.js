const express = require("express");
const {
  createMessage,
  getTempCategories,
  getMessages,
  triggerCampaign,
  getReceivedMessages,
  getSentCampSms,
  getReceivedMessagesById,
  triggerSmsReply,
  triggerNotification,
} = require("../controllers/campmsg.controller");

const msgRouter = express.Router();

msgRouter.post("/save-message", createMessage);
msgRouter.post("/triggerCampaign", triggerCampaign);
msgRouter.post("/getReceivedMessages", getReceivedMessages);
msgRouter.post("/triggerReplySms", triggerSmsReply);
msgRouter.post("/trigger-notification", triggerNotification);

msgRouter.get("/getReceivedMessages", getReceivedMessagesById);
msgRouter.get("/getSentCampaignSms", getSentCampSms);
msgRouter.get("/template-categories", getTempCategories);
msgRouter.get("/messages", getMessages);

module.exports = msgRouter;
