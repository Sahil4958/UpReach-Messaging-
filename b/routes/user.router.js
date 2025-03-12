const express = require("express");
const upload = require("../controllers/upload");
const {
  checkUserRole,
  createUser,
  getUserRole,
  resetPassword,
  userPhoto,
  getUserProfile,
  getOrgName,
} = require("../controllers/user.controller");

const userRouter = express.Router();

userRouter.post("/create-user", createUser);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/upload-photo/:username", upload.single("photo"), userPhoto);

userRouter.get("/check-role", checkUserRole);
userRouter.get("/get-role", getUserRole);
userRouter.get("/user/:username", getUserProfile);
userRouter.get("/get-org-name",getOrgName)

module.exports = userRouter;
