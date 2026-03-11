const ChangeRequest = require('../models/ChangeRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { resolveReviewerForStudent } = require('../services/classScopeService');

const getModelByType = (type) => {
  switch (type) {
    case 'point':
      return require('../models/TourismPoint');
    case 'route':
      return require('../models/TourismRoute');
    case 'provider':
      return require('../models/ServiceProvider');
    default:
      return null;
  }
};

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
      const TargetModel = getModelByType(type);
      let targetSnapshotBefore = null;
      if (targetId && TargetModel) {
        targetSnapshotBefore = await TargetModel.findById(targetId).lean();
      }

      const reviewRouting = await resolveReviewerForStudent(req.user._id);
      const reviewerId = reviewRouting.assignedReviewer || null;
      const requesterClassId = reviewRouting.classDoc?._id || null;

      // 4. Create ChangeRequest
      const changeRequest = await ChangeRequest.create({
        type, // 'point', 'route', 'provider' passed from route definition
        action,
        targetId,
        data: payload,
        requester: req.user._id,
        assignedReviewer: reviewerId,
        requesterClass: requesterClassId,
        routingMode: reviewRouting.routingMode,
        targetSnapshotBefore,
        status: 'pending'
      });

      // 5. Return "Pending Approval" response
      try {
        const io = req.app.get('io');
        const adminApprovers = await User.find({ role: 'admin', isActive: true });
        const recipients = [...adminApprovers];
        if (reviewRouting.routingMode === 'lecturer_assigned' && reviewRouting.lecturer) {
          recipients.push(reviewRouting.lecturer);
        }
        const dedupedRecipients = recipients.filter(
          (recipient, index, array) => array.findIndex((item) => String(item._id) === String(recipient._id)) === index
        );
        
        const notifications = dedupedRecipients.map(approver => ({
          recipient: approver._id,
          sender: req.user._id,
          type: 'CHANGE_REQUEST_CREATED',
          message: `Sinh viên ${req.user.name} đã gửi yêu cầu thay đổi ${type}.`,
          link: `/admin/approvals/${changeRequest._id}`
        }));

        await Notification.insertMany(notifications);

        // Emit socket event to recipients
        dedupedRecipients.forEach(approver => {
          io.to(approver._id.toString()).emit('notification', {
            message: `Sinh viên ${req.user.name} đã gửi yêu cầu thay đổi ${type}.`,
            link: `/admin/approvals/${changeRequest._id}`
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
