// resetShops.js
const mongoose = require('mongoose');

// Your MongoDB connection string from your environment
const MONGO_URI = 'mongodb+srv://taskapi:11637bms@cluster0.y2jtzdr.mongodb.net/donor_db?retryWrites=true&w=majority&appName=Cluster0';

const resetShops = async () => {
  try {
    console.log('🔄 Starting shop reset process...');
    console.log('📡 Connecting to your database...');
    
    // Connect to your database using your URI
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database successfully!');
    
    // Count shops before deletion
    const beforeCount = await mongoose.connection.db.collection('shops').countDocuments();
    console.log(`📊 Found ${beforeCount} shops in the database`);
    
    if (beforeCount === 0) {
      console.log('ℹ️  No shops found to delete. Your database is already empty.');
      await mongoose.disconnect();
      return;
    }
    
    // Show a sample of what we're deleting
    const sampleShops = await mongoose.connection.db.collection('shops').find().limit(3).toArray();
    console.log('\n🗑️  Sample shops to be deleted:');
    sampleShops.forEach((shop, index) => {
      console.log(`   ${index + 1}. ${shop.name} (Image: ${shop.image})`);
    });
    
    // Ask for confirmation (safety check)
    console.log('\n⚠️  WARNING: This will permanently delete ALL shops from your database!');
    console.log('⚠️  This action cannot be undone!');
    
    // Simulate confirmation (remove this in production)
    console.log('🚀 Proceeding with deletion...');
    
    // Delete all shops
    const result = await mongoose.connection.db.collection('shops').deleteMany({});
    console.log(`\n✅ SUCCESS: Deleted ${result.deletedCount} shops from the database`);
    
    // Verify deletion
    const afterCount = await mongoose.connection.db.collection('shops').countDocuments();
    console.log(`📊 Shops remaining after deletion: ${afterCount}`);
    
    if (afterCount === 0) {
      console.log('🎉 SUCCESS: All shops have been completely reset!');
      console.log('\n📝 Next steps:');
      console.log('   1. Shop owners can now create new shops');
      console.log('   2. All new shops will use Cloudinary images');
      console.log('   3. No more image loading errors!');
    } else {
      console.log('❌ WARNING: Some shops still remain in the database');
    }
    
    await mongoose.disconnect();
    console.log('🔒 Database connection closed');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('💡 Tips:');
    console.log('   - Check if your MongoDB connection string is correct');
    console.log('   - Ensure your IP is whitelisted in MongoDB Atlas');
    console.log('   - Check your internet connection');
    process.exit(1);
  }
};

// Run the reset function
resetShops();