const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { 
  getAllRequests, 
  getMyRequests, 
  getRequestById,
  approveRequest, 
  rejectRequest 
} = require('../controllers/changeRequestController');

// Helper to check for admin or lecturer
const authorizeApprover = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'lecturer') {
        return next();
    }
    return res.status(403).json({ message: 'Bạn không có quyền duyệt yêu cầu' });
};

router.use(protect);

router.get('/', authorizeApprover, getAllRequests); // List all (Admin/Lecturer)
router.get('/my-requests', getMyRequests); // List mine (Student)
router.get('/:id', getRequestById); // Get one details
router.put('/:id/approve', authorizeApprover, approveRequest);
router.put('/:id/reject', authorizeApprover, rejectRequest);

module.exports = router;
