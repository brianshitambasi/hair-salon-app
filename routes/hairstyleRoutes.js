const express = require("express");
const router = express.Router();
const hairstyleController = require("../controller/hairstyleController");
const {auth} = require("../middleware/auth");
    
    // console.log("Hairstyle controller loaded successfully");
    
    router.get("/", hairstyleController.getHairstyles);
    router.get("/shop/:shopId", hairstyleController.getHairstylesByShop);
    router.get("/:id", hairstyleController.getHairstyleById);
    router.post("/", auth, hairstyleController.createHairstyle);
    router.put("/:id", auth, hairstyleController.updateHairstyle);
    router.delete("/:id", auth, hairstyleController.deleteHairstyle);
    


module.exports = router;