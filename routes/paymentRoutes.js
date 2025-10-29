const express = require("express");
const router = express.Router();
const { createPayment, getPayments, getPaymentById, updatePayment, deletePayment, mpesaCallback } = require("../controller/paymentController");
const { auth } = require("../middleware/auth");

router.post("/", auth, createPayment); // initiate mpesa stk push
router.post("/callback", mpesaCallback); // mpesa callback
router.get("/", auth, getPayments);
router.get("/:id", auth, getPaymentById);
router.put("/:id", auth, updatePayment);
router.delete("/:id", auth, deletePayment);

module.exports = router;
