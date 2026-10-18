const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Admin = require('./models/Admin'); // Added Admin model

mongoose.connect('mongodb://127.0.0.1:27017/lms_project')
  .then(() => console.log('Connected to MongoDB for Seeding...'))
  .catch(err => console.error('MongoDB connection error:', err));

const generateFreshAccounts = async () => {
  try {
    await Student.deleteOne({ schoolEmail: 'student@school.edu.ph' });
    await Teacher.deleteOne({ schoolEmail: 'teacher@school.edu.ph' });
    await Admin.deleteOne({ username: 'admin' });

    // 1. Create Fresh Admin Account
    const newAdmin = new Admin({
      username: 'admin',
      email: 'admin@school.edu.ph',
      password: 'adminpassword', // Use this to log in
      role: 'Admin',
      accountType: 'Admin',
      firstName: 'System',
      lastName: 'Administrator'
    });

    // 2. Create Fresh Student Account
    const newStudent = new Student({
      firstName: "Alice", lastName: "Smith", middleName: "Marie", middleInitial: "M", suffix: "",
      bithDate: "2005-08-03", countryOfBirth: "Philippines", birthPlace: "Manila", civilStatus: "Single",
      gender: "Female", religion: "Catholic", mobileNum: 9123456789, teleNum: 21234567,
      personalEmail: "alice.personal@gmail.com", presentAddress: "123 Test Street", presentProvince: "Metro Manila",
      presentcmun: "Quezon City", presentHouseNum: "123", presentBrgy: 1, presentPostal: 1100,
      permanentAddress: "123 Test Street", permanentProvince: "Metro Manila", permanentCmun: "Quezon City",
      permanentHouseNum: "123", permanentBrgy: "1", permanentPostal: "1100",
      schoolId: "STUDENT-001", yearLevel: 1, schoolEmail: "student@school.edu.ph",
      department: "BS Information Technology", block: "IT101", password: "password123", 
      accountType: "Student", points: 0, bio: "Fresh student account."
    });

    // 3. Create Fresh Teacher Account
    const newTeacher = new Teacher({
      firstName: "John", lastName: "Doe", middleName: "Alan", middleInitial: "A", suffix: "",
      bithDate: "1980-05-15", countryOfBirth: "Philippines", birthPlace: "Makati", civilStatus: "Married",
      gender: "Male", religion: "Catholic", mobileNum: 9987654321, teleNum: 29876543,
      personalEmail: "john.doe@gmail.com", presentAddress: "456 Faculty Ave", presentProvince: "Metro Manila",
      presentcmun: "Manila", presentHouseNum: "456", presentBrgy: 2, presentPostal: 1000,
      permanentAddress: "456 Faculty Ave", permanentProvince: "Metro Manila", permanentCmun: "Manila",
      permanentHouseNum: "456", permanentBrgy: "2", permanentPostal: "1000",
      schoolId: "FACULTY-001", schoolEmail: "teacher@school.edu.ph", department: "Information Technology",
      password: "teacherPassword123", accountType: "Teacher", points: 0
    });

    await newAdmin.save();
    console.log(`✅ Admin Account Created: admin / adminpassword`);
    
    await newStudent.save();
    console.log(`✅ Student Account Created: student@school.edu.ph / password123`);

    await newTeacher.save();
    console.log(`✅ Teacher Account Created: teacher@school.edu.ph / teacherPassword123`);

  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("Disconnected from MongoDB.");
  }
};

generateFreshAccounts();