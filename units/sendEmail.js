const nodemailer = require("nodemailer");

const sendOrderEmail = async ({ email, name, orderId, totalAmount }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: " Order Placed Successfully",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>Hello ${name} </h2>

          <p>Your order has been placed successfully.</p>

          <h3>Order ID: ${orderId}</h3>
          <h3>Total Amount: ₹${totalAmount}</h3>

          <p>We will notify you once your order is shipped </p>

          <br/>
          <b>Thank you for shopping </b>
        </div>
      `,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.log("Email error:", error.message);
  }
};

module.exports = sendOrderEmail;
