/**
 * Seed script for enhanced service providers with sub-types
 * Run with: node src/scripts/seedProviders.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const ServiceProvider = require('../models/ServiceProvider');
const TourismRoute = require('../models/TourismRoute');

const sampleProviders = [
  // === LƯU TRÚ ===
  // Khách sạn
  {
    name: 'Khách sạn Mường Thanh Hà Nội',
    serviceType: 'accommodation',
    subType: 'hotel',
    location: { type: 'Point', coordinates: [105.8544, 21.0285] },
    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    serviceArea: 'Địa phương',
    priceRange: 'Cao cấp',
    rating: 4.5,
    description: 'Khách sạn 4 sao tiêu chuẩn quốc tế với vị trí trung tâm.',
    contact: { phone: '024-1234-5678', website: 'https://muongthanh.com' },
    isRecommended: true,
    educationalNotes: 'Phù hợp cho đoàn thực tập chuyên nghiệp, có phòng hội thảo.',
  },
  // Homestay
  {
    name: 'Homestay Sapa View',
    serviceType: 'accommodation',
    subType: 'homestay',
    location: { type: 'Point', coordinates: [103.8440, 22.3360] },
    address: 'Thôn Tả Van, Sa Pa, Lào Cai',
    serviceArea: 'Địa phương',
    priceRange: 'Bình dân',
    rating: 4.8,
    description: 'Homestay người Giáy với view thung lũng Mường Hoa tuyệt đẹp.',
    contact: { phone: '0987-654-321' },
    isRecommended: true,
    educationalNotes: 'Trải nghiệm văn hóa dân tộc thiểu số, học nấu ăn truyền thống.',
  },
  // Resort
  {
    name: 'Vinpearl Resort Hạ Long',
    serviceType: 'accommodation',
    subType: 'resort',
    location: { type: 'Point', coordinates: [107.0448, 20.9101] },
    address: 'Đảo Rều, TP Hạ Long, Quảng Ninh',
    serviceArea: 'Vùng',
    priceRange: 'Cao cấp',
    rating: 5,
    description: 'Resort 5 sao trên đảo riêng với bãi biển và công viên nước.',
    contact: { phone: '0203-384-6868', website: 'https://vinpearl.com' },
    isRecommended: true,
    educationalNotes: 'Tìm hiểu mô hình kinh doanh resort tích hợp.',
  },

  // === ĂN UỐNG ===
  // Nhà hàng
  {
    name: 'Nhà hàng Sen Tây Hồ',
    serviceType: 'dining',
    subType: 'restaurant',
    location: { type: 'Point', coordinates: [105.8256, 21.0621] },
    address: 'Hồ Tây, Tây Hồ, Hà Nội',
    serviceArea: 'Tuyến',
    priceRange: 'Cao cấp',
    rating: 4.5,
    description: 'Nhà hàng ẩm thực cao cấp với view Hồ Tây thơ mộng.',
    contact: { phone: '024-3823-8888' },
    isRecommended: true,
    educationalNotes: 'Học tiêu chuẩn phục vụ nhà hàng cao cấp.',
  },
  // Ẩm thực địa phương
  {
    name: 'Quán Phở Thìn Lò Đúc',
    serviceType: 'dining',
    subType: 'local_food',
    location: { type: 'Point', coordinates: [105.8564, 21.0250] },
    address: '13 Lò Đúc, Hai Bà Trưng, Hà Nội',
    serviceArea: 'Địa phương',
    priceRange: 'Bình dân',
    rating: 4.7,
    description: 'Phở bò truyền thống Hà Nội với hơn 40 năm lịch sử.',
    contact: { phone: '024-3825-0575' },
    isRecommended: true,
    educationalNotes: 'Tìm hiểu văn hóa ẩm thực đường phố Hà Nội.',
  },

  // === VẬN CHUYỂN ===
  // Xe du lịch
  {
    name: 'Công ty Du lịch Sinh Café',
    serviceType: 'transportation',
    subType: 'tour_bus',
    location: { type: 'Point', coordinates: [105.8500, 21.0300] },
    address: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
    serviceArea: 'Vùng',
    priceRange: 'Trung cấp',
    rating: 4.2,
    description: 'Xe du lịch chất lượng cao tuyến Hà Nội - Hạ Long - Sapa.',
    contact: { phone: '024-3926-1568', website: 'https://sinhcafe.com' },
    isRecommended: true,
    educationalNotes: 'Tìm hiểu quản lý đội xe du lịch đường dài.',
  },
  // Tàu thuyền
  {
    name: 'Du thuyền Paradise Cruises',
    serviceType: 'transportation',
    subType: 'boat',
    location: { type: 'Point', coordinates: [107.0828, 20.9420] },
    address: 'Cảng du thuyền Tuần Châu, Hạ Long',
    serviceArea: 'Tuyến',
    priceRange: 'Cao cấp',
    rating: 4.8,
    description: 'Du thuyền 5 sao khám phá Vịnh Hạ Long với cabin nghỉ đêm.',
    contact: { phone: '0203-384-8888', website: 'https://paradisecruises.vn' },
    isRecommended: true,
    educationalNotes: 'Mô hình kinh doanh du thuyền cao cấp, tiêu chuẩn dịch vụ.',
  },
  // Cáp treo
  {
    name: 'Cáp treo Fansipan Legend',
    serviceType: 'transportation',
    subType: 'cable_car',
    location: { type: 'Point', coordinates: [103.7750, 22.3030] },
    address: 'Thị trấn Sa Pa, Lào Cai',
    serviceArea: 'Địa phương',
    priceRange: 'Trung cấp',
    rating: 4.9,
    description: 'Cáp treo 3 dây dài nhất thế giới lên đỉnh Fansipan.',
    contact: { phone: '0214-387-1866', website: 'https://fansipanlegend.sunworld.vn' },
    isRecommended: true,
    educationalNotes: 'Tìm hiểu kỹ thuật vận hành cáp treo an toàn.',
  },

  // === THAM QUAN - GIẢI TRÍ ===
  // Khu du lịch
  {
    name: 'Khu Du lịch Tràng An',
    serviceType: 'entertainment',
    subType: 'tourist_area',
    location: { type: 'Point', coordinates: [105.9389, 20.2506] },
    address: 'Ninh Hải, Hoa Lư, Ninh Bình',
    serviceArea: 'Vùng',
    priceRange: 'Trung cấp',
    rating: 4.9,
    description: 'Di sản thiên nhiên thế giới với hang động và đền chùa cổ.',
    contact: { phone: '0229-389-0088' },
    isRecommended: true,
    educationalNotes: 'Nghiên cứu mô hình quản lý di sản thế giới.',
  },
  // Điểm vui chơi
  {
    name: 'Sun World Hạ Long Complex',
    serviceType: 'entertainment',
    subType: 'amusement',
    location: { type: 'Point', coordinates: [107.0400, 20.9200] },
    address: 'Bãi Cháy, TP Hạ Long, Quảng Ninh',
    serviceArea: 'Vùng',
    priceRange: 'Cao cấp',
    rating: 4.6,
    description: 'Công viên giải trí tổng hợp với cáp treo, vui chơi, biểu diễn nghệ thuật.',
    contact: { website: 'https://sunworld.vn' },
    isRecommended: true,
    educationalNotes: 'Mô hình kinh doanh công viên giải trí quy mô lớn.',
  },
  // Hoạt động trải nghiệm
  {
    name: 'Làng Văn hóa Dân tộc Thái Hải',
    serviceType: 'entertainment',
    subType: 'experience',
    location: { type: 'Point', coordinates: [105.8100, 21.5800] },
    address: 'Thái Nguyên',
    serviceArea: 'Tuyến',
    priceRange: 'Bình dân',
    rating: 4.4,
    description: 'Trải nghiệm văn hóa dân tộc Thái với lễ hội và ẩm thực.',
    contact: { phone: '0208-382-1234' },
    isRecommended: true,
    educationalNotes: 'Học phương pháp bảo tồn và phát huy văn hóa dân tộc.',
  },

  // === DỊCH VỤ HỖ TRỢ ===
  // Hướng dẫn viên
  {
    name: 'Trung tâm HDV Du lịch Việt Nam',
    serviceType: 'support',
    subType: 'guide',
    location: { type: 'Point', coordinates: [105.8420, 21.0278] },
    address: 'Hoàn Kiếm, Hà Nội',
    serviceArea: 'Vùng',
    priceRange: 'Trung cấp',
    rating: 4.5,
    description: 'Đội ngũ HDV chuyên nghiệp với nhiều ngôn ngữ.',
    contact: { phone: '024-3826-9999' },
    isRecommended: true,
    educationalNotes: 'Học nghiệp vụ hướng dẫn viên chuyên nghiệp.',
  },
  // Cơ sở mua sắm
  {
    name: 'Làng Nghề Lụa Vạn Phúc',
    serviceType: 'support',
    subType: 'shopping',
    location: { type: 'Point', coordinates: [105.7760, 20.9900] },
    address: 'Vạn Phúc, Hà Đông, Hà Nội',
    serviceArea: 'Địa phương',
    priceRange: 'Trung cấp',
    rating: 4.3,
    description: 'Làng nghề dệt lụa truyền thống với lịch sử hàng trăm năm.',
    contact: { phone: '024-3352-1234' },
    isRecommended: true,
    educationalNotes: 'Tìm hiểu làng nghề truyền thống và phát triển du lịch.',
  },
  // Dịch vụ bổ trợ
  {
    name: 'Công ty Bảo hiểm Du lịch Bảo Việt',
    serviceType: 'support',
    subType: 'other',
    location: { type: 'Point', coordinates: [105.8530, 21.0240] },
    address: 'Quận 1, Hà Nội',
    serviceArea: 'Vùng',
    priceRange: 'Bình dân',
    rating: 4.0,
    description: 'Bảo hiểm du lịch trong và ngoài nước.',
    contact: { phone: '1900-558-899', website: 'https://baoviet.com.vn' },
    isRecommended: false,
    educationalNotes: 'Hiểu về vai trò bảo hiểm trong kinh doanh du lịch.',
  },
];

async function seedProviders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get routes for linking
    const routes = await TourismRoute.find();
    console.log(`📍 Found ${routes.length} routes`);

    // Clear existing providers
    await ServiceProvider.deleteMany({});
    console.log('🗑️ Cleared existing providers');

    // Link some providers to routes
    const hanoiHalongRoute = routes.find(r => r.routeName.includes('Hạ Long'));
    const tayBacRoute = routes.find(r => r.routeName.includes('Tây Bắc'));

    // Add route links to some providers
    const providersWithLinks = sampleProviders.map(p => {
      const provider = { ...p };
      provider.linkedRoutes = [];

      // Link Ha Long related providers
      if (p.name.includes('Hạ Long') || p.name.includes('Paradise')) {
        if (hanoiHalongRoute) provider.linkedRoutes.push(hanoiHalongRoute._id);
      }
      // Link Sapa/Tay Bac related providers
      if (p.name.includes('Sapa') || p.name.includes('Fansipan')) {
        if (tayBacRoute) provider.linkedRoutes.push(tayBacRoute._id);
      }
      // General Hanoi providers
      if (p.address.includes('Hà Nội') || p.serviceArea === 'Vùng') {
        if (hanoiHalongRoute) provider.linkedRoutes.push(hanoiHalongRoute._id);
        if (tayBacRoute) provider.linkedRoutes.push(tayBacRoute._id);
      }

      return provider;
    });

    // Create providers
    const created = await ServiceProvider.insertMany(providersWithLinks);
    console.log(`\n✅ Đã tạo ${created.length} nhà cung cấp\n`);

    // Summary by category
    const summary = {};
    for (const p of created) {
      const key = p.serviceType;
      if (!summary[key]) summary[key] = { count: 0, subTypes: {} };
      summary[key].count++;
      summary[key].subTypes[p.subType] = (summary[key].subTypes[p.subType] || 0) + 1;
    }

    console.log('📊 Thống kê theo loại:');
    for (const [type, data] of Object.entries(summary)) {
      console.log(`\n  ${ServiceProvider.getServiceTypeLabel(type)} (${data.count}):`);
      for (const [subType, count] of Object.entries(data.subTypes)) {
        const info = ServiceProvider.SERVICE_SUB_TYPES[subType];
        console.log(`    ${info.icon} ${info.label}: ${count}`);
      }
    }

    mongoose.connection.close();
    console.log('\n✅ Hoàn thành!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

seedProviders();
