// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary (using your working credentials)
cloudinary.config({
  cloud_name: 'denczbmin',
  api_key: '911139828565233',
  api_secret: 'jp0OmzxQF_qg8vdXPpfnnbgBwIs',
});

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, transformation = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `beautyhub/${folder}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 600, crop: 'limit' }],
        ...transformation
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = { 
  cloudinary, 
  uploadToCloudinary, 
  deleteFromCloudinary 
};