/**
 * Seed Database Script
 * Chạy: node src/scripts/seedDatabase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { TourismPoint, TourismRoute, ServiceProvider } = require('../models');
const { tourismPoints, serviceProviders, tourismRoutes } = require('./data/sampleData');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await TourismPoint.deleteMany({});
    await TourismRoute.deleteMany({});
    await ServiceProvider.deleteMany({});

    // Seed Tourism Points
    console.log('📍 Seeding Tourism Points...');
    const createdPoints = await TourismPoint.insertMany(tourismPoints);
    console.log(`   ✓ Created ${createdPoints.length} tourism points`);

    // Create a map of point names to IDs
    const pointsMap = new Map();
    createdPoints.forEach(point => {
      pointsMap.set(point.name, point._id);
    });

    // Seed Service Providers with linked points
    console.log('🏨 Seeding Service Providers...');
    const providersWithLinks = serviceProviders.map(provider => {
      // Link providers to nearby points based on location
      const linkedPoints = createdPoints
        .filter(point => {
          // Simple proximity check (same area)
          const [provLng, provLat] = provider.location.coordinates;
          const [pointLng, pointLat] = point.location.coordinates;
          const distance = Math.sqrt(
            Math.pow(provLng - pointLng, 2) + Math.pow(provLat - pointLat, 2)
          );
          return distance < 0.5; // ~50km approximate
        })
        .map(point => point._id);
      
      return { ...provider, linkedPoints };
    });
    const createdProviders = await ServiceProvider.insertMany(providersWithLinks);
    console.log(`   ✓ Created ${createdProviders.length} service providers`);

    // Seed Tourism Routes
    console.log('🗺️  Seeding Tourism Routes...');
    for (const routeData of tourismRoutes) {
      const { pointNames, ...route } = routeData;
      
      // Map point names to ObjectIds in order
      route.points = pointNames.map(name => pointsMap.get(name)).filter(id => id);
      
      const newRoute = new TourismRoute(route);
      await newRoute.save(); // This triggers the middleware to calculate distance
      
      console.log(`   ✓ Created route: ${newRoute.routeName}`);
      console.log(`     - Points: ${newRoute.points.length}`);
      console.log(`     - Total Distance: ${newRoute.totalDistance} km`);
    }

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`   - Tourism Points: ${await TourismPoint.countDocuments()}`);
    console.log(`   - Tourism Routes: ${await TourismRoute.countDocuments()}`);
    console.log(`   - Service Providers: ${await ServiceProvider.countDocuments()}`);

    console.log('\n🎉 Database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

seedDatabase();
