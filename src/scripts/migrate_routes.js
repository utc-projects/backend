const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' }); // Adjust path to reach backend root .env if running from this folder, or rely on CWD
const connectDB = require('../config/db');
const TourismRoute = require('../models/TourismRoute');
const TourismPoint = require('../models/TourismPoint'); // Ensure model is registered

const migrateRoutes = async () => {
  try {
    await connectDB();
    console.log('Connected to Database');

    const routes = await TourismRoute.find({});
    console.log(`Found ${routes.length} routes to migrate`);

    for (const route of routes) {
      console.log(`Processing route: ${route.routeName} (${route._id})`);
      
      // Force trigger the pre-save hook by marking points as modified
      // The hook checks: if (this.isModified('points') && this.points.length > 1)
      route.markModified('points');
      
      try {
        await route.save();
        console.log(`  -> Updated successfully: ${route.isRoadRoute ? 'Road Geometry' : 'Straight Line'}`);
      } catch (err) {
        console.error(`  -> Failed to update: ${err.message}`);
      }
      
      // Add a small delay to avoid hitting OSRM rate limits too hard
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateRoutes();
