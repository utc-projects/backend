const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/Course');
const Class = require('../models/Class');
const User = require('../models/User');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') }); // Load .env from backend root

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();

        // 1. Create Courses (Học phần)
        console.log('Creating Courses...');
        await Course.deleteMany({ code: { $in: ['TOUR101', 'GEO202'] } }); // Clear existing test data if any

        const courses = await Course.create([
            {
                name: 'Tổng quan Du lịch',
                code: 'TOUR101',
                credits: 3,
                description: 'Cung cấp kiến thức nền tảng về ngành du lịch.'
            },
            {
                name: 'Địa lý Du lịch Việt Nam',
                code: 'GEO202',
                credits: 2,
                description: 'Nghiên cứu về tài nguyên và các vùng du lịch Việt Nam.'
            }
        ]);

        console.log(`Created ${courses.length} courses:`, courses.map(c => c.name));

        // 2. Create Classes (Lớp học phần)
        console.log('Creating Classes...');
        await Class.deleteMany({ code: { $in: ['TOUR101-K60', 'TOUR101-K61-CLC', 'GEO202-N01', 'GEO202-N02', 'GEO202-K62'] } });

        // Find courses to link
        const course1 = courses.find(c => c.code === 'TOUR101');
        const course2 = courses.find(c => c.code === 'GEO202');

        const classes = await Class.create([
            {
                name: 'Tổng quan Du lịch - K60',
                code: 'TOUR101-K60',
                course: course1._id,
                semester: '1',
                year: '2023-2024',
                description: 'Lớp đại trà K60'
            },
            {
                name: 'Tổng quan Du lịch - K61 CLC',
                code: 'TOUR101-K61-CLC',
                course: course1._id,
                semester: '1',
                year: '2024-2025',
                description: 'Lớp Chất lượng cao K61'
            },
            {
                name: 'Địa lý Du lịch - Nhóm 1',
                code: 'GEO202-N01',
                course: course2._id,
                semester: '2',
                year: '2023-2024',
                description: 'Nhóm thực hành 1'
            },
            {
                name: 'Địa lý Du lịch - Nhóm 2',
                code: 'GEO202-N02',
                course: course2._id,
                semester: '2',
                year: '2023-2024',
                description: 'Nhóm thực hành 2'
            },
            {
                name: 'Địa lý Du lịch - K62',
                code: 'GEO202-K62',
                course: course2._id,
                semester: '1',
                year: '2025-2026',
                description: 'Lớp khóa mới'
            }
        ]);

        console.log(`Created ${classes.length} classes:`, classes.map(c => c.name));

        // 3. Create Students and Enroll
        console.log('Creating Students and Enrolling...');
        
        // Define random enrollments
        const studentData = [
            { name: 'Nguyễn Văn A', email: 'student1@test.com', classes: [classes[0]._id, classes[2]._id] },
            { name: 'Trần Thị B', email: 'student2@test.com', classes: [classes[0]._id, classes[3]._id] },
            { name: 'Lê Văn C', email: 'student3@test.com', classes: [classes[1]._id] },
            { name: 'Phạm Thị D', email: 'student4@test.com', classes: [classes[1]._id, classes[4]._id] },
            { name: 'Hoàng Văn E', email: 'student5@test.com', classes: [classes[4]._id] },
        ];

        for (const data of studentData) {
            // Check if user exists
            let user = await User.findOne({ email: data.email });
            if (!user) {
                user = await User.create({
                    name: data.name,
                    email: data.email,
                    password: 'password123', // Default password
                    role: 'student',
                    studentId: `SV${Math.floor(Math.random() * 10000)}`,
                    department: 'Khoa Du lịch',
                    classes: data.classes
                });
                console.log(`Created student: ${user.name}`);
            } else {
                console.log(`Student ${user.name} already exists. Updating classes...`);
                // Merge new classes with existing ones, avoiding duplicates
                const uniqueClasses = [...new Set([...(user.classes || []).map(id => id.toString()), ...data.classes.map(id => id.toString())])];
                user.classes = uniqueClasses;
                await user.save();
            }
        }

        console.log('Seed completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
};

seedData();
