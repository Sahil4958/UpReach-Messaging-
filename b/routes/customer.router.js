const express = require("express");
const {
  createCustomer,
  getCustomer,
  getAllCustomers,
  getCustomerByName,
} = require("../controllers/customer.controller");

const customerRouter = express.Router();

customerRouter.post("/customer", createCustomer);

customerRouter.get("/customer", getCustomer);
customerRouter.get("/customers", getAllCustomers);
customerRouter.get("/customers/:customerName/numbers", getCustomerByName);

module.exports = customerRouter;
