// scripts/migrateShopImages.js
const mongoose = require('mongoose');
const { Shop } = require('../models/model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

const migrateShopImages = async () => {
  try {
    console.log('Starting shop image migration...');
    
    // Connect to your database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');
    
    // Find all shops that have local file paths instead of Cloudinary objects
    const shops = await Shop.find({
      $or: [
        { image: { $type: 'string' } }, // Image is a string (file path)
        { image: { $exists: false } }, // No image field
        { image: null } // Image is null
      ]
    });
    
    console.log(`Found ${shops.length} shops to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const shop of shops) {
      try {
        console.log(`Processing shop: ${shop.name} (${shop._id})`);
        
        // If shop has a local file path, we need to handle it
        if (typeof shop.image === 'string' && shop.image.startsWith('/uploads/')) {
          console.log(`Shop has local file path: ${shop.image}`);
          
          // Since we can't access the actual files on deployed server,
          // we'll set the image to null and let the shop owner re-upload
          shop.image = {};
          await shop.save();
          console.log(`Reset image for shop: ${shop.name}`);
          
        } else if (!shop.image || Object.keys(shop.image).length === 0) {
          // Shop has no image or empty image object
          console.log(`Shop has no image, leaving as is: ${shop.name}`);
        }
        
        migratedCount++;
        
      } catch (shopError) {
        console.error(`Error migrating shop ${shop._id}:`, shopError);
        errorCount++;
      }
    }
    
    console.log(`Migration completed:`);
    console.log(`- Successfully migrated: ${migratedCount} shops`);
    console.log(`- Errors: ${errorCount} shops`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateShopImages();
}

module.exports = { migrateShopImages };