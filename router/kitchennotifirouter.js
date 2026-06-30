const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  getAllNotifications,
  markCooking,
  markFoodReady,
  markServing,
  markServed,
  getUnreadCount,
} = require("../controller/kitchennotifycontroller");

const auth = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/rolebaseauth");


router.get("/my", auth, getMyNotifications);
router.get("/unread-count", auth, getUnreadCount);
router.put(
  "/cooking/:notificationId",
  auth,
  roleMiddleware("worker"),
  markCooking,
);
router.put(
  "/ready/:notificationId",
  auth,
  roleMiddleware("worker"),
  markFoodReady,
);
router.put(
  "/serving/:notificationId",
  auth,
  roleMiddleware("worker"),
  markServing,
);
router.put(
  "/served/:notificationId",
  auth,
  roleMiddleware("worker"),
  markServed,
);

// Admin / manager route
router.get(
  "/all",
  auth,
  roleMiddleware("admin", "manager"),
  getAllNotifications,
);

module.exports = router;
