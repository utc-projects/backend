const ServiceProvider = require('../models/ServiceProvider');

// Convert providers to GeoJSON FeatureCollection
const toGeoJSON = (providers) => ({
  type: 'FeatureCollection',
  features: providers.map(provider => ({
    type: 'Feature',
    geometry: provider.location,
    properties: {
      _id: provider._id,
      name: provider.name,
      serviceType: provider.serviceType,
      subType: provider.subType,
      subTypeInfo: provider.subTypeInfo,
      categoryInfo: provider.categoryInfo,
      address: provider.address,
      serviceArea: provider.serviceArea,
      contact: provider.contact,
      priceRange: provider.priceRange,
      description: provider.description,
      images: provider.images,
      videos: provider.videos,
      rating: provider.rating,
      isRecommended: provider.isRecommended,
      educationalNotes: provider.educationalNotes,
      createdAt: provider.createdAt,
    },
  })),
});

// @desc    Get all providers as GeoJSON
// @route   GET /api/providers
// @access  Public
exports.getAllProviders = async (req, res) => {
  try {
    const { serviceType, subType, recommended, search } = req.query;
    const filter = {};
    
    if (serviceType) filter.serviceType = serviceType;
    if (subType) filter.subType = subType;
    if (recommended === 'true') filter.isRecommended = true;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { address: searchRegex },
        { description: searchRegex }
      ];
    }

    const providers = await ServiceProvider.find(filter)
      .populate('linkedPoints', 'name')
      .populate('linkedRoutes', 'routeName')
      .sort({ name: 1 });
    res.json(toGeoJSON(providers));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single provider
// @route   GET /api/providers/:id
// @access  Public
exports.getProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id)
      .populate('linkedPoints', 'name location category')
      .populate('linkedRoutes', 'routeName duration');
    if (!provider) {
      return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    }
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get providers by service type (category)
// @route   GET /api/providers/type/:serviceType
// @access  Public
exports.getProvidersByType = async (req, res) => {
  try {
    const validTypes = ['accommodation', 'dining', 'transportation', 'entertainment', 'support'];
    const { serviceType } = req.params;
    const { subType } = req.query;
    
    if (!validTypes.includes(serviceType)) {
      return res.status(400).json({ 
        message: 'Loại dịch vụ không hợp lệ',
        validTypes: validTypes,
      });
    }

    const filter = { serviceType };
    if (subType) filter.subType = subType;

    const providers = await ServiceProvider.find(filter)
      .populate('linkedPoints', 'name')
      .sort({ rating: -1 });
    
    res.json(toGeoJSON(providers));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get providers by sub-type
// @route   GET /api/providers/subtype/:subType
// @access  Public
exports.getProvidersBySubType = async (req, res) => {
  try {
    const { subType } = req.params;
    
    if (!ServiceProvider.SERVICE_SUB_TYPES[subType]) {
      return res.status(400).json({ 
        message: 'Sub-type không hợp lệ',
        validSubTypes: Object.keys(ServiceProvider.SERVICE_SUB_TYPES),
      });
    }

    const providers = await ServiceProvider.find({ subType })
      .populate('linkedPoints', 'name')
      .sort({ rating: -1 });
    
    res.json(toGeoJSON(providers));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get providers by route (for route-based suggestions)
// @route   GET /api/providers/route/:routeId
// @access  Public
exports.getProvidersByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { serviceType, subType } = req.query;

    const options = {};
    if (serviceType) options.serviceType = serviceType;
    if (subType) options.subType = subType;

    const providers = await ServiceProvider.findByRoute(routeId, options)
      .populate('linkedPoints', 'name');
    
    res.json(toGeoJSON(providers));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get providers near location
// @route   GET /api/providers/nearby?lng=&lat=&radius=&type=&subType=
// @access  Public
exports.getNearbyProviders = async (req, res) => {
  try {
    const { lng, lat, radius = 50, type, subType } = req.query;
    
    if (!lng || !lat) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tọa độ (lng, lat)' });
    }

    const options = {};
    if (type) options.serviceType = type;
    if (subType) options.subType = subType;

    const providers = await ServiceProvider.findNearPoint(
      parseFloat(lng),
      parseFloat(lat),
      parseFloat(radius),
      options
    ).populate('linkedPoints', 'name');
    
    res.json(toGeoJSON(providers));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get all categories with sub-types (for multi-level filter)
// @route   GET /api/providers/categories
// @access  Public
exports.getCategoriesWithSubTypes = async (req, res) => {
  try {
    const categories = ServiceProvider.getCategoriesWithSubTypes();
    
    // Count providers per category and sub-type
    const categoryCountsPromise = ServiceProvider.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } }
    ]);
    
    const subTypeCountsPromise = ServiceProvider.aggregate([
      { $group: { _id: { serviceType: '$serviceType', subType: '$subType' }, count: { $sum: 1 } } }
    ]);

    const [categoryCounts, subTypeCounts] = await Promise.all([categoryCountsPromise, subTypeCountsPromise]);

    const categoryCountsMap = new Map(categoryCounts.map(c => [c._id, c.count]));
    const subTypeCountsMap = new Map(
      subTypeCounts.map(c => [`${c._id.serviceType}-${c._id.subType}`, c.count])
    );

    const result = categories.map(cat => ({
      ...cat,
      count: categoryCountsMap.get(cat.value) || 0,
      subTypes: cat.subTypes.map(sub => ({
        ...sub,
        count: subTypeCountsMap.get(`${cat.value}-${sub.value}`) || 0,
      })),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get service type labels (legacy, for backward compatibility)
// @route   GET /api/providers/types
// @access  Public
exports.getServiceTypes = async (req, res) => {
  try {
    const categories = ServiceProvider.getCategoriesWithSubTypes();
    
    // Count providers per type
    const counts = await ServiceProvider.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } }
    ]);
    
    const countsMap = new Map(counts.map(c => [c._id, c.count]));
    
    const typesWithCount = categories.map(cat => ({
      value: cat.value,
      label: cat.label,
      icon: cat.icon,
      count: countsMap.get(cat.value) || 0,
    }));
    
    res.json(typesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create new provider
// @route   POST /api/providers
// @access  Public (should be protected in production)
exports.createProvider = async (req, res) => {
  try {
    const providerData = { ...req.body };

    // Parse location if it's string (FormData sends JSON strings)
    if (typeof providerData.location === 'string') {
        try {
            providerData.location = JSON.parse(providerData.location);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid location format' });
        }
    }
    
    // Parse contact if string
    if (typeof providerData.contact === 'string') {
        try {
             providerData.contact = JSON.parse(providerData.contact);
        } catch (e) {
             // If parsing fails, it might be individual fields sent (formData doesn't nest well without JSON stringify)
             // Frontend will send JSON string for complex objects
        }
    }

    // Handle Images
    if (req.files && req.files['images']) {
          // Validate image sizes (< 1MB)
          const oversizedImages = req.files['images'].filter(f => f.size > 1024 * 1024);
          if (oversizedImages.length > 0) {
            const fs = require('fs');
            if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
            if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ message: 'Ảnh không được vượt quá 1MB' });
          }
          providerData.images = req.files['images'].map(file => file.path);
    }

    // Handle Videos
    if (req.files && req.files['videos']) {
         // Validate video sizes (< 2MB)
          const oversizedVideos = req.files['videos'].filter(f => f.size > 2 * 1024 * 1024);
          if (oversizedVideos.length > 0) {
            const fs = require('fs');
            if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
            if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ message: 'Video không được vượt quá 2MB' });
          }
          providerData.videos = req.files['videos'].map(file => file.path);
    }

    const provider = new ServiceProvider(providerData);
    await provider.save();
    res.status(201).json(provider);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Update provider
// @route   PUT /api/providers/:id
// @access  Public (should be protected in production)
exports.updateProvider = async (req, res) => {
  try {
    let updates = { ...req.body };

    // Parse location
    if (typeof updates.location === 'string') {
        try {
            updates.location = JSON.parse(updates.location);
        } catch (e) {}
    }
    // Parse contact
    if (typeof updates.contact === 'string') {
         try {
            updates.contact = JSON.parse(updates.contact);
         } catch(e) {}
    }

    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
       return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    }

    // Handle Images Logic
    let finalImages = provider.images;
    if (req.body.existingImages !== undefined) {
         let kept = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
         finalImages = kept.filter(img => img && img.trim() !== '');
    }

    if (req.files && req.files['images']) {
         // Validate size
         const oversizedImages = req.files['images'].filter(f => f.size > 1024 * 1024);
         if (oversizedImages.length > 0) {
            // cleanup
            const fs = require('fs');
            if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
            if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ message: 'Ảnh không được vượt quá 1MB' });
         }
         const newImgs = req.files['images'].map(f => f.path);
         updates.images = [...(finalImages || []), ...newImgs];
    } else if (req.body.existingImages !== undefined) {
         updates.images = finalImages;
    }

    // Handle Videos Logic
    let finalVideos = provider.videos || [];
    if (req.body.existingVideos !== undefined) {
          let kept = Array.isArray(req.body.existingVideos) ? req.body.existingVideos : [req.body.existingVideos];
          finalVideos = kept.filter(vid => vid && vid.trim() !== '');
    }
    
    if (req.files && req.files['videos']) {
         // Validate size
         const oversizedVideos = req.files['videos'].filter(f => f.size > 2 * 1024 * 1024);
          if (oversizedVideos.length > 0) {
            // cleanup
            const fs = require('fs');
            if (req.files['images']) req.files['images'].forEach(f => fs.unlinkSync(f.path));
            if (req.files['videos']) req.files['videos'].forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ message: 'Video không được vượt quá 2MB' });
          }
         const newVids = req.files['videos'].map(f => f.path);
         updates.videos = [...(finalVideos || []), ...newVids];
    } else if (req.body.existingVideos !== undefined) {
         updates.videos = finalVideos;
    }

    const updatedProvider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json(updatedProvider);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Delete provider
// @route   DELETE /api/providers/:id
// @access  Public (should be protected in production)
exports.deleteProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
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

    if (provider.images && provider.images.length > 0) {
        provider.images.forEach(imagePath => deleteFile(imagePath));
    }

    if (provider.videos && provider.videos.length > 0) {
        provider.videos.forEach(videoPath => deleteFile(videoPath));
    }

    await ServiceProvider.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa nhà cung cấp và các tệp đính kèm thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
