const mongoose = require("mongoose");

const registerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    number: {
      type: Number,
      required: true,
    },

    address: {
      type: String,
      required: true, 
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "manager", "worker"],
      default: "worker",
    },

    designation: {
      type: String,
      enum: ["manager", "chef", "server", "delivery"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Register", registerSchema);
