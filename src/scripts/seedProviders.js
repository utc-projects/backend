/**
 * Seed providers only from the canonical demo source in sampleData.js.
 */

const mongoose = require('mongoose');
const ServiceProvider = require('../models/ServiceProvider');
const TourismPoint = require('../models/TourismPoint');
const TourismRoute = require('../models/TourismRoute');
const { serviceProviders, tourismRoutes } = require('./sampleData');

async function seedProviders() {
  console.log('\n🏨 Seeding Providers...');

  const points = await TourismPoint.find().select('_id name location');
  const routes = await TourismRoute.find().select('_id routeName points');

  const routePointMap = new Map(
    tourismRoutes.map((route) => [route.routeName, route.pointNames])
  );
  const pointNameToId = new Map(points.map((point) => [point.name, point._id]));
  const routeNameToId = new Map(routes.map((route) => [route.routeName, route._id]));

  await ServiceProvider.deleteMany({});

  const providersWithLinks = serviceProviders.map((provider) => {
    const linkedPoints = points
      .filter((point) => {
        const [provLng, provLat] = provider.location.coordinates;
        const [pointLng, pointLat] = point.location.coordinates;
        const distance = Math.sqrt(
          Math.pow(provLng - pointLng, 2) + Math.pow(provLat - pointLat, 2)
        );
        return distance < 0.5;
      })
      .map((point) => point._id);

    const linkedRoutes = [];
    for (const [routeName, pointNames] of routePointMap.entries()) {
      const routePointIds = pointNames
        .map((name) => pointNameToId.get(name))
        .filter(Boolean)
        .map((id) => id.toString());

      const touchesRoute = linkedPoints.some((pointId) => routePointIds.includes(pointId.toString()));
      if (touchesRoute) {
        const routeId = routeNameToId.get(routeName);
        if (routeId) linkedRoutes.push(routeId);
      }
    }

    return {
      ...provider,
      linkedPoints,
      linkedRoutes,
    };
  });

  const created = await ServiceProvider.insertMany(providersWithLinks);
  console.log(`   ✅ Đã tạo ${created.length} nhà cung cấp`);
}

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ Connected to MongoDB'); return seedProviders(); })
    .then(() => { mongoose.connection.close(); console.log('✅ Hoàn thành!'); })
    .catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); });
}

module.exports = seedProviders;
