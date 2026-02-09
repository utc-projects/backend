const TourismPoint = require('../models/TourismPoint');

// Convert points to GeoJSON FeatureCollection
const toGeoJSON = (points) => ({
  type: 'FeatureCollection',
  features: points.map(point => ({
    type: 'Feature',
    geometry: point.location,
    properties: {
      _id: point._id,
      name: point.name,
      category: point.category,
      highlights: point.highlights,
      description: point.description,
      images: point.images,
      videos: point.videos,
      role: point.role,
      linkedModule: point.linkedModule,
      assignments: point.assignments,
      createdAt: point.createdAt,
      routeCount: point.routeCount,
    },
  })),
});

// @desc    Get all points as GeoJSON
// @route   GET /api/points
// @access  Public
exports.getAllPoints = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, category } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { category: searchRegex },
          { description: searchRegex }
        ]
      };
    }

    if (category) {
      query.category = category;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await TourismPoint.countDocuments(query);
    const points = await TourismPoint.find(query)
      .populate('routeCount')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);
      
    const geoJson = toGeoJSON(points);
    
    // Add pagination metadata to the response
    const response = {
        ...geoJson,
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems: total,
            totalPages: Math.ceil(total / limitNum)
        }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single point
// @route   GET /api/points/:id
// @access  Public
exports.getPointById = async (req, res) => {
  try {
    const point = await TourismPoint.findById(req.params.id);
    if (!point) {
      return res.status(404).json({ message: 'Không tìm thấy điểm du lịch' });
    }
    res.json(point);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get points by category
// @route   GET /api/points/category/:category
// @access  Public
exports.getPointsByCategory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { category: req.params.category };

    const total = await TourismPoint.countDocuments(query);
    const points = await TourismPoint.find(query)
        .skip(skip)
        .limit(limitNum);
    
    const geoJson = toGeoJSON(points);
     const response = {
        ...geoJson,
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems: total,
            totalPages: Math.ceil(total / limitNum)
        }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get points within radius
// @route   GET /api/points/nearby?lng=&lat=&radius=
// @access  Public
exports.getNearbyPoints = async (req, res) => {
  try {
    const { lng, lat, radius = 50 } = req.query;
    
    if (!lng || !lat) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tọa độ (lng, lat)' });
    }

    const points = await TourismPoint.findWithinRadius(
      parseFloat(lng),
      parseFloat(lat),
      parseFloat(radius)
    );
    
    res.json(toGeoJSON(points));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create new point
// @route   POST /api/points
// @access  Public (should be protected in production)
exports.createPoint = async (req, res) => {
  try {
    const pointData = { ...req.body };
    
    // Handle Images
    if (req.files && req.files['images']) {
      // Validate image sizes (< 1MB)
      const oversizedImages = req.files['images'].filter(f => f.size > 1024 * 1024);
      if (oversizedImages.length > 0) {
        // Cleanup all uploaded files
        const fs = require('fs');
        if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
        if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ message: 'Ảnh không được vượt quá 1MB' });
      }
      pointData.images = req.files['images'].map(file => file.path);
    }

    // Handle Videos
    if (req.files && req.files['videos']) {
      pointData.videos = req.files['videos'].map(file => file.path);
    }

    // Parse coordinates if sent as string (from FormData)
    if (typeof pointData.location === 'string') {
        try {
            pointData.location = JSON.parse(pointData.location);
        } catch (e) {
            // Handle if it's just raw coords string "lng,lat"
             // But existing frontend sends structure. Let's assume frontend sends JSON string for object fields
        }
    }
    // Note: FormData sends text fields as strings. Mongoose casts numbers/booleans automatically often, but nested objects like 'location' need parsing if sent as JSON string.
    // My plan is to construct the location object separately in frontend and send 'coordinates' maybe?
    // Let's check frontend plan. Plan says: append location object. FormData handles simple key-values.
    // Sending nested objects in FormData is tricky (location[type]=Point).
    // Better strategy: Frontend sends 'lat' and 'lng', backend constructs metadata.
    // OR Frontend sends `location` as specific fields.
    // Current frontend `handleSubmit` constructs `location` object.
    // I should parse it if it comes as string.

    // If 'location.coordinates' comes as flat fields or I need to parse body manually?
    // Multer populates req.body.
    // If frontend sends: formData.append('location', JSON.stringify(locObj));
    if (req.body.location && typeof req.body.location === 'string') {
        pointData.location = JSON.parse(req.body.location);
    }

    const point = new TourismPoint(pointData);
    await point.save();
    res.status(201).json(point);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Update point
// @route   PUT /api/points/:id
// @access  Public (should be protected in production)
exports.updatePoint = async (req, res) => {
  try {
    const point = await TourismPoint.findById(req.params.id);
    if (!point) {
      return res.status(404).json({ message: 'Không tìm thấy điểm du lịch' });
    }

    const updates = { ...req.body };

    // JSON parse location if string
    if (updates.location && typeof updates.location === 'string') {
        updates.location = JSON.parse(updates.location);
    }

    // Refined Strategy for Deletion:
    // If 'existingImages' field is present in body (even if empty string), it represents the new list of retained images.
    // We filter out empty strings to allow sending "" to clear the list.
    
    let finalImages = point.images;
    if (req.body.existingImages !== undefined) {
         let kept = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
         // Filter out empty strings which might be sent to indicate "empty list"
         finalImages = kept.filter(img => img && img.trim() !== '');
    }

    // Handle New Images
    if (req.files && req.files['images']) {
        // Validate image sizes (< 1MB)
        const oversizedImages = req.files['images'].filter(f => f.size > 1024 * 1024);
        if (oversizedImages.length > 0) {
             // Cleanup
             const fs = require('fs');
             if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
             if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
             return res.status(400).json({ message: 'Ảnh không được vượt quá 1MB' });
        }
        const newImgs = req.files['images'].map(f => f.path);
        // Append new images to the kept existing ones
        // If finalImages was undefined (no change requested), we append to current point.images
        // But the logic above sets finalImages = point.images by default.
        // Wait, if req.body.existingImages IS undefined, finalImages IS point.images.
        // So we append to point.images. Correct.
        updates.images = [...(finalImages || []), ...newImgs];
    } else if (req.body.existingImages !== undefined) {
        // If no new files, but we have an update to existingImages, apply it
        updates.images = finalImages;
    }

    // Same for videos
    let finalVideos = point.videos;
    if (req.body.existingVideos !== undefined) {
          let kept = Array.isArray(req.body.existingVideos) ? req.body.existingVideos : [req.body.existingVideos];
          finalVideos = kept.filter(vid => vid && vid.trim() !== '');
    }
    
    if (req.files && req.files['videos']) {
         const newVids = req.files['videos'].map(f => f.path);
         updates.videos = [...(finalVideos || []), ...newVids];
    } else if (req.body.existingVideos !== undefined) {
         updates.videos = finalVideos;
    }

    Object.assign(point, updates);
    await point.save();
    
    res.json(point);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Delete point
// @route   DELETE /api/points/:id
// @access  Public (should be protected in production)
exports.deletePoint = async (req, res) => {
  try {
    const pointId = req.params.id;

    // Check if point is used in any tourism routes
    const TourismRoute = require('../models/TourismRoute');
    const routesUsingPoint = await TourismRoute.find({ points: pointId }).select('routeName');

    if (routesUsingPoint.length > 0) {
      const routeNames = routesUsingPoint.map(r => r.routeName);
      return res.status(400).json({
        message: `Không thể xóa điểm này vì đang được sử dụng trong ${routesUsingPoint.length} tuyến du lịch`,
        routes: routeNames
      });
    }

    const point = await TourismPoint.findById(pointId);
    if (!point) {
      return res.status(404).json({ message: 'Không tìm thấy điểm du lịch' });
    }

    // Delete associated files (images and videos)
    const fs = require('fs');
    
    // Function to safely delete a file
    const deleteFile = (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        }
    };

    if (point.images && point.images.length > 0) {
        point.images.forEach(imagePath => deleteFile(imagePath));
    }

    if (point.videos && point.videos.length > 0) {
        point.videos.forEach(videoPath => deleteFile(videoPath));
    }

    await TourismPoint.findByIdAndDelete(pointId);
    
    res.json({ message: 'Đã xóa điểm du lịch và các tệp đính kèm thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

