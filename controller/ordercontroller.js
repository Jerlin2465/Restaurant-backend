
const mongoose = require("mongoose");
const Order = require("../model/orderModel");
const Product = require("../model/product/addproduct");
const TableBooking = require("../model/tablebookingmodel");
const KitchenNotification = require("../model/kitchennotifimodel");
const sendOrderEmail = require("../units/sendEmail");


const placeOrder = async (req, res) => {
  try {
    const {
      products,
      totalAmount,
      paymentStatus,
      email,
      name,
      tableBookingId,
      deliveryAddress,
      deliveryNotes,
    } = req.body;
    console.log("Request Body:", req.body);
    console.log(
      "deliveryAddress:",
      req.body.deliveryAddress || req.body.address,
    );
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products are required",
      });
    }

    const amount = Number(totalAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid total amount",
      });
    }

    // Validate products and get product details
    const formattedProducts = [];
    for (let item of products) {
      const pid = item.productId?._id || item.productId;
      const product = await Product.findById(pid);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${pid}`,
        });
      }
      formattedProducts.push({
        productId: product._id,
        quantity: item.quantity,
      });
    }

    // Create new order
    const newOrder = new Order({
      userId,
      products: formattedProducts,
      totalAmount: amount,
      paymentStatus: paymentStatus || "Pending",
      orderStatus: "Placed",
      deliveryAddress,
      deliveryNotes,
    });

    const savedOrder = await newOrder.save();

    // Handle table booking if exists
    let tableNumber = null;
    let resolvedTableBookingId = null;

    if (tableBookingId && mongoose.Types.ObjectId.isValid(tableBookingId)) {
      const booking = await TableBooking.findByIdAndUpdate(
        tableBookingId,
        { orderId: savedOrder._id, status: "Seated" },
        { new: true },
      );
      if (booking) {
        tableNumber = booking.tableNumber;
        resolvedTableBookingId = booking._id;
        savedOrder.tableBookingId = resolvedTableBookingId;
        savedOrder.tableNumber = tableNumber;
        await savedOrder.save();
      }
    }

    // Create kitchen notification
    await KitchenNotification.create({
      orderId: savedOrder._id,
      tableBookingId: resolvedTableBookingId,
      tableNumber,
      role: "chef",
      stage: "order_received",
      message: `New order received${
        tableNumber ? ` for Table ${tableNumber}` : ""
      }. Please start cooking.`,
    });

    // Send email notification
    if (email) {
      await sendOrderEmail({
        email,
        name: name || "Customer",
        totalAmount: amount,
        orderId: savedOrder._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "fullname email phone address")
      .populate(
        "products.productId",
        "productName price image category description",
      )
      .populate("deliveryPersonId", "fullname email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .populate(
        "products.productId",
        "productName price image category description",
      )
      .populate("deliveryPersonId", "fullname email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getDeliveryOrders = async (req, res) => {
  try {
    const { status } = req.query;

    // Build filter
    let filter = {};
    if (status) {
      filter.orderStatus = status;
    } else {
      // Default: Show Ready and Out_for_Delivery orders
      filter.orderStatus = {
        $in: ["Placed", "Processing", "Ready"],
      };
    }

    const orders = await Order.find(filter)
      .populate("userId", "fullname email phone address")
      .populate(
        "products.productId",
        "productName price image category description",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id)
      .populate("userId", "fullname email phone address")
      .populate(
        "products.productId",
        "productName price image category description",
      )
      .populate("deliveryPersonId", "fullname email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    const isAdmin = req.userRole === "admin";
    const isDeliveryPerson =
      order.deliveryPersonId?._id?.toString() === req.userId;
    const isOrderOwner = order.userId._id.toString() === req.userId;

    if (!isAdmin && !isDeliveryPerson && !isOrderOwner) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const validStatuses = [
      "Placed",
      "Processing",
      "Ready",
      "Out_for_Delivery",
      "Delivered",
      "Cancelled",
      "Returned",
    ];

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true },
    )
      .populate("userId", "fullname email phone address")
      .populate(
        "products.productId",
        "productName price image category description",
      );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Create notification for kitchen/delivery
    if (orderStatus === "Ready") {
      await KitchenNotification.create({
        orderId: updatedOrder._id,
        role: "delivery",
        stage: "ready_for_delivery",
        message: `Order #${updatedOrder._id.toString().slice(-6)} is ready for delivery`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
//  ASSIGN DELIVERY PERSON
// ─────────────────────────────────────────────
const assignDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPersonId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(deliveryPersonId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only allow assignment if order is Ready or Out_for_Delivery
    if (!["Ready", "Out_for_Delivery"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Order must be Ready or Out for Delivery to assign delivery person",
      });
    }

    order.deliveryPersonId = deliveryPersonId;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Delivery person assigned successfully",
      order,
    });
  } catch (error) {
    console.error("Error assigning delivery person:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
//  CANCEL ORDER (User only)
// ─────────────────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Ownership check
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (["Delivered", "Out_for_Delivery"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Orders that are ${order.orderStatus} cannot be cancelled`,
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order already cancelled",
      });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
//  RETURN ORDER (User only)
// ─────────────────────────────────────────────
const returnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Ownership check
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }

    order.orderStatus = "Returned";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Error returning order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
//  DELETE ORDER (Admin only)
// ─────────────────────────────────────────────
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
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
};
