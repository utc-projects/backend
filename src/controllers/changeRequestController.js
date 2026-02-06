const ChangeRequest = require('../models/ChangeRequest');
const TourismPoint = require('../models/TourismPoint');
const TourismRoute = require('../models/TourismRoute');
const ServiceProvider = require('../models/ServiceProvider');

// Helper to get model by type
const getModelByType = (type) => {
  switch (type) {
    case 'point': return TourismPoint;
    case 'route': return TourismRoute;
    case 'provider': return ServiceProvider;
    default: return null;
  }
};

// Get all requests (Admin/Lecturer)
exports.getAllRequests = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await ChangeRequest.find(filter)
      .populate('requester', 'name email avatar')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu' });
  }
};

// Get my requests (Student)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await ChangeRequest.find({ requester: req.user._id })
      .populate('requester', 'name email avatar')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu của bạn' });
  }
};

// Approve Request
exports.approveRequest = async (req, res) => {
  try {
    const request = await ChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý' });
    }

    const Model = getModelByType(request.type);
    if (!Model) {
      return res.status(400).json({ message: 'Loại dữ liệu không hợp lệ' });
    }

    // Apply changes based on action
    if (request.action === 'create') {
      await Model.create(request.data);
    } else if (request.action === 'update') {
      await Model.findByIdAndUpdate(request.targetId, request.data);
    } else if (request.action === 'delete') {
      await Model.findByIdAndDelete(request.targetId);
    }

    // Update request status
    request.status = 'approved';
    request.reviewer = req.user._id;
    request.reviewNote = req.body.note || '';
    await request.save();

    res.json({ message: 'Đã phê duyệt yêu cầu thành công', request });
  } catch (error) {
    console.error('Approve Error:', error);
    res.status(500).json({ message: 'Lỗi khi phê duyệt yêu cầu' });
  }
};

// Reject Request
exports.rejectRequest = async (req, res) => {
  try {
    const request = await ChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý' });
    }

    // Update request status
    request.status = 'rejected';
    request.reviewer = req.user._id;
    request.reviewNote = req.body.note || '';
    await request.save();

    res.json({ message: 'Đã từ chối yêu cầu', request });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi từ chối yêu cầu' });
  }
};

// Get single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await ChangeRequest.findById(req.params.id)
      .populate('requester', 'name email avatar')
      .populate('reviewer', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin yêu cầu' });
  }
};
