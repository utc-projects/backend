const pointRoutes = require('./pointRoutes');
const routeRoutes = require('./routeRoutes');
const providerRoutes = require('./providerRoutes');
const authRoutes = require('./authRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const submissionRoutes = require('./submissionRoutes');
const noteRoutes = require('./noteRoutes');
const permissionRoutes = require('./permissionRoutes');

module.exports = {
  pointRoutes,
  routeRoutes,
  providerRoutes,
  authRoutes,
  assignmentRoutes,
  submissionRoutes,
  noteRoutes,
  permissionRoutes,
  changeRequestRoutes: require('./changeRequestRoutes'),
  courseRoutes: require('./courseRoutes'),
  classRoutes: require('./classRoutes'),

  estimateRoutes: require('./estimateRoutes'),
};
