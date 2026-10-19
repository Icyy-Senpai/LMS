const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Admin = require('./models/Admin');

// Connect to your MongoDB database
mongoose.connect('mongodb://127.0.0.1:27017/lms_project')
  .then(() => console.log('Connected to MongoDB for Seeding...'))
  .catch(err => console.error('MongoDB connection error:', err));

const seedDatabase = async () => {
  try {
    // 1. Clean up existing test accounts to prevent duplicate key errors
    await Student.deleteMany({ schoolEmail: 'erinsp@students.nu-moa.edu.ph' });
    await Teacher.deleteMany({ schoolEmail: { $in: ['teacher@school.edu.ph', 'dean@school.edu.ph'] } });
    await Admin.deleteMany({ username: 'admin' });

    // 2. Create Fresh Admin Account
    const admin = new Admin({
      username: 'admin',
      password: 'adminpassword',
      role: 'Admin',
      accountType: 'Admin',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@school.edu.ph',
      status: 'Active'
    });
    await admin.save();
    console.log('✅ Admin Account Seeded: admin / adminpassword');

    // 3. Create Fresh Student Account (Shamir Jacob P. Erin / BSIT-MWA)
    const student = new Student({
      lastName: 'Erin',
      firstName: 'Shamir Jacob',
      middleName: 'P.',
      middleInitial: 'P',
      suffix: '',
      bithDate: '2005-08-03',
      countryOfBirth: 'Philippines',
      birthPlace: 'Pasay City',
      civilStatus: 'Single',
      gender: 'Male',
      religion: 'Catholic',
      mobileNum: 9123456789,
      teleNum: 1234567,
      personalEmail: 'erinsp@students.nu-moa.edu.ph',
      presentAddress: 'Pasay City, Metro Manila',
      presentProvince: 'Metro Manila',
      presentcmun: 'Pasay City',
      presentHouseNum: '123',
      presentBrgy: 1,
      presentPostal: 1300,
      permanentAddress: 'Pasay City, Metro Manila',
      permanentProvince: 'Metro Manila',
      permanentCmun: 'Pasay City',
      permanentHouseNum: '123',
      permanentBrgy: '1',
      permanentPostal: '1300',
      schoolId: '2024-1058603',
      yearLevel: 2,
      schoolEmail: 'erinsp@students.nu-moa.edu.ph',
      department: 'BS Information Technology',
      block: 'IT201',
      password: 'password123',
      accountType: 'Student',
      points: 50,
      bio: 'Information Technology student specializing in Mobile and Web Applications at NU - MOA.'
    });
    await student.save();
    console.log('✅ Student Account Seeded: erinsp@students.nu-moa.edu.ph / password123');

    // 4. Create Fresh Teacher Account
    const teacher = new Teacher({
      lastName: 'Cruz',
      firstName: 'Juan',
      middleName: 'Santos',
      middleInitial: 'S',
      suffix: '',
      bithDate: '1985-01-01',
      countryOfBirth: 'Philippines',
      birthPlace: 'Manila',
      civilStatus: 'Married',
      gender: 'Male',
      religion: 'Catholic',
      mobileNum: 9987654321,
      teleNum: 7654321,
      personalEmail: 'teacher@school.edu.ph',
      presentAddress: 'Manila',
      presentProvince: 'Metro Manila',
      presentcmun: 'Manila',
      presentHouseNum: '456',
      presentBrgy: 2,
      presentPostal: 1000,
      permanentAddress: 'Manila',
      permanentProvince: 'Metro Manila',
      permanentCmun: 'Manila',
      permanentHouseNum: '456',
      permanentBrgy: '2',
      permanentPostal: '1000',
      schoolId: 'FACULTY-001',
      schoolEmail: 'teacher@school.edu.ph',
      department: 'Information Technology',
      password: 'teacherPassword123',
      accountType: 'Teacher',
      isDean: false
    });
    await teacher.save();
    console.log('✅ Teacher Account Seeded: teacher@school.edu.ph / teacherPassword123');

    // 5. Create Fresh Dean Account (a Teacher account with isDean: true -> logs in to the Dean's dashboard)
    const dean = new Teacher({
      lastName: 'Reyes', firstName: 'Maria', middleName: 'Lopez', middleInitial: 'L', suffix: '',
      bithDate: '1980-05-05', countryOfBirth: 'Philippines', birthPlace: 'Manila', civilStatus: 'Married',
      gender: 'Female', religion: 'Catholic', mobileNum: 9111111111, teleNum: 1111111,
      personalEmail: 'dean@school.edu.ph',
      presentAddress: 'Manila', presentProvince: 'Metro Manila', presentcmun: 'Manila', presentHouseNum: '789', presentBrgy: 3, presentPostal: 1000,
      permanentAddress: 'Manila', permanentProvince: 'Metro Manila', permanentCmun: 'Manila', permanentHouseNum: '789', permanentBrgy: '3', permanentPostal: '1000',
      schoolId: 'FACULTY-002',
      schoolEmail: 'dean@school.edu.ph',
      department: 'Information Technology',
      password: 'deanPassword123',
      accountType: 'Teacher',
      isDean: true
    });
    await dean.save();
    console.log('✅ Dean Account Seeded: dean@school.edu.ph / deanPassword123');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    mongoose.connection.close();
    console.log('Disconnected from MongoDB.');
  }
};

seedDatabase();