const express = require("express");
const dns = require("dns");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDb = require("./config/db");

const register = require("./router/registerRouter");
const productRouter = require("./router/productRouter");
const orderRouter = require("./router/orderRouter");
const cartRouter = require("./router/cartRouter");
const paymentRouter = require("./router/paymentRouter");
const tableBookingRouter = require("./router/tablebookingrouter");
const kitchenNotificationRouter = require("./router/kitchennotifirouter");
const foodorderRouter = require("./router/foodorderRouter");
const billRouter = require("./router/billrouter");

dns.setServers(["1.1.1.1", "1.0.0.1"]);
1;
dotenv.config();
connectDb();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://localhost:5001",
      "https://jerry-restaurant.vercel.app",
      "https://restaurant-backend-tttl.onrender.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});
app.use("/api", register);
app.use("/product", productRouter);
app.use("/order", orderRouter);
app.use("/cart", cartRouter);
app.use("/payment", paymentRouter);
app.use("/kitchen", kitchenNotificationRouter);
app.use("/table", tableBookingRouter);
app.use("/food", foodorderRouter);
app.use("/bill", billRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
