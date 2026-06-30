const Register = require("../model/registermodel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResetPasswordEmail } = require("../units/utils");

const getDetails = async (req, res) => {
  try {
    const user = await Register.findById(req.user.id).select("-password");
    if (!user) {
      return res.json({ message: "user not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// User Register
const createregister = async (req, res) => {
  try {
    const { name, email, number, address, password, confipassword } = req.body;

    const exist = await Register.findOne({ email });

    if (exist) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    if (!password || !confipassword) {
      return res.status(400).json({
        message: "Password and Confirm Password are required",
      });
    }

    if (password !== confipassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await Register.create({
      name,
      email,
      number,
      address,
      password: hash,
      role: "user",
    });

    res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Login
const loginuser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Register.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const matchPassword = await bcrypt.compare(password, user.password);

    if (!matchPassword) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        role: user.role,
        designation: user.designation,
        address: user.address,
      },
      process.env.JWT_SECRETKEY,
      {
        expiresIn: "7d",
      },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        address: user.address,
        role: user.role,
        designation: user.designation,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// Admin Creates Manager
const createManager = async (req, res) => {
  try {
    const { name, email, number, address, password } = req.body;

    if (!name || !email || !number || !address || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const exist = await Register.findOne({ email });

    if (exist) {
      return res.status(400).json({
        message: "Manager already exists",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const manager = await Register.create({
      name,
      email,
      number,
      address,
      password: hash,
      role: "manager",
      designation: "manager",
    });

    res.status(201).json({
      message: "Manager created successfully",
      manager,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Admin / Manager Creates Employee
const createWorker = async (req, res) => {
  try {
    const { name, email, number, address, password, designation } = req.body;
    if (!name || !email || !number || !address || !password || !designation) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const allowedDesignations = ["chef", "server", "delivery"];

    if (!allowedDesignations.includes(designation.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid designation",
      });
    }

    const exist = await Register.findOne({ email });

    if (exist) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const worker = await Register.create({
      name,
      email,
      number,
      address,
      password: hash,
      role: "worker",
      designation: designation.toLowerCase(),
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Worker created successfully",
      worker,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Admin View All Workers
const getAllWorkers = async (req, res) => {
  try {
    const workers = await Register.find({
      role: "worker",
    });

    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMyWorkers = async (req, res) => {
  try {
    const workers = await Register.find({
      role: "worker",
      createdBy: req.user.id,
    });

    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// View All Managers
const getAllManagers = async (req, res) => {
  try {
    const managers = await Register.find({
      role: "manager",
    });

    res.status(200).json(managers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await Register.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a reset link has been sent",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/resetpassword/${rawToken}`;

    await sendResetPasswordEmail(user.email, resetLink);

    res.status(200).json({
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await Register.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update User Address
const updateAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || address.trim() === "") {
      return res.status(400).json({
        message: "Address is required",
      });
    }

    const user = await Register.findByIdAndUpdate(
      req.user.id,
      { address },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Address updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  getDetails,
  createregister,
  loginuser,
  createManager,
  createWorker,
  getAllWorkers,
  getMyWorkers,
  getAllManagers,
  forgotPassword,
  resetPassword,
  updateAddress,
};
