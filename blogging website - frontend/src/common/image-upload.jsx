// utils/imageUploader.js
import { storage, ref, uploadBytesResumable, getDownloadURL } from './firebase';

export const uploadImageToFirebase = async (file, folderPath = 'blogai_images') => {
  try {
    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, WEBP)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folderPath}/${fileName}`);
    
    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return a promise that resolves with upload result
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking (optional)
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Handle successful upload
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            const uploadResult = {
              url: downloadURL,
              fileName: fileName,
              originalName: file.name,
              size: file.size,
              type: file.type,
              fullPath: uploadTask.snapshot.ref.fullPath,
              bucket: uploadTask.snapshot.ref.bucket,
              timestamp: new Date().toISOString(),
              metadata: {
                contentType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
              }
            };
            
            resolve(uploadResult);
          } catch (error) {
            reject(error);
          }
        }
      );
    });

  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};