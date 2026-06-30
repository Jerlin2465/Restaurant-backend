const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Failed"],
      default: "Pending",
    },
    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Processing",
        "Ready",
        "Out_for_Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Placed",
    },
    // Delivery specific fields
    deliveryAddress: {
      type: String,
      required: false,
    },
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: false,
    },
    deliveryNotes: {
      type: String,
      required: false,
    },
    estimatedDeliveryTime: {
      type: Date,
      required: false,
    },
    // Table booking integration
    tableBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableBooking",
      required: false,
    },
    tableNumber: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true },
);

// Index for faster queries
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ deliveryPersonId: 1 });
orderSchema.index({ userId: 1 });

module.exports = mongoose.model("Order", orderSchema);
