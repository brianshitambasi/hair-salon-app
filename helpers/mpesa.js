const axios = require("axios");
require("dotenv").config();

const baseURL = "https://sandbox.safaricom.co.ke"; // Change to live URL when in production

// 🔐 Generate Access Token
exports.getMpesaToken = async () => {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  return response.data.access_token;
};

// 📲 Send STK Push
exports.initiateSTKPush = async (phone, amount, accountReference) => {
  const token = await this.getMpesaToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone.startsWith("254") ? phone : `254${phone.slice(-9)}`,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone.startsWith("254") ? phone : `254${phone.slice(-9)}`,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: "Looks Nairobi Service Payment",
  };

  const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};
