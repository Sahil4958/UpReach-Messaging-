const express = require("express");
const { setUserMiddleware } = require("../middlreware/limitChecks");
const {
  uploadContacts,
  userDetails,
  uploadForm,
} = require("../controllers/freetrial.controller");

const freeTrialRouter = express.Router();

freeTrialRouter.use(setUserMiddleware);
freeTrialRouter.post("/upload-contact", uploadContacts);
freeTrialRouter.post("/upload-form", uploadForm);

freeTrialRouter.get("/user-details", userDetails);
module.exports = freeTrialRouter;
