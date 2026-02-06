const pointRoutes = require('./pointRoutes');
const routeRoutes = require('./routeRoutes');
const providerRoutes = require('./providerRoutes');
const authRoutes = require('./authRoutes');
const noteRoutes = require('./noteRoutes');
const permissionRoutes = require('./permissionRoutes');

module.exports = {
  pointRoutes,
  routeRoutes,
  providerRoutes,
  authRoutes,
  noteRoutes,
  permissionRoutes,
  changeRequestRoutes: require('./changeRequestRoutes'),

  estimateRoutes: require('./estimateRoutes'),
};
