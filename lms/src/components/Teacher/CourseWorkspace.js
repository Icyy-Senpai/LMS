import React, { useState, useEffect } from 'react';
import AssignmentBuilder from './AssignmentBuilder';
import GradingSection from './GradingSection';
import api from '../../api';

export default function CourseWorkspace({ course, onBack }) {
  const [courseContent, setCourseContent] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [vidTitle, setVidTitle] = useState('');
  const [vidUrl, setVidUrl] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');

  useEffect(() => {
    setLoadingContent(true);
    Promise.all([
      api.get(`/instructor/course/${course.code}`),
      api.get(`/assignments/${course.code}`)
    ]).then(([contentRes, assRes]) => {
      if (contentRes.data.success) setCourseContent(contentRes.data.content);
      if (assRes.data.success) setCourseAssignments(assRes.data.assignments);
    }).catch(() => alert('Failed to load workspace data'))
      .finally(() => setLoadingContent(false));
  }, [course.code]);

  const updateCourseData = async (updatedFields, callback) => {
    try {
      const payload = { courseCode: course.code, ...courseContent, ...updatedFields };
      const response = await api.post('/instructor/course/update', payload);
      if (response.data.success) {
        alert('Update successful!');
        setCourseContent(response.data.content);
        if (callback) callback();
      }
    } catch (err) {
      alert('Failed to update data.');
    }
  };

  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    const newAnnouncements = [...(courseContent.announcements || []), { title: annTitle, content: annContent, date: new Date() }];
    updateCourseData({ announcements: newAnnouncements }, () => { setAnnTitle(''); setAnnContent(''); });
  };

  const handleDeleteAnnouncement = (index) => {
    if (!window.confirm("Delete this announcement?")) return;
    updateCourseData({ announcements: courseContent.announcements.filter((_, i) => i !== index) });
  };

  const handleAddVideo = (e) => {
    e.preventDefault();
    const newVideos = [...(courseContent.videos || []), { title: vidTitle, url: vidUrl }];
    updateCourseData({ videos: newVideos }, () => { setVidTitle(''); setVidUrl(''); });
  };

  const handleDeleteVideo = (index) => {
    if (!window.confirm("Delete this video?")) return;
    updateCourseData({ videos: courseContent.videos.filter((_, i) => i !== index) });
  };

  const handleAddMaterial = (e) => {
    e.preventDefault();
    const newMaterials = [...(courseContent.materials || []), { title: matTitle, fileUrl: matUrl }];
    updateCourseData({ materials: newMaterials }, () => { setMatTitle(''); setMatUrl(''); });
  };

  const handleDeleteMaterial = (index) => {
    if (!window.confirm("Delete this material?")) return;
    updateCourseData({ materials: courseContent.materials.filter((_, i) => i !== index) });
  };

  if (loadingContent) return <div><button onClick={onBack}>Back</button><p>Loading course data...</p></div>;
  if (!courseContent) return <div><button onClick={onBack}>Back</button><p>Error loading content.</p></div>;

  return (
    <div>
      <button onClick={onBack}>Back to Course List</button>
      <h3>Workspace: {course.code} - {course.name}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        <div style={{ border: '1px solid gray', padding: '15px' }}>
          <h4>Announcements</h4>
          <form onSubmit={handleAddAnnouncement} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
            <input type="text" placeholder="Details" value={annContent} onChange={(e) => setAnnContent(e.target.value)} required />
            <button type="submit">Post</button>
          </form>
          <ul>
            {courseContent.announcements?.map((ann, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <strong>{ann.title}</strong> - {ann.content} <em>({new Date(ann.date).toLocaleDateString()})</em>
                <button onClick={() => handleDeleteAnnouncement(idx)} style={{ marginLeft: '10px', color: 'red' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid gray', padding: '15px' }}>
          <h4>Video Lessons</h4>
          <form onSubmit={handleAddVideo} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Video Title" value={vidTitle} onChange={(e) => setVidTitle(e.target.value)} required />
            <input type="text" placeholder="Video URL" value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} required />
            <button type="submit">Add Video</button>
          </form>
          <ul>
            {courseContent.videos?.map((vid, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <a href={vid.url} target="_blank" rel="noreferrer">{vid.title}</a>
                <button onClick={() => handleDeleteVideo(idx)} style={{ marginLeft: '10px', color: 'red' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid gray', padding: '15px' }}>
          <h4>Reading Materials</h4>
          <form onSubmit={handleAddMaterial} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Material Title" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required />
            <input type="text" placeholder="File URL" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} required />
            <button type="submit">Add Material</button>
          </form>
          <ul>
            {courseContent.materials?.map((mat, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <a href={mat.fileUrl} target="_blank" rel="noreferrer">{mat.title}</a>
                <button onClick={() => handleDeleteMaterial(idx)} style={{ marginLeft: '10px', color: 'red' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <AssignmentBuilder courseCode={course.code} assignments={courseAssignments} setAssignments={setCourseAssignments} />
        
        <GradingSection assignments={courseAssignments} setAssignments={setCourseAssignments} />
      </div>
    </div>
  );
}