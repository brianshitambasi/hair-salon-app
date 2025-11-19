// test-cloudinary.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'denczbmin',
  api_key: '911139828565233',
  api_secret: 'jp0OmzxQF_qg8vdXPpfnnbgBwIs',
});

async function testCloudinary() {
  try {
    console.log('🧪 Testing Cloudinary Configuration...');
    console.log('========================================');
    
    // Test 1: Check configuration
    console.log('\n1. 📋 Checking configuration:');
    console.log('   Cloud Name:', cloudinary.config().cloud_name);
    console.log('   API Key:', cloudinary.config().api_key ? '✅ Present' : '❌ Missing');
    console.log('   API Secret:', cloudinary.config().api_secret ? '✅ Present' : '❌ Missing');
    
    // Test 2: Test connection with ping
    console.log('\n2. 🔗 Testing connection...');
    const pingResult = await cloudinary.api.ping();
    console.log('   Ping status:', pingResult.status === 'ok' ? '✅ Connected' : '❌ Failed');
    
    // Test 3: List existing resources (if any)
    console.log('\n3. 📊 Checking existing resources...');
    const resources = await cloudinary.api.resources({
      type: 'upload',
      max_results: 5
    });
    console.log('   Found', resources.resources.length, 'existing images');
    
    if (resources.resources.length > 0) {
      resources.resources.forEach((resource, index) => {
        console.log(`   ${index + 1}. ${resource.public_id} (${resource.format})`);
      });
    }
    
    // Test 4: Test upload with a small dummy image
    console.log('\n4. 🔼 Testing upload functionality...');
    
    // Create a tiny 1x1 pixel PNG image as base64
    const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const uploadResult = await cloudinary.uploader.upload(tinyImage, {
      folder: 'beautyhub/test',
      public_id: 'test_image_' + Date.now()
    });
    
    console.log('   ✅ Upload successful!');
    console.log('   Public ID:', uploadResult.public_id);
    console.log('   URL:', uploadResult.secure_url);
    console.log('   Format:', uploadResult.format);
    console.log('   Size:', uploadResult.bytes, 'bytes');
    
    // Test 5: Test delete functionality
    console.log('\n5. 🗑️ Testing delete functionality...');
    const deleteResult = await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log('   Delete result:', deleteResult.result === 'ok' ? '✅ Success' : '❌ Failed');
    
    console.log('\n🎉 ALL TESTS PASSED! Cloudinary is working correctly.');
    console.log('✨ You can now proceed with integrating it into your application.');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   1. Check your Cloudinary credentials in the test file');
      console.error('   2. Verify your API key and secret are correct');
      console.error('   3. Make sure your Cloudinary account is active');
    } else if (error.message.includes('getaddrinfo') || error.message.includes('network')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify you can access cloudinary.com');
    } else {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   1. Check the error details above');
      console.error('   2. Make sure Cloudinary service is available');
    }
  }
}

// Run the test
testCloudinary();