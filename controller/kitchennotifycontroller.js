const KitchenNotification = require("../model/kitchennotifimodel");
const Order = require("../model/orderModel");
const TableBooking = require("../model/tablebookingmodel");
const mongoose = require("mongoose");

// ─── Get notifications for logged-in worker (by role) ────────────────────────
const getMyNotifications = async (req, res) => {
  try {
    const { role } = req.user; // comes from auth middleware

    const query =
      role === "chef"
        ? {
            role: { $in: ["chef", "all"] },
            stage: { $in: ["order_received", "cooking"] },
          }
        : role === "server"
          ? {
              role: { $in: ["server", "all"] },
              stage: { $in: ["ready", "serving"] },
            }
          : {};

    const notifications = await KitchenNotification.find(query)
      .populate({
        path: "orderId",
        populate: { path: "products.productId", select: "name price image" },
      })
      .populate("tableBookingId", "fullName tableNumber guests")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get ALL notifications (admin/manager view) ───────────────────────────────
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await KitchenNotification.find()
      .populate({
        path: "orderId",
        populate: { path: "products.productId", select: "name price image" },
      })
      .populate("tableBookingId", "fullName tableNumber guests")
      .populate("handledBy", "name designation")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Chef: Mark order as "cooking" ───────────────────────────────────────────
const markCooking = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await KitchenNotification.findByIdAndUpdate(
      notificationId,
      {
        stage: "cooking",
        isRead: true,
        handledBy: req.user.id,
        message: "Chef has started cooking your order.",
      },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Marked as cooking", notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Chef: Mark food as "ready" → creates server notification ─────────────────
const markFoodReady = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Update chef's notification to "ready"
    const chefNotification = await KitchenNotification.findByIdAndUpdate(
      notificationId,
      {
        stage: "ready",
        isRead: true,
        handledBy: req.user.id,
        message: "Food is ready! Waiting for server to pick up.",
      },
      { new: true },
    );

    if (!chefNotification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Also update order status to Processing → Shipped (ready to serve)
    await Order.findByIdAndUpdate(chefNotification.orderId, {
      orderStatus: "Shipped",
    });

    // Create a new notification for the SERVER
    const serverNotification = await KitchenNotification.create({
      orderId: chefNotification.orderId,
      tableBookingId: chefNotification.tableBookingId,
      tableNumber: chefNotification.tableNumber,
      role: "server",
      stage: "ready",
      message: `🍽️ Food is ready for Table ${chefNotification.tableNumber || "N/A"}! Please pick up and serve.`,
    });

    res.status(200).json({
      success: true,
      message: "Food marked as ready. Server has been notified.",
      chefNotification,
      serverNotification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Server: Mark food as "serving" ──────────────────────────────────────────
const markServing = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await KitchenNotification.findByIdAndUpdate(
      notificationId,
      {
        stage: "serving",
        isRead: true,
        handledBy: req.user.id,
        message: "Server is on the way to deliver the food.",
      },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Marked as serving", notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Server: Mark as "served" (order Delivered) ───────────────────────────────
const markServed = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await KitchenNotification.findByIdAndUpdate(
      notificationId,
      {
        stage: "served",
        isRead: true,
        handledBy: req.user.id,
        message: "Food has been served to the customer. Enjoy your meal!",
      },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Update order status → Delivered
    await Order.findByIdAndUpdate(notification.orderId, {
      orderStatus: "Delivered",
    });

    // Mark table booking as Completed
    if (notification.tableBookingId) {
      await TableBooking.findByIdAndUpdate(notification.tableBookingId, {
        status: "Completed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order marked as served and delivered.",
      notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get unread count for logged-in worker ────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const { role } = req.user;

    const roleQuery =
      role === "chef"
        ? { role: { $in: ["chef", "all"] }, stage: "order_received" }
        : role === "server"
          ? { role: { $in: ["server", "all"] }, stage: "ready" }
          : {};

    const count = await KitchenNotification.countDocuments({
      ...roleQuery,
      isRead: false,
    });

    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyNotifications,
  getAllNotifications,
  markCooking,
  markFoodReady,
  markServing,
  markServed,
  getUnreadCount,
};
