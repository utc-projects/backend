/**
 * Migration script — Recalculate route geometry via OSRM
 * Run with: node src/scripts/migrate_routes.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const TourismRoute = require('../models/TourismRoute');
const TourismPoint = require('../models/TourismPoint');

const migrateRoutes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Database');

    const routes = await TourismRoute.find({});
    console.log(`Found ${routes.length} routes to migrate`);

    for (const route of routes) {
      console.log(`Processing route: ${route.routeName} (${route._id})`);
      
      route.markModified('points');
      
      try {
        await route.save();
        console.log(`  -> Updated successfully: ${route.isRoadRoute ? 'Road Geometry' : 'Straight Line'}`);
      } catch (err) {
        console.error(`  -> Failed to update: ${err.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

migrateRoutes();
