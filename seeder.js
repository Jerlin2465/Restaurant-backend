require("dotenv").config();
const dns = require("dns");

const mongoose = require("mongoose");
const Register = require("./model/registermodel");
const bcrypt = require("bcrypt");

const createAdmin = async () => {
  dns.setServers(["1.1.1.1", "1.0.0.1"]);

  await mongoose.connect(process.env.MONGO_URL);

  const exist = await Register.findOne({
    email: "admin@gmail.com",
  });

  if (exist) {
    console.log("Admin already exists");
    process.exit();
  }

  const hashPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  await Register.create({
    name: "Jerlin",
    email: "admin@gmail.com",
    number: 9876543218,
    password: hashPassword,
    role: "admin",
  });

  console.log("Admin created");
  process.exit();
};

createAdmin();
