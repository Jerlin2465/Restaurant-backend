const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const billSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "TableBooking" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodOrder" },
    tableNumber: { type: String, required: true },
    shopName: { type: String, default: "Jerry Restaurant" },
    customerName: { type: String, required: true },
    serverName: { type: String },
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Register" },
    items: [billItemSchema],
    totalAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["open", "pending_payment", "paid", "cancelled"],
      default: "open",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", ""],
      default: "",
    },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

billSchema.pre("save", async function () {
  this.totalAmount = (this.items || []).reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0,
  );
  this.taxAmount = parseFloat(
    ((this.totalAmount * this.taxRate) / 100).toFixed(2),
  );
  this.grandTotal = parseFloat((this.totalAmount + this.taxAmount).toFixed(2));
});

module.exports = mongoose.model("Bill", billSchema);
