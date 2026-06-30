const Cart = require("../model/product/cartmodel");

const addToCart = async (req, res) => {
  const userId = req.userId;
  const { productId } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, quantity: 1 }],
      });
    } else {
      const index = cart.items.findIndex(
        (item) => item.productId.toString() === productId,
      );

      if (index !== -1) {
        cart.items[index].quantity += 1;
      } else {
        cart.items.push({
          productId,
          quantity: 1,
        });
      }
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.userId,
    }).populate("items.productId");

    if (!cart) {
      return res.json({
        success: true,
        items: [],
        total: 0,
      });
    }

    const items = cart.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        image: item.productId.image,
        price: item.productId.price,
        quantity: item.quantity,
        subtotal: item.productId.price * item.quantity,
      }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    res.status(200).json({
      success: true,
      items,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const increaseQuantity = async (req, res) => {
  const { productId } = req.body;

  try {
    const cart = await Cart.findOne({
      userId: req.userId,
    });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    item.quantity += 1;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Quantity increased",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const decreaseQuantity = async (req, res) => {
  const { productId } = req.body;

  try {
    const cart = await Cart.findOne({
      userId: req.userId,
    });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (item.quantity > 1) {
      item.quantity -= 1;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Quantity decreased",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeItem = async (req, res) => {
  const { productId } = req.body;

  try {
    const cart = await Cart.findOne({
      userId: req.userId,
    });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId,
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.userId,
    });

    if (!cart) {
      return res.json({
        success: true,
        message: "Cart already empty",
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Payment successful. Cart cleared.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
};
