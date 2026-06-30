const express = require("express");
const router = express.Router();

const {
  bookTable,
  getAllBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelMyBooking,
  deleteBooking,
  takeTable,
} = require("../controller/tablebookingcontroller");

const auth = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/rolebaseauth");

router.post("/book", auth, bookTable);
router.get("/my-bookings", auth, getMyBookings);

router.get(
  "/",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  getAllBookings,
);
router.put(
  "/take-table/:id",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  takeTable,
);
router.put(
  "/status/:id",
  auth,
  roleMiddleware("admin", "manager", "worker"),
  updateBookingStatus,
);
router.delete("/:id", auth, roleMiddleware("admin", "manager"), deleteBooking);
router.put("/cancel/:id", auth, cancelMyBooking);
router.get("/:id", auth, getBookingById);

module.exports = router;
