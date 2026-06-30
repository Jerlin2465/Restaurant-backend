const mongoose = require("mongoose");

const kitchenNotificationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ordeer",
      required: true,
    },

    tableBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableBooking",
      default: null,
    },

    tableNumber: {
      type: String,
      default: null,
    },

    message: {
      type: String,
      required: true,
    },

    // who this notification is for
    role: {
      type: String,
      enum: ["chef", "server", "delivery", "all"],
      default: "chef",
    },

    // current stage of this order in the kitchen pipeline
    stage: {
      type: String,
      enum: [
        "order_received", 
        "cooking",
        "ready", 
        "serving", 
        "served", 
      ],
      default: "order_received",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // userId of the worker who acted on this notification
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "KitchenNotification",
  kitchenNotificationSchema,
);
