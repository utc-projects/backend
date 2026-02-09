const ChangeRequest = require('../models/ChangeRequest');

exports.interceptRequest = (type) => {
  return async (req, res, next) => {
    try {
      // 1. If user is NOT student, allow normal flow
      //   (Using logic: only specific roles trigger approval. 
      //    Assume 'admin' and 'lecturer' can bypass.)
      if (req.user.role !== 'student') {
        return next();
      }

      // 2. Identify Action
      let action = 'update';
      if (req.method === 'POST') action = 'create';
      if (req.method === 'DELETE') action = 'delete';

      // 3. Prepare Payload
      // We need to capture body and potentially file paths if files were uploaded.
      // Note: Multer middleware runs BEFORE this, so files are already saved on disk.
      // We just need to store their references in 'data'.
      
      const payload = { ...req.body };
      
      // If files exist, merge them into payload so the approval system knows about them
      if (req.files) {
         // req.files can be an array or object depending on upload.fields vs upload.array
         // For 'fields': { images: [...], videos: [...] }
         // We flatten this into the payload structure expected by the model
         if (!Array.isArray(req.files)) {
             Object.keys(req.files).forEach(key => {
                 payload[key] = req.files[key].map(f => f.path);
             });
         } else {
             // specific case if using single array
             payload.files = req.files.map(f => f.path);
         }
      }
      
      // For updates/deletes, capture targetId
      const targetId = req.params.id || null;

      // 4. Create ChangeRequest
      const changeRequest = await ChangeRequest.create({
        type, // 'point', 'route', 'provider' passed from route definition
        action,
        targetId,
        data: payload,
        requester: req.user._id,
        status: 'pending'
      });

      // 5. Return "Pending Approval" response
      try {
        const User = require('../models/User');
        const Notification = require('../models/Notification');
        const io = req.app.get('io');

        // Find admins and lecturers
        const approvers = await User.find({ role: { $in: ['admin', 'lecturer'] } });
        
        const notifications = approvers.map(approver => ({
          recipient: approver._id,
          sender: req.user._id,
          type: 'CHANGE_REQUEST_CREATED',
          message: `Sinh viên ${req.user.name} đã gửi yêu cầu thay đổi ${type}.`,
          link: `/admin/requests/${changeRequest._id}`
        }));

        await Notification.insertMany(notifications);

        // Emit socket event to approvers
        approvers.forEach(approver => {
          io.to(approver._id.toString()).emit('notification', {
            message: `Sinh viên ${req.user.name} đã gửi yêu cầu thay đổi ${type}.`,
            link: `/admin/requests/${changeRequest._id}`
          });
        });

      } catch (notifyError) {
        console.error('Notification Error:', notifyError);
        // Don't fail the request if notification fails
      }

      return res.status(202).json({
        message: 'Yêu cầu của bạn đã được gửi và đang chờ phê duyệt.',
        status: 'pending_approval',
        requestId: changeRequest._id
      });

    } catch (error) {
      console.error('Approval Intercept Error:', error);
      return res.status(500).json({ message: 'Lỗi khi tạo yêu cầu phê duyệt' });
    }
  };
};
