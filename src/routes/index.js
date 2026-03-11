const pointRoutes = require('./pointRoutes');
const routeRoutes = require('./routeRoutes');
const providerRoutes = require('./providerRoutes');
const authRoutes = require('./authRoutes');
const noteRoutes = require('./noteRoutes');
const permissionRoutes = require('./permissionRoutes');
const classRoutes = require('./classRoutes');

module.exports = {
  pointRoutes,
  routeRoutes,
  providerRoutes,
  authRoutes,
  noteRoutes,
  permissionRoutes,
  classRoutes,
  changeRequestRoutes: require('./changeRequestRoutes'),

  estimateRoutes: require('./estimateRoutes'),
  estimateFormulaRoutes: require('./estimateFormulaRoutes'),
  notificationRoutes: require('./notificationRoutes'),
};
