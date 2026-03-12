const Note = require('../models/Note');
const { auditSuccess, auditDenied, auditFailed } = require('../services/auditLogService');

// @desc    Get my notes
// @route   GET /api/notes/my
// @access  Private
exports.getMyNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id })
      .populate('linkedPoint', 'name category location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get notes for a point
// @route   GET /api/notes/point/:pointId
// @access  Private
exports.getNotesByPoint = async (req, res) => {
  try {
    // Get user's own notes for this point
    const myNotes = await Note.find({ 
      linkedPoint: req.params.pointId,
      user: req.user._id,
    }).sort({ createdAt: -1 });

    // Get public notes from others
    const publicNotes = await Note.find({
      linkedPoint: req.params.pointId,
      isPublic: true,
      user: { $ne: req.user._id },
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      myNotes,
      publicNotes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Create note
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res) => {
  try {
    const noteData = {
      ...req.body,
      user: req.user._id,
    };

    const note = await Note.create(noteData);
    await note.populate('linkedPoint', 'name category');

    await auditSuccess(req, {
      event: 'note.created',
      module: 'note',
      action: 'create',
      target: { type: 'note', id: note._id, label: note.title || note.linkedPoint?.name || 'note' },
      summary: `${req.user.email} đã tạo ghi chú`,
      changes: {
        linkedPoint: note.linkedPoint?._id || note.linkedPoint,
        isPublic: note.isPublic,
      },
    });

    res.status(201).json({
      success: true,
      note,
    });
  } catch (error) {
    await auditFailed(req, {
      event: 'note.created',
      module: 'note',
      action: 'create',
      target: { type: 'note', label: req.body?.title || 'note' },
      summary: 'Tạo ghi chú thất bại',
      error,
    });
    res.status(400).json({ message: 'Tạo ghi chú thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private
exports.updateNote = async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
    }

    // Only owner can update
    if (note.user.toString() !== req.user._id.toString()) {
      await auditDenied(req, {
        event: 'note.updated',
        module: 'note',
        action: 'update',
        target: { type: 'note', id: note._id, label: note.title || 'note' },
        summary: `Từ chối cập nhật ghi chú ${note._id}`,
        reason: 'NOT_OWNER',
      });
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa ghi chú này' });
    }

    note = await Note.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('linkedPoint', 'name category');

    await auditSuccess(req, {
      event: 'note.updated',
      module: 'note',
      action: 'update',
      target: { type: 'note', id: note._id, label: note.title || note.linkedPoint?.name || 'note' },
      summary: `${req.user.email} đã cập nhật ghi chú`,
      changes: {
        linkedPoint: note.linkedPoint?._id || note.linkedPoint,
        isPublic: note.isPublic,
      },
    });

    res.json({
      success: true,
      note,
    });
  } catch (error) {
    await auditFailed(req, {
      event: 'note.updated',
      module: 'note',
      action: 'update',
      target: { type: 'note', id: req.params.id, label: req.params.id },
      summary: 'Cập nhật ghi chú thất bại',
      error,
    });
    res.status(400).json({ message: 'Cập nhật thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
    }

    // Only owner can delete
    if (note.user.toString() !== req.user._id.toString()) {
      await auditDenied(req, {
        event: 'note.deleted',
        module: 'note',
        action: 'delete',
        target: { type: 'note', id: note._id, label: note.title || 'note' },
        summary: `Từ chối xóa ghi chú ${note._id}`,
        reason: 'NOT_OWNER',
      });
      return res.status(403).json({ message: 'Bạn không có quyền xóa ghi chú này' });
    }

    await note.deleteOne();

    await auditSuccess(req, {
      event: 'note.deleted',
      module: 'note',
      action: 'delete',
      target: { type: 'note', id: note._id, label: note.title || 'note' },
      summary: `${req.user.email} đã xóa ghi chú`,
    });

    res.json({
      success: true,
      message: 'Đã xóa ghi chú thành công',
    });
  } catch (error) {
    await auditFailed(req, {
      event: 'note.deleted',
      module: 'note',
      action: 'delete',
      target: { type: 'note', id: req.params.id, label: req.params.id },
      summary: 'Xóa ghi chú thất bại',
      error,
    });
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get note by id
// @route   GET /api/notes/:id
// @access  Private
exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('linkedPoint')
      .populate('user', 'name');

    if (!note) {
      return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
    }

    // Only owner or public can view
    if (note.user._id.toString() !== req.user._id.toString() && !note.isPublic) {
      return res.status(403).json({ message: 'Bạn không có quyền xem ghi chú này' });
    }

    res.json({
      success: true,
      note,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};
