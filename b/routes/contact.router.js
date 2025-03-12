const express = require("express");
const {
  createContact,
  getContacts,
  getContactsByName,
  contactUpload,
} = require("../controllers/contact.controller");

const contactRouter = express.Router();

contactRouter.post("/contact", createContact);
contactRouter.post("/contact/upload", contactUpload);

contactRouter.get("/contacts", getContacts);
contactRouter.get("/contacts1", getContactsByName);

module.exports = contactRouter;
