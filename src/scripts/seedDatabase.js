/**
 * Seed Database Script — Points, Routes
 * Chạy: node src/scripts/seedDatabase.js
 */

const mongoose = require('mongoose');
const { TourismPoint, TourismRoute, ServiceProvider } = require('../models');
const { tourismPoints, serviceProviders, tourismRoutes } = require('./sampleData');

const seedDatabase = async () => {
  console.log('\n📍 Seeding Points & Routes...');

  // Clear existing data
  await TourismPoint.deleteMany({});
  await TourismRoute.deleteMany({});
  await ServiceProvider.deleteMany({});
  console.log('   🗑️ Cleared existing points, routes, providers');

  // Seed Tourism Points
  const createdPoints = await TourismPoint.insertMany(tourismPoints);
  console.log(`   ✅ Created ${createdPoints.length} tourism points`);

  // Create a map of point names to IDs
  const pointsMap = new Map();
  createdPoints.forEach(point => {
    pointsMap.set(point.name, point._id);
  });

  // Seed Service Providers with linked points
  const providersWithLinks = serviceProviders.map(provider => {
    const linkedPoints = createdPoints
      .filter(point => {
        const [provLng, provLat] = provider.location.coordinates;
        const [pointLng, pointLat] = point.location.coordinates;
        const distance = Math.sqrt(
          Math.pow(provLng - pointLng, 2) + Math.pow(provLat - pointLat, 2)
        );
        return distance < 0.5;
      })
      .map(point => point._id);
    
    return { ...provider, linkedPoints };
  });
  const createdProviders = await ServiceProvider.insertMany(providersWithLinks);
  console.log(`   ✅ Created ${createdProviders.length} service providers`);

  // Seed Tourism Routes
  for (const routeData of tourismRoutes) {
    const { pointNames, ...route } = routeData;
    route.points = pointNames.map(name => pointsMap.get(name)).filter(id => id);
    
    const newRoute = new TourismRoute(route);
    await newRoute.save();
    console.log(`   ✅ Created route: ${newRoute.routeName} (${newRoute.totalDistance} km)`);
  }

  // Summary
  console.log(`   📊 Points: ${await TourismPoint.countDocuments()}, Routes: ${await TourismRoute.countDocuments()}, Providers: ${await ServiceProvider.countDocuments()}`);
};

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ Connected to MongoDB'); return seedDatabase(); })
    .then(() => { mongoose.connection.close(); console.log('🎉 Hoàn thành!'); })
    .catch(err => { console.error('❌ Error:', err); process.exit(1); });
}

module.exports = seedDatabase;

