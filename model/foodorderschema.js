const mongoose = require("mongoose");

const foodorderSchema = new mongoose.Schema(
  {
    tableNumber: { type: String, required: true }, // always String
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Register" },
    serverName: { type: String },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalAmount: Number,
    status: {
      type: String,
      enum: ["Pending", "Cooking", "Ready", "Served", "Cleared"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Foodrder", foodorderSchema);
