const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');

// Connect to the same database used in your server.js
mongoose.connect('mongodb://127.0.0.1:27017/lms_project')
  .then(() => console.log('Connected to MongoDB for Seeding...'))
  .catch(err => console.error('MongoDB connection error:', err));

const generateFreshAccounts = async () => {
  try {
    // 1. Clear existing generic test accounts to avoid "Unique Key" conflicts
    await Student.deleteOne({ schoolEmail: 'student@school.edu.ph' });
    await Teacher.deleteOne({ schoolEmail: 'teacher@school.edu.ph' });

    // 2. Create Fresh Student Account
    // Note: 'bithDate' is spelled exactly as it is in your schema
    const newStudent = new Student({
      firstName: "Alice",
      lastName: "Smith",
      middleName: "Marie",
      middleInitial: "M",
      suffix: "",
      bithDate: "2005-08-03", 
      countryOfBirth: "Philippines",
      birthPlace: "Manila",
      civilStatus: "Single",
      gender: "Female",
      religion: "Catholic",
      mobileNum: 9123456789,
      teleNum: 21234567,
      personalEmail: "alice.personal@gmail.com",
      presentAddress: "123 Test Street",
      presentProvince: "Metro Manila",
      presentcmun: "Quezon City",
      presentHouseNum: "123",
      presentBrgy: 1, // Number type in schema
      presentPostal: 1100, // Number type in schema
      permanentAddress: "123 Test Street",
      permanentProvince: "Metro Manila",
      permanentCmun: "Quezon City",
      permanentHouseNum: "123",
      permanentBrgy: "1", // String type in schema
      permanentPostal: "1100", // String type in schema
      schoolId: "STUDENT-001",
      yearLevel: 1,
      schoolEmail: "alice@students.std.ph",
      department: "BS Information Technology",
      block: "IT101",
      password: "123", // Unique per schema constraint
      accountType: "Student",
      points: 0,
      bio: "Fresh student account."
    });

    // 3. Create Fresh Teacher Account
    const newTeacher = new Teacher({
      firstName: "John",
      lastName: "Doe",
      middleName: "Alan",
      middleInitial: "A",
      suffix: "",
      bithDate: "1980-05-15",
      countryOfBirth: "Philippines",
      birthPlace: "Makati",
      civilStatus: "Married",
      gender: "Male",
      religion: "Catholic",
      mobileNum: 9987654321,
      teleNum: 29876543,
      personalEmail: "john.doe@gmail.com",
      presentAddress: "456 Faculty Ave",
      presentProvince: "Metro Manila",
      presentcmun: "Manila",
      presentHouseNum: "456",
      presentBrgy: 2, // Number type in schema
      presentPostal: 1000, // Number type in schema
      permanentAddress: "456 Faculty Ave",
      permanentProvince: "Metro Manila",
      permanentCmun: "Manila",
      permanentHouseNum: "456",
      permanentBrgy: "2", // String type in schema
      permanentPostal: "1000", // String type in schema
      schoolId: "FACULTY-001",
      schoolEmail: "alan@teachers.std.ph",
      department: "Information Technology",
      password: "123", // Unique per schema constraint
      accountType: "Teacher",
      points: 0
    });

    // Save both to database
    await newStudent.save();
    console.log(`✅ Student Account Created: ${newStudent.schoolEmail} / ${newStudent.password}`);

    await newTeacher.save();
    console.log(`✅ Teacher Account Created: ${newTeacher.schoolEmail} / ${newTeacher.password}`);

  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
  } finally {
    // 4. Disconnect so the terminal doesn't hang
    mongoose.connection.close();
    console.log("Disconnected from MongoDB.");
  }
};

generateFreshAccounts();