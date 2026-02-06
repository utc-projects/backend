const express = require('express');
const router = express.Router();
const {
  getMyNotes,
  getNotesByPoint,
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
} = require('../controllers/noteController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

router.get('/my', getMyNotes);
router.get('/point/:pointId', getNotesByPoint);
router.post('/', createNote);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
