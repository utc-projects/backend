const Notification = require('../models/Notification');
const { auditSuccess, auditDenied, auditFailed } = require('../services/auditLogService');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      await auditDenied(req, {
        event: 'notification.read',
        module: 'notification',
        action: 'mark_read',
        target: { type: 'notification', id: notification._id, label: notification.type },
        summary: `Từ chối đánh dấu đã đọc notification ${notification._id}`,
        reason: 'NOT_OWNER',
      });
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.isRead = true;
    await notification.save();

    await auditSuccess(req, {
      event: 'notification.read',
      module: 'notification',
      action: 'mark_read',
      target: { type: 'notification', id: notification._id, label: notification.type },
      summary: `${req.user.email} đã đánh dấu đã đọc một thông báo`,
    });

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    await auditFailed(req, {
      event: 'notification.read',
      module: 'notification',
      action: 'mark_read',
      target: { type: 'notification', id: req.params.id, label: req.params.id },
      summary: 'Đánh dấu đã đọc thông báo thất bại',
      error,
    });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    await auditSuccess(req, {
      event: 'notification.read_all',
      module: 'notification',
      action: 'mark_read_all',
      target: { type: 'notification', label: req.user.email },
      summary: `${req.user.email} đã đánh dấu tất cả thông báo là đã đọc`,
      changes: {
        affectedCount: result.modifiedCount || 0,
      },
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    await auditFailed(req, {
      event: 'notification.read_all',
      module: 'notification',
      action: 'mark_read_all',
      target: { type: 'notification', label: req.user?.email || '' },
      summary: 'Đánh dấu tất cả thông báo là đã đọc thất bại',
      error,
    });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
