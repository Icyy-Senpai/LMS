export default function CourseList({ courses, onSelectCourse }) {
  return (
    <div>
      <h3>My Assigned Courses</h3>
      {courses.length === 0 ? (
        <p>No courses assigned.</p>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {courses.map(course => (
            <div key={course.code} style={{ border: '1px solid black', padding: '15px', width: '250px' }}>
              <h4>{course.code}</h4>
              <p>{course.name}</p>
              <p>Program: {course.targetProgram}</p>
              <button onClick={() => onSelectCourse(course)}>Manage Course</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}