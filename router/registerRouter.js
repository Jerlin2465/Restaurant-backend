const express = require("express");
const router = express.Router();

const {
  getDetails,
  createregister,
  loginuser,
  createManager,
  createWorker,
  getAllWorkers,
  getMyWorkers,
  getAllManagers,
  forgotPassword,
  resetPassword,
  updateAddress,
} = require("../controller/registercontroller");

const auth = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/rolebaseauth");

router.post("/register", createregister);
router.post("/login", loginuser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/getdetail", auth, getDetails);
router.post("/create-manager", auth, roleMiddleware("admin"), createManager);
router.get(
  "/managers",
  auth,
  roleMiddleware("admin", "manager"),
  getAllManagers,
);

router.get("/workers", auth, roleMiddleware("admin", "manager"), getAllWorkers);

router.post(
  "/create-worker",
  auth,
  roleMiddleware("admin", "manager"),
  createWorker,
);

router.get("/my-workers", auth, roleMiddleware("manager"), getMyWorkers);
router.put("/update-address", auth, updateAddress);
module.exports = router;
