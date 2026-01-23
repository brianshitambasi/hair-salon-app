const express = require("express");
const { auth } = require("../middleware/auth");
const controller = require("../controller/paymentController");

const router = express.Router();

router.post("/", auth, controller.createPayment);
router.get("/", auth, controller.getPayments);

// Callback does NOT need auth
router.post("/callback", controller.mpesaCallback);

module.exports = router;
