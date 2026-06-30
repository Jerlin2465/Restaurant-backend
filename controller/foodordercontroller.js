const Foodrder = require("../model/foodorderschema");
const Bill = require("../model/billmodel");

// Helper to get user ID consistently
const getUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

// CREATE ORDER — only logged-in server can create, saves serverId
const createOrder = async (req, res) => {
  try {
    const { tableNumber, items, totalAmount } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check if this server already has an open bill for this table
    // (one server → one table enforcement)
    const existingBill = await Bill.findOne({
      serverId: userId,
      status: "open",
    });

    if (existingBill && existingBill.tableNumber !== String(tableNumber)) {
      return res.status(400).json({
        success: false,
        message: `You already have an open table (#${existingBill.tableNumber}). Complete that bill before ordering for another table.`,
      });
    }

    const order = await Foodrder.create({
      tableNumber: String(tableNumber),
      items,
      totalAmount,
      serverId: userId,
      serverName: req.user.name || req.user.designation?.name,
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CHEF VIEW ALL ORDERS
// const getAllOrders = async (req, res) => {
//   try {
//     const orders = await Foodrder.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, orders });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
const getAllOrders = async (req, res) => {
  try {
    const orders = await Foodrder.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SERVER VIEW OWN ORDERS ONLY — filtered by serverId
const getServerOrders = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Foodrder.find({ serverId: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/// CHEF/SERVER UPDATE STATUS — auto-adds items to THIS server's bill when Served
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Foodrder.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order Not Found" });
    }

    if (status === "Served") {
      // FIX: match both tableNumber AND serverId so only the correct server's bill is updated
      const bill = await Bill.findOne({
        tableNumber: String(order.tableNumber),
        serverId: order.serverId,
        status: "open",
      });

      if (!bill) {
        return res.status(404).json({
          success: false,
          message: "No open bill found for this server and table",
        });
      }

      order.items.forEach((newItem) => {
        const existingItem = bill.items.find(
          (item) =>
            item.productId &&
            newItem.productId &&
            item.productId.toString() === newItem.productId.toString(),
        );

        if (existingItem) {
          existingItem.quantity += newItem.quantity || 1;
        } else {
          bill.items.push({
            productId: newItem.productId,
            name: newItem.name,
            price: newItem.price || 0,
            quantity: newItem.quantity || 1,
          });
        }
      });

      await bill.save();
      console.log(
        "BILL SAVED with",
        bill.items.length,
        "items, grandTotal:",
        bill.grandTotal,
      );
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order Status Updated",
      order,
    });
  } catch (error) {
    console.error("updateOrderStatus ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getServerOrders,
  updateOrderStatus,
};
