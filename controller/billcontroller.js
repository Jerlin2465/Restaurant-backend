const Bill = require("../model/billmodel");
const FoodOrder = require("../model/foodorderschema");
const TableBooking = require("../model/tablebookingmodel");

// Helper to get user ID consistently
const getUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

// GET: Bill for a specific table — server can only see their own open bill
const getTableBill = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bill = await Bill.findOne({
      tableNumber: String(tableNumber),
      serverId: userId,
      status: "open",
    });
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "No open bill for this table" });
    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET: All bills (admin/manager only)
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json({ success: true, bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET: Server sees ONLY their own bills
const getMyBills = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bills = await Bill.find({
      serverId: userId,
    }).sort({ createdAt: -1 });



    res.json({ success: true, bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST: Create bill — enforces one server → one active table
const createBill = async (req, res) => {
  try {
    const { orderId, bookingId, tableNumber, customerName, items, taxRate } =
      req.body;

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // One server → one table: check if this server already has another open bill
    const serverActiveBill = await Bill.findOne({
      serverId: userId,
      status: "open",
    });

    if (
      serverActiveBill &&
      serverActiveBill.tableNumber !== String(tableNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: `You already have an open bill for Table #${serverActiveBill.tableNumber}. Collect payment before taking another table.`,
      });
    }

    // If an open bill already exists for this server + table, add items or return it
    const existing = await Bill.findOne({
      tableNumber: String(tableNumber),
      serverId: userId,
      status: "open",
    });

    if (existing) {
      if (items?.length) {
        existing.items.push(...items);
        await existing.save();
        return res.json({
          success: true,
          message: "Items added to existing bill",
          bill: existing,
        });
      }
      return res.json({ success: true, bill: existing });
    }

    // console.log("CREATE BILL — USER:", userId, "TABLE:", tableNumber);

    const bill = new Bill({
      orderId,
      bookingId,
      tableNumber: String(tableNumber),
      customerName,
      serverName: req.user.designation?.name || req.user.name,
      serverId: userId,
      shopName: process.env.SHOP_NAME || "Jerry Restaurant",
      items: items || [],
      taxRate: taxRate || 5,
      status: "open",
    });

    await bill.save();
    res.status(201).json({ success: true, bill });
  } catch (error) {
    console.log("CREATE BILL ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Add food items — only to this server's open bill for that table
const addItemsToBill = async (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bill = await Bill.findOne({
      tableNumber: String(tableNumber),
      serverId: userId,
      status: "open",
    });

    if (!bill)
      return res.status(404).json({
        success: false,
        message: "No open bill found for your table. Take table first.",
      });

    items.forEach((newItem) => {
      const existing = bill.items.find(
        (i) => i.productId?.toString() === newItem.productId?.toString(),
      );
      if (existing) {
        existing.quantity += newItem.quantity;
      } else {
        bill.items.push(newItem);
      }
    });

    await bill.save();
    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Mark bill as pending payment — only this server's bill
const markBillPendingPayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      serverId: userId,
    });

    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "Bill not found or not yours" });

    bill.status = "pending_payment";
    await bill.save();
    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT: Pay bill → clear food orders + complete booking → table free
const payBill = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      serverId: userId,
    });

    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "Bill not found or not yours" });

    if (bill.status === "paid")
      return res.status(400).json({ success: false, message: "Already paid" });

    bill.status = "paid";
    bill.paymentMethod = paymentMethod || "cash";
    bill.paidAt = new Date();
    await bill.save();

    // Clear ALL food orders for this table
    await FoodOrder.updateMany(
      {
        tableNumber: String(bill.tableNumber),
        serverId: bill.serverId,
        status: { $in: ["Served", "Ready", "Cooking", "Pending"] },
      },
      { status: "Cleared" },
    );

    // Complete the booking so table is free for next customer
    await TableBooking.findOneAndUpdate(
      {
        tableNumber: String(bill.tableNumber),
        status: { $in: ["Seated", "Confirmed", "Assigned"] },
      },
      { status: "Completed" },
      { new: true },
    );

    res.json({
      success: true,
      message: "Payment received. Table cleared.",
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE: Cancel bill (admin only)
const cancelBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true },
    );
    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET: All bills with full status (admin/manager only)
const getAllBillsWithStatus = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate({
        path: "bookingId",
        select: "fullName phone guests date time status tableNumber",
      })
      .populate("serverId", "name email")
      .sort({ createdAt: -1 });

    const data = bills.map((bill) => ({
      _id: bill._id,
      tableNumber: bill.tableNumber,
      customerName: bill.customerName,
      serverName: bill.serverName || bill.serverId?.name || "—",
      shopName: bill.shopName,
      items: bill.items,
      totalAmount: bill.totalAmount,
      taxRate: bill.taxRate,
      taxAmount: bill.taxAmount,
      grandTotal: bill.grandTotal,
      status: bill.status,
      paymentMethod: bill.paymentMethod || null,
      paidAt: bill.paidAt || null,
      createdAt: bill.createdAt,
      booking: bill.bookingId
        ? {
            _id: bill.bookingId._id,
            guests: bill.bookingId.guests,
            date: bill.bookingId.date,
            time: bill.bookingId.time,
            bookingStatus: bill.bookingId.status,
            phone: bill.bookingId.phone,
          }
        : null,
    }));

    res.status(200).json({ success: true, bills: data });
  } catch (error) {
    console.error("GET ALL BILLS WITH STATUS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTableBill,
  getAllBills,
  getMyBills,
  createBill,
  addItemsToBill,
  markBillPendingPayment,
  payBill,
  cancelBill,
  getAllBillsWithStatus,
};
