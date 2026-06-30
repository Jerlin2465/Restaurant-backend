// const express = require("express");
// const router = express.Router();

// const {
//   createOrder,
//   getAllOrders,
//   getServerOrders,
//   updateOrderStatus,
// } = require("../controller/foodordercontroller");

// const auth = require("../middleware/authmiddleware");

// router.post("/create-order", auth, createOrder);
// router.get("/chef-orders", auth, getAllOrders);
// router.get("/server-orders", auth, getServerOrders);
// router.put("/update-status/:id", auth, updateOrderStatus);

// module.exports = router;

// backend/routes/foodorderRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");

const {
  createOrder,
  getAllOrders,
  getServerOrders,
  updateOrderStatus,
} = require("../controller/foodordercontroller");

// IMPORTANT: These routes must exist
router.post("/create-order", auth, createOrder);
router.get("/chef-orders", auth, getAllOrders);  // ← Chef views all orders
router.get("/server-orders", auth, getServerOrders);
router.put("/update-status/:id", auth, updateOrderStatus);

module.exports = router;