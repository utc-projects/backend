const mongoose = require('mongoose');

/**
 * Service Type Hierarchy (Phân cấp loại dịch vụ)
 * 
 * 1. Lưu trú (accommodation)
 *    - hotel: Khách sạn
 *    - homestay: Homestay
 *    - resort: Resort
 * 
 * 2. Ăn uống (dining)
 *    - restaurant: Nhà hàng
 *    - local_food: Cơ sở ẩm thực địa phương
 * 
 * 3. Vận chuyển (transportation)
 *    - tour_bus: Xe du lịch
 *    - boat: Tàu thuyền
 *    - cable_car: Cáp treo
 * 
 * 4. Tham quan – Giải trí (entertainment)
 *    - tourist_area: Khu du lịch
 *    - amusement: Điểm vui chơi
 *    - experience: Hoạt động trải nghiệm
 * 
 * 5. Dịch vụ hỗ trợ (support)
 *    - guide: Hướng dẫn viên
 *    - shopping: Cơ sở mua sắm
 *    - other: Dịch vụ bổ trợ khác
 */

// Sub-type configuration with labels and icons
const SERVICE_SUB_TYPES = {
  // Lưu trú
  hotel: { label: 'Khách sạn', category: 'accommodation', icon: '🏨' },
  homestay: { label: 'Homestay', category: 'accommodation', icon: '🏠' },
  resort: { label: 'Resort', category: 'accommodation', icon: '🏝️' },
  // Ăn uống
  restaurant: { label: 'Nhà hàng', category: 'dining', icon: '🍽️' },
  local_food: { label: 'Ẩm thực địa phương', category: 'dining', icon: '🍜' },
  // Vận chuyển
  tour_bus: { label: 'Xe du lịch', category: 'transportation', icon: '🚌' },
  boat: { label: 'Tàu thuyền', category: 'transportation', icon: '🚢' },
  cable_car: { label: 'Cáp treo', category: 'transportation', icon: '🚡' },
  // Tham quan - Giải trí
  tourist_area: { label: 'Khu du lịch', category: 'entertainment', icon: '🏞️' },
  amusement: { label: 'Điểm vui chơi', category: 'entertainment', icon: '🎢' },
  experience: { label: 'Hoạt động trải nghiệm', category: 'entertainment', icon: '🎯' },
  // Dịch vụ hỗ trợ
  guide: { label: 'Hướng dẫn viên', category: 'support', icon: '🧑‍🏫' },
  shopping: { label: 'Cơ sở mua sắm', category: 'support', icon: '🛍️' },
  other: { label: 'Dịch vụ bổ trợ', category: 'support', icon: '🎫' },
};

// Category configuration
const SERVICE_CATEGORIES = {
  accommodation: { label: 'Lưu trú', icon: '🏨' },
  dining: { label: 'Ăn uống', icon: '🍜' },
  transportation: { label: 'Vận chuyển', icon: '🚐' },
  entertainment: { label: 'Tham quan - Giải trí', icon: '🎢' },
  support: { label: 'Dịch vụ hỗ trợ', icon: '🎫' },
};

const serviceProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nhà cung cấp là bắt buộc'],
    trim: true,
  },
  // Main service category
  serviceType: {
    type: String,
    enum: ['accommodation', 'dining', 'transportation', 'entertainment', 'support'],
    required: [true, 'Loại dịch vụ là bắt buộc'],
  },
  // Detailed sub-type
  subType: {
    type: String,
    enum: Object.keys(SERVICE_SUB_TYPES),
    required: [true, 'Loại dịch vụ chi tiết là bắt buộc'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Tọa độ là bắt buộc'],
    },
  },
  address: {
    type: String,
    required: [true, 'Địa chỉ là bắt buộc'],
  },
  // Phạm vi phục vụ
  serviceArea: {
    type: String,
    enum: ['Địa phương', 'Tuyến', 'Vùng'],
    default: 'Địa phương',
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
  },
  priceRange: {
    type: String,
    enum: ['Bình dân', 'Trung cấp', 'Cao cấp'],
    default: 'Trung cấp',
  },
  description: {
    type: String,
    default: '',
  },
  defaultPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    type: String,
  }],
  videos: [{
    type: String,
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4,
  },
  // Link to tourism points
  linkedPoints: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPoint',
  }],
  // Link to routes this provider serves
  linkedRoutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismRoute',
  }],
  // Educational content
  educationalNotes: {
    type: String,
    default: '',
  },
  // Is this provider recommended for educational tours?
  isRecommended: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// GeoJSON index for geospatial queries
serviceProviderSchema.index({ location: '2dsphere' });
serviceProviderSchema.index({ serviceType: 1, subType: 1 });

// Virtual: Get sub-type info
serviceProviderSchema.virtual('subTypeInfo').get(function() {
  return SERVICE_SUB_TYPES[this.subType] || null;
});

// Virtual: Get category info
serviceProviderSchema.virtual('categoryInfo').get(function() {
  return SERVICE_CATEGORIES[this.serviceType] || null;
});

// Virtual: Count of linked points
serviceProviderSchema.virtual('pointsCount').get(function() {
  return this.linkedPoints ? this.linkedPoints.length : 0;
});

// Static: Get all sub-types for a category
serviceProviderSchema.statics.getSubTypesByCategory = function(category) {
  return Object.entries(SERVICE_SUB_TYPES)
    .filter(([key, value]) => value.category === category)
    .map(([key, value]) => ({
      value: key,
      label: value.label,
      icon: value.icon,
    }));
};

// Static: Get all categories with their sub-types
serviceProviderSchema.statics.getCategoriesWithSubTypes = function() {
  return Object.entries(SERVICE_CATEGORIES).map(([categoryKey, categoryInfo]) => ({
    value: categoryKey,
    label: categoryInfo.label,
    icon: categoryInfo.icon,
    subTypes: Object.entries(SERVICE_SUB_TYPES)
      .filter(([key, value]) => value.category === categoryKey)
      .map(([key, value]) => ({
        value: key,
        label: value.label,
        icon: value.icon,
      })),
  }));
};

// Static: Get service type label
serviceProviderSchema.statics.getServiceTypeLabel = function(type) {
  return SERVICE_CATEGORIES[type]?.label || type;
};

// Static: Get sub-type label
serviceProviderSchema.statics.getSubTypeLabel = function(subType) {
  return SERVICE_SUB_TYPES[subType]?.label || subType;
};

// Static: Find providers near a point
serviceProviderSchema.statics.findNearPoint = function(lng, lat, radiusKm, options = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  };
  
  if (options.serviceType) {
    query.serviceType = options.serviceType;
  }
  if (options.subType) {
    query.subType = options.subType;
  }
  
  return this.find(query);
};

// Static: Find providers by route
serviceProviderSchema.statics.findByRoute = function(routeId, options = {}) {
  const query = { linkedRoutes: routeId };
  
  if (options.serviceType) {
    query.serviceType = options.serviceType;
  }
  if (options.subType) {
    query.subType = options.subType;
  }
  
  return this.find(query);
};

// Export constants for use in other files
serviceProviderSchema.statics.SERVICE_SUB_TYPES = SERVICE_SUB_TYPES;
serviceProviderSchema.statics.SERVICE_CATEGORIES = SERVICE_CATEGORIES;

const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

module.exports = ServiceProvider;
