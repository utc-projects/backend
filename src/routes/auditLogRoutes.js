const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getAuditLogs, getAuditLogById } = require('../controllers/auditLogController');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

module.exports = router;
