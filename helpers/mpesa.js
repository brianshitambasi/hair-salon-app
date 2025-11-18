const axios = require("axios");
require("dotenv").config();

const baseURL = "https://sandbox.safaricom.co.ke";

exports.getMpesaToken = async () => {
  try {
    const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
    
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
      throw new Error("M-Pesa credentials missing");
    }
    
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

    const response = await axios.get(
      `${baseURL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { 
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Token generation error:", error.response?.data || error.message);
    throw error;
  }
};

exports.initiateSTKPush = async (phone, amount, accountReference) => {
  try {
    const token = await this.getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const shortcode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY;
    
    if (!passkey) {
      throw new Error("M-Pesa passkey missing");
    }

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    // Format phone number correctly
    let formattedPhone = phone;
    if (phone.startsWith("0")) {
      formattedPhone = "254" + phone.substring(1);
    } else if (phone.startsWith("+254")) {
      formattedPhone = phone.substring(1);
    }

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount), // Ensure whole number
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: "Hair Salon Service Payment",
    };

    console.log("STK Push Payload:", payload);

    const response = await axios.post(
      `${baseURL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("STK Push Error:", error.response?.data || error.message);
    throw error;
  }
};