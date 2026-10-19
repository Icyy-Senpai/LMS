const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Admin = require('./models/Admin');
const Course = require('./models/Course');
const CourseContent = require('./models/CourseContent');
const Department = require('./models/Department');
const Block = require('./models/Block');
const { setCourseInstructor } = require('./controllers/adminController');
const { assignStudentToBlock } = require('./utils/blocks');
const { dropStaleIndexes } = require('./utils/staleIndexes');

mongoose.connect('mongodb://127.0.0.1:27017/lms_project')
  .then(() => console.log('Connected to MongoDB for Seeding...'))
  .catch(err => console.error('MongoDB connection error:', err));

const IT = 'BS Information Technology';
const CS = 'BS Computer Science';
const BA = 'BS Business Administration';

const DEPARTMENTS = [
  { name: IT, code: 'BSIT', description: 'Bachelor of Science in Information Technology' },
  { name: CS, code: 'BSCS', description: 'Bachelor of Science in Computer Science' },
  { name: BA, code: 'BSBA', description: 'Bachelor of Science in Business Administration' }
];

const profile = (o) => ({
  middleName: o.middleName || 'N/A', middleInitial: (o.middleName || 'N')[0].toUpperCase(), suffix: '',
  bithDate: o.bithDate || '1990-01-01', countryOfBirth: 'Philippines', birthPlace: o.city || 'Bacoor',
  civilStatus: o.civilStatus || 'Single', gender: o.gender, religion: 'Catholic',
  mobileNum: o.mobileNum, teleNum: 0, personalEmail: o.personalEmail || o.schoolEmail,
  presentAddress: `${o.city || 'Bacoor'}, Cavite`, presentProvince: 'Cavite', presentcmun: o.city || 'Bacoor', presentHouseNum: '1', presentBrgy: 1, presentPostal: 4102,
  permanentAddress: `${o.city || 'Bacoor'}, Cavite`, permanentProvince: 'Cavite', permanentCmun: o.city || 'Bacoor', permanentHouseNum: '1', permanentBrgy: '1', permanentPostal: '4102',
  ...o
});

const TEACHERS = [
  profile({ schoolId: 'FACULTY-001', lastName: 'Cruz', firstName: 'Juan', middleName: 'Santos', gender: 'Male', civilStatus: 'Married', bithDate: '1985-01-01', city: 'Manila',
    mobileNum: 9987654321, schoolEmail: 'teacher@school.edu.ph', department: IT, password: 'teacherPassword123', isDean: false }),
  profile({ schoolId: 'FACULTY-002', lastName: 'Reyes', firstName: 'Maria', middleName: 'Lopez', gender: 'Female', civilStatus: 'Married', bithDate: '1980-05-05', city: 'Manila',
    mobileNum: 9111111111, schoolEmail: 'dean@school.edu.ph', department: IT, password: 'deanPassword123', isDean: true }),
  profile({ schoolId: 'FACULTY-101', lastName: 'Mercado', firstName: 'Paolo', middleName: 'Garcia', gender: 'Male', bithDate: '1988-03-14', city: 'Imus',
    mobileNum: 9170000101, schoolEmail: 'paolo.mercado@school.edu.ph', department: IT, password: 'teacherPassword123', isDean: false }),
  profile({ schoolId: 'FACULTY-102', lastName: 'Lim', firstName: 'Andrea', middleName: 'Tan', gender: 'Female', bithDate: '1990-11-02', city: 'Bacoor',
    mobileNum: 9170000102, schoolEmail: 'andrea.lim@school.edu.ph', department: CS, password: 'teacherPassword123', isDean: false }),
  profile({ schoolId: 'FACULTY-103', lastName: 'Bautista', firstName: 'Carlo', middleName: 'Dela Cruz', gender: 'Male', civilStatus: 'Married', bithDate: '1984-07-21', city: 'Dasmariñas',
    mobileNum: 9170000103, schoolEmail: 'carlo.bautista@school.edu.ph', department: BA, password: 'teacherPassword123', isDean: false }),
  profile({ schoolId: 'FACULTY-201', lastName: 'Garcia', firstName: 'Antonio', middleName: 'Reyes', gender: 'Male', civilStatus: 'Married', bithDate: '1975-02-10', city: 'Imus',
    mobileNum: 9170000201, schoolEmail: 'antonio.garcia@school.edu.ph', department: IT, password: 'deanPassword123', isDean: true }),
  profile({ schoolId: 'FACULTY-202', lastName: 'Villanueva', firstName: 'Ramon', middleName: 'Aquino', gender: 'Male', civilStatus: 'Married', bithDate: '1972-09-30', city: 'Bacoor',
    mobileNum: 9170000202, schoolEmail: 'ramon.villanueva@school.edu.ph', department: CS, password: 'deanPassword123', isDean: true }),
  profile({ schoolId: 'FACULTY-203', lastName: 'Mendoza', firstName: 'Liza', middleName: 'Ramos', gender: 'Female', civilStatus: 'Married', bithDate: '1978-12-08', city: 'Kawit',
    mobileNum: 9170000203, schoolEmail: 'liza.mendoza@school.edu.ph', department: BA, password: 'deanPassword123', isDean: true })
];

const STUDENTS = [
  profile({ schoolId: '2024-1058603', lastName: 'Erin', firstName: 'Shamir Jacob', middleName: 'P.', gender: 'Male', bithDate: '2005-08-03', city: 'Pasay City',
    mobileNum: 9123456789, schoolEmail: 'erinsp@students.nu-moa.edu.ph', personalEmail: 'erinsp@students.nu-moa.edu.ph',
    department: IT, yearLevel: 2, block: 'IT201', password: 'password123', points: 50,
    bio: 'Information Technology student specializing in Mobile and Web Applications.' }),
  profile({ schoolId: '2024-2000001', lastName: 'Torres', firstName: 'Bianca', middleName: 'Flores', gender: 'Female', bithDate: '2005-04-17', city: 'Bacoor',
    mobileNum: 9180000001, schoolEmail: 'bianca.torres@students.sdca.edu.ph', department: IT, yearLevel: 2, block: 'IT201', password: 'password123', points: 30,
    bio: 'BSIT student who loves building web apps.' }),
  profile({ schoolId: '2024-2000002', lastName: 'Ramos', firstName: 'Miguel', middleName: 'Santos', gender: 'Male', bithDate: '2006-01-25', city: 'Imus',
    mobileNum: 9180000002, schoolEmail: 'miguel.ramos@students.sdca.edu.ph', department: CS, yearLevel: 1, block: 'CS101', password: 'password123', points: 15,
    bio: 'First-year Computer Science student, into algorithms and competitive programming.' }),
  profile({ schoolId: '2024-2000003', lastName: 'Navarro', firstName: 'Sofia', middleName: 'Cruz', gender: 'Female', bithDate: '2004-10-11', city: 'Kawit',
    mobileNum: 9180000003, schoolEmail: 'sofia.navarro@students.sdca.edu.ph', department: BA, yearLevel: 3, block: 'BA301', password: 'password123', points: 40,
    bio: 'Business Administration student majoring in Marketing.' })
];

const COURSES = [
  { code: 'ITWEBDEV', name: 'Web Systems & Technologies', targetProgram: IT, targetYear: '2nd Year', color: '#c62828', instructor: 'FACULTY-101' },
  { code: 'CSDSALGO', name: 'Data Structures & Algorithms', targetProgram: CS, targetYear: '1st Year', color: '#424242', instructor: 'FACULTY-102' },
  { code: 'BAMKTG', name: 'Principles of Marketing', targetProgram: BA, targetYear: '3rd Year', color: '#8e0000', instructor: 'FACULTY-103' }
];

const BLOCKS = [
  { code: 'IT201', name: 'BSIT 2nd Year - Block 1', max: 40, subjects: [['ITWEBDEV', 'FACULTY-101']] },
  { code: 'CS101', name: 'BSCS 1st Year - Block 1', max: 40, subjects: [['CSDSALGO', 'FACULTY-102']] },
  { code: 'BA301', name: 'BSBA 3rd Year - Block 1', max: 40, subjects: [['BAMKTG', 'FACULTY-103']] }
];

const seedDatabase = async () => {
  try {
    await mongoose.connection.asPromise();
    await dropStaleIndexes();

    await Admin.deleteMany({ username: 'admin' });
    await new Admin({
      username: 'admin', password: 'adminpassword', role: 'Admin', accountType: 'Admin',
      firstName: 'System', lastName: 'Administrator', email: 'admin@school.edu.ph', status: 'Active'
    }).save();
    console.log('✅ Admin');

    for (const d of DEPARTMENTS) {
      await Department.updateOne({ name: d.name }, { $setOnInsert: d }, { upsert: true });
    }
    console.log(`✅ ${DEPARTMENTS.length} departments`);

    const teacherEmails = TEACHERS.map(t => t.schoolEmail);
    const teacherIds = TEACHERS.map(t => t.schoolId);
    const oldTeachers = await Teacher.find({ $or: [{ schoolEmail: { $in: teacherEmails } }, { schoolId: { $in: teacherIds } }] }, '_id schoolId').lean();
    await Teacher.deleteMany({ _id: { $in: oldTeachers.map(t => t._id) } });
    for (const t of TEACHERS) {
      const created = await new Teacher({ ...t, accountType: 'Teacher', status: 'Active' }).save();
      for (const old of oldTeachers.filter(o => o.schoolId === t.schoolId)) {
        await Block.updateMany({ 'courseProfessors.teacherId': old._id },
          { $set: { 'courseProfessors.$[p].teacherId': created._id } }, { arrayFilters: [{ 'p.teacherId': old._id }] });
      }
    }
    const liveIds = (await Teacher.find({}, '_id').lean()).map(t => t._id);
    await Block.updateMany({}, { $pull: { courseProfessors: { teacherId: { $nin: liveIds } } } });
    console.log(`✅ ${TEACHERS.filter(t => !t.isDean).length} teachers, ${TEACHERS.filter(t => t.isDean).length} deans`);

    for (const { instructor, ...c } of COURSES) {
      await Course.updateOne({ code: c.code }, { $set: c }, { upsert: true });
      await CourseContent.updateOne({ courseCode: c.code, block: '' }, { $setOnInsert: { courseCode: c.code, block: '' } }, { upsert: true });
      await setCourseInstructor(c.code, instructor);
    }
    console.log(`✅ ${COURSES.length} courses`);

    for (const b of BLOCKS) {
      await Block.updateOne({ code: b.code },
        { $setOnInsert: { code: b.code, name: b.name, maxAmountOfStudents: b.max, studentsRegistered: [], amountOfStudents: 0, assignedSubjects: [], courseProfessors: [] } },
        { upsert: true });
      const block = await Block.findOne({ code: b.code });
      for (const [courseCode, teacherSchoolId] of b.subjects) {
        const course = await Course.findOne({ code: courseCode });
        const teacher = await Teacher.findOne({ schoolId: teacherSchoolId });
        if (!block.assignedSubjects.some(s => String(s.subjectId) === String(course._id))) {
          block.assignedSubjects.push({ subjectId: course._id, code: course.code });
        }
        block.courseProfessors = block.courseProfessors.filter(p => String(p.subjectId) !== String(course._id));
        block.courseProfessors.push({ subjectId: course._id, teacherId: teacher._id });
      }
      await block.save();
    }
    console.log(`✅ ${BLOCKS.length} blocks`);

    await Student.deleteMany({ $or: [{ schoolEmail: { $in: STUDENTS.map(s => s.schoolEmail) } }, { schoolId: { $in: STUDENTS.map(s => s.schoolId) } }] });
    for (const { block, ...s } of STUDENTS) {
      await new Student({ ...s, block: '', accountType: 'Student', status: 'Active' }).save();
      await assignStudentToBlock({ studentSchoolId: s.schoolId, blockCode: block, autoEnroll: true });
    }
    console.log(`✅ ${STUDENTS.length} students`);

    console.log('\nDatabase seeding completed successfully! Logins:');
    console.table([
      { role: 'Admin', login: 'admin', password: 'adminpassword' },
      ...TEACHERS.map(t => ({ role: t.isDean ? `Dean (${t.department})` : `Teacher (${t.department})`, login: t.schoolEmail, password: t.password })),
      ...STUDENTS.map(s => ({ role: `Student (${s.block})`, login: s.schoolEmail, password: s.password }))
    ]);
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    mongoose.connection.close();
    console.log('Disconnected from MongoDB.');
  }
};

seedDatabase();
