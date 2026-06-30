const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");

const {
  placeOrder,
  getAllOrders,
  getUserOrders,
  getDeliveryOrders,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPerson,
  cancelOrder,
  returnOrder,
  deleteOrder,
} = require("../controller/orderController");


router.post("/place-order", auth, placeOrder);
router.get("/all-orders", getAllOrders);
router.get("/my-orders", auth, getUserOrders);
router.get("/delivery-orders", auth, getDeliveryOrders);
router.get("/order/:id", auth, getOrderById);
router.put("/update-order/:id", auth, updateOrderStatus);
router.put("/assign-delivery/:id", auth, assignDeliveryPerson);
router.put("/cancel-order/:id", auth, cancelOrder);
router.put("/return-order/:id", auth, returnOrder);
router.delete("/delete-order/:id", auth, deleteOrder);

module.exports = router;