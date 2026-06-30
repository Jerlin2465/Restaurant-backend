const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
} = require("../controller/cartcontroller");

const auth = require("../middleware/authmiddleware");

router.post("/add", auth, addToCart);
router.get("/get", auth, getCart);
router.put("/increase", auth, increaseQuantity);
router.put("/decrease", auth, decreaseQuantity);
router.delete("/remove", auth, removeItem);
router.delete("/clear", auth, clearCart);

module.exports = router;
