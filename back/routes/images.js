
const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { generateId } = require('../utils/idGenerator');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
const THUMBNAIL_WIDTH = 44; // pixels
const THUMBNAIL_HEIGHT = 55; // pixels

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// POST /api/images/upload-from-url
// Downloads an image from a URL, resizes it to a thumbnail, and saves it.
router.post('/upload-from-url', protect, isAdmin, async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required.' });
    }

    try {
        // 1. Download the image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // 2. Process and save as thumbnail
        const imageId = generateId('img_');
        const filename = `${imageId}.webp`; // Using webp for modern compression
        const filePath = path.join(UPLOADS_DIR, filename);

        // Save full-size image
        const fullSizeFilename = `${imageId}_full.webp`;
        const fullSizeFilePath = path.join(UPLOADS_DIR, fullSizeFilename);
        await sharp(imageBuffer)
            .webp({ quality: 90 })
            .toFile(fullSizeFilePath);

        // Save thumbnail
        const thumbnailFilename = `${imageId}.webp`;
        const thumbnailFilePath = path.join(UPLOADS_DIR, thumbnailFilename);
        await sharp(imageBuffer)
            .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'inside' })
            .webp({ quality: 80 })
            .toFile(thumbnailFilePath);

        // Return the URLs to the saved images
        const imageUrlPath = `/uploads/${thumbnailFilename}`;
        const fullSizeImageUrlPath = `/uploads/${fullSizeFilename}`;
        res.status(200).json({ imageUrl: imageUrlPath, fullSizeImageUrl: fullSizeImageUrlPath });

    } catch (error) {
        console.error('Error processing image from URL:', error);
        res.status(500).json({ message: 'Failed to process image from URL.', error: error.message });
    }
});

module.exports = router;
