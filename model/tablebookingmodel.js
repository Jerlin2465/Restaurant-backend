const mongoose = require("mongoose");

const tableBookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Register" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    guests: { type: Number, required: true, min: 1, max: 8 },
    date: { type: String, required: true },
    time: { type: String, required: true },
    tableNumber: { type: String, default: "Auto-assigned" }, // always String
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "Confirmed",
        "Seated",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    assignedServer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TableBooking", tableBookingSchema);
