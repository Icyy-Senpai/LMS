import React, { useState } from 'react';

export default function Forum({ enrolledCourses }) {
  const [selectedCourseForum, setSelectedCourseForum] = useState('');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3>Discussion Forums</h3>
        <button disabled={!selectedCourseForum}>New Thread</button>
      </div>

      <div style={{ border: '1px solid gray', padding: '15px', marginBottom: '20px' }}>
        <label>
          <strong>Select Course Forum: </strong>
          <select value={selectedCourseForum} onChange={(e) => setSelectedCourseForum(e.target.value)}>
            <option value="">-- Choose an enrolled course --</option>
            {enrolledCourses.map(c => (
              <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ border: '1px solid gray', padding: '40px', textAlign: 'center' }}>
        <h4>No discussions found</h4>
        <p>
          {selectedCourseForum 
            ? `Be the first to start a conversation in ${selectedCourseForum}, ask a question, or share resources.` 
            : "Please select a course forum above to view discussions."}
        </p>
      </div>
    </div>
  );
}