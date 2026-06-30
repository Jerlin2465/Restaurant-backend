const Bill = require("../model/billmodel");
const FoodOrder = require("../model/foodorderschema");
const TableBooking = require("../model/tablebookingmodel");

const getUserId = (req) => req.user?._id || req.user?.id || null;

const getOccupiedTables = async () => {
  const active = await TableBooking.find({
    status: { $in: ["Assigned", "Confirmed", "Seated"] },
  });
  return active.map((b) => String(b.tableNumber));
};

//  Create Booking
const bookTable = async (req, res) => {
  try {
    const { fullName, phone, guests, date, time, tableNumber, message } =
      req.body;

    if (!fullName || !phone || !guests || !date || !time) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    let assignedTable = tableNumber ? String(tableNumber) : null;

    if (assignedTable) {
      const existingBooking = await TableBooking.findOne({
        tableNumber: assignedTable,
        status: { $in: ["Pending", "Assigned", "Confirmed", "Seated"] },
      });

      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: `Table ${assignedTable} is already booked`,
        });
      }
    }

    if (!assignedTable) {
      const occupied = await getOccupiedTables();
      const all = Array.from({ length: 10 }, (_, i) => String(i + 1));
      const free = all.filter((table) => !occupied.includes(table));

      if (free.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No tables available" });
      }

      assignedTable = free[0];
    }

    const booking = await TableBooking.create({
      userId,
      fullName,
      phone,
      guests,
      date,
      time,
      tableNumber: assignedTable,
      message,
      status: "Pending",
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Take Table (staff only)
const takeTable = async (req, res) => {
  try {
    const token_user = req.user;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ONE SERVER → ONE TABLE: block if this server already has an open bill
    const activeBill = await Bill.findOne({
      serverId: userId,
      status: "open",
    });

    if (activeBill) {
      return res.status(400).json({
        success: false,
        message: `You already have Table #${activeBill.tableNumber} open. Collect payment before taking another table.`,
      });
    }

    const booking = await TableBooking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (booking.assignedServer) {
      return res.status(400).json({
        success: false,
        message: "This table is already assigned to another server",
      });
    }

    booking.assignedServer = userId;
    booking.assignedAt = new Date();
    booking.status = "Assigned";
    await booking.save();

    // Auto-create an open bill for this server + table
    const existingBill = await Bill.findOne({
      tableNumber: String(booking.tableNumber),
      serverId: userId,
      status: "open",
    });

    if (!existingBill) {
      const bill = new Bill({
        bookingId: booking._id,
        tableNumber: String(booking.tableNumber),
        customerName: booking.fullName,
        serverName: token_user.designation?.name || token_user.name,
        serverId: userId,
        shopName: process.env.SHOP_NAME || "Jerry Restaurant",
        items: [],
        taxRate: 5,
        status: "open",
      });
      await bill.save();
    }

    res.json({
      success: true,
      message: "Table taken and bill created",
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get ALL Bookings (admin/manager/worker only)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await TableBooking.find()
      .populate("assignedServer", "name email")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Get MY Bookings (logged-in user only)
const getMyBookings = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const bookings = await TableBooking.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Get Booking By ID
const getBookingById = async (req, res) => {
  try {
    const booking = await TableBooking.findById(req.params.id)
      .populate("assignedServer", "name email")
      .populate("userId", "name email");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const userId = getUserId(req);
    const role = req.user?.role;

    if (
      role === "user" &&
      String(booking.userId?._id || booking.userId) !== String(userId)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const requesterId = String(getUserId(req));

    // Fetch the booking first so we can check ownership
    const booking = await TableBooking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (booking.assignedServer) {
      const assignedId = String(booking.assignedServer);
      if (assignedId !== requesterId) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: you are not the assigned server for this table",
        });
      }
    }

    booking.status = status;
    await booking.save();

    await booking.populate("assignedServer", "name email");

    res.status(200).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Cancel MY Booking (owner only)
const cancelMyBooking = async (req, res) => {
  try {
    const userId = getUserId(req);

    const booking = await TableBooking.findOne({
      _id: req.params.id,
      userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the owner",
      });
    }

    if (["Completed", "Cancelled"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is already ${booking.status}`,
      });
    }

    booking.status = "Cancelled";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  Delete Booking (admin/manager only)
const deleteBooking = async (req, res) => {
  try {
    await TableBooking.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Booking deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  bookTable,
  getAllBookings,
  takeTable,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelMyBooking,
  deleteBooking,
};
