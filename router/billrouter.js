const express = require("express");
const router = express.Router();
const {
  getTableBill,
  getAllBills,
  getMyBills,
  createBill,
  addItemsToBill,
  markBillPendingPayment,
  payBill,
  cancelBill,
  getAllBillsWithStatus,
} = require("../controller/billcontroller");

const auth = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/rolebaseauth");

// Server routes
router.get(
  "/my-bills",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  getMyBills,
);
router.get(
  "/table/:tableNumber",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  getTableBill,
);
router.post(
  "/create",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  createBill,
);
router.put(
  "/add-items",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  addItemsToBill,
);
router.put(
  "/pending-payment/:id",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  markBillPendingPayment,
);
router.put(
  "/pay/:id",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  payBill,
);

// Admin / manager routes
router.get("/", auth, roleMiddleware("admin", "manager"), getAllBills);
router.put("/cancel/:id", auth, roleMiddleware("admin", "manager"), cancelBill);

router.get(
  "/all-status",
  auth,
  roleMiddleware("admin", "manager"),
  getAllBillsWithStatus,
);

module.exports = router;
