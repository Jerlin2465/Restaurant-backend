const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploads");
const auth = require("../middleware/authmiddleware");

const {
  createProduct,
  getProduct,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  updateStockStatus,
  getAllProductsForChef,
} = require("../controller/productcontroller");

router.post("/create-product", upload.single("image"), createProduct);
router.get("/get-product", getProduct);
router.get("/get-product-all", getAllProductsForChef);
router.put("/update-stock/:id", auth, updateStockStatus);
router.put("/update-product/:id", upload.single("image"), updateProduct);
router.delete("/delete-product/:id", deleteProduct);

router.get("/:id", getSingleProduct);

module.exports = router;
