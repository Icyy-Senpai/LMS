import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import AssignmentBuilder from './AssignmentBuilder';
import GradingSection from './GradingSection';
import ClassRoster from './ClassRoster';
import BadgesSection from './BadgesSection';
import api from '../../api';

export default function CourseWorkspace({ course, block, onBack, teacher }) {
  const [courseContent, setCourseContent] = useState(null);
  const [blockStudents, setBlockStudents] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [vidTitle, setVidTitle] = useState('');
  const [vidUrl, setVidUrl] = useState('');

  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matFile, setMatFile] = useState(null);

  const fetchCourseData = async () => {
    try {
      const [contentRes, assRes] = await Promise.all([
        api.get(`/instructor/course/${encodeURIComponent(course.code)}`, { params: { block } }),
        api.get(`/assignments/${encodeURIComponent(course.code)}`, { params: { block } })
      ]);
      if (contentRes.data.success) setCourseContent(contentRes.data.content);
      if (assRes.data.success) setCourseAssignments(assRes.data.assignments);
    } catch (err) {
      message.error('Failed to sync workspace data');
    }
  };

  useEffect(() => {
    setLoadingContent(true);
    fetchCourseData().finally(() => setLoadingContent(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.code, block]);

  const updateCourseData = async (updatedFields, callback) => {
    try {
      const payload = {
        courseCode: course.code, block,
        announcements: courseContent.announcements, videos: courseContent.videos, materials: courseContent.materials,
        ...updatedFields
      };
      const response = await api.post('/instructor/course/update', payload);
      if (response.data.success) {
        message.success('Update successful!');
        setCourseContent(response.data.content);
        if (callback) callback();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update data.');
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

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!matUrl && !matFile) {
        return message.warning("Please provide either an external URL or upload a file.");
    }
    
    if (matFile && matFile.size / 1024 / 1024 > 5) {
        return message.error("File must be smaller than 5MB.");
    }

    let fileData = '';
    let fileName = '';

    if (matFile) {
        fileData = await getBase64(matFile);
        fileName = matFile.name;
    }

    const newMaterials = [...(courseContent.materials || []), { 
        title: matTitle, 
        fileUrl: matUrl,
        fileData,
        fileName 
    }];

    updateCourseData({ materials: newMaterials }, () => { 
        setMatTitle(''); 
        setMatUrl(''); 
        setMatFile(null);
        document.getElementById('matFileInput').value = '';
    });
  };

  const handleDeleteMaterial = (index) => {
    if (!window.confirm("Delete this material?")) return;
    updateCourseData({ materials: courseContent.materials.filter((_, i) => i !== index) });
  };

  if (loadingContent) return <div style={{ padding: '20px' }}><button onClick={onBack}>Back</button><p>Loading course data...</p></div>;
  if (!courseContent) return <div style={{ padding: '20px' }}><button onClick={onBack}>Back</button><p>Error loading content.</p></div>;

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '15px', padding: '5px 10px', cursor: 'pointer' }}>Back to {course.code} Blocks</button>
      <h3 style={{ marginBottom: '4px' }}>Workspace: {course.code} - {course.name} · Block {block}</h3>
      <p style={{ color: 'gray', fontSize: '12px', margin: '0 0 20px 0' }}>Everything here (announcements, videos, shared files, assignments, quizzes, submissions, roster and badges) is for block {block} only. Other blocks of {course.code} do not see it.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {teacher && <ClassRoster course={course} block={block} teacher={teacher} onRosterChange={setBlockStudents} />}

        {teacher && <BadgesSection course={course} block={block} />}
        
        <div style={{ border: '1px solid #d9d9d9', padding: '15px', borderRadius: '8px', background: '#fff' }}>
          <h4>Announcements</h4>
          <form onSubmit={handleAddAnnouncement} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required style={{ padding: '6px' }} />
            <input type="text" placeholder="Details" value={annContent} onChange={(e) => setAnnContent(e.target.value)} required style={{ padding: '6px', flex: 1 }} />
            <button type="submit" style={{ padding: '6px 12px', background: '#c62828', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Post</button>
          </form>
          <ul style={{ paddingLeft: '20px' }}>
            {courseContent.announcements?.map((ann, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <strong>{ann.title}</strong> - {ann.content} <em>({new Date(ann.date).toLocaleDateString()})</em>
                <button onClick={() => handleDeleteAnnouncement(idx)} style={{ marginLeft: '10px', color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid #d9d9d9', padding: '15px', borderRadius: '8px', background: '#fff' }}>
          <h4>Video Lessons</h4>
          <form onSubmit={handleAddVideo} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Video Title" value={vidTitle} onChange={(e) => setVidTitle(e.target.value)} required style={{ padding: '6px' }} />
            <input type="text" placeholder="Video URL" value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} required style={{ padding: '6px', flex: 1 }} />
            <button type="submit" style={{ padding: '6px 12px', background: '#c62828', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Video</button>
          </form>
          <ul style={{ paddingLeft: '20px' }}>
            {courseContent.videos?.map((vid, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <a href={vid.url} target="_blank" rel="noreferrer" style={{ color: '#c62828', fontWeight: 'bold' }}>{vid.title}</a>
                <button onClick={() => handleDeleteVideo(idx)} style={{ marginLeft: '10px', color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid #d9d9d9', padding: '15px', borderRadius: '8px', background: '#fff' }}>
          <h4>Reading Materials</h4>
          <p style={{ color: 'gray', fontSize: '12px', margin: '0 0 10px 0' }}>Provide an external link OR upload a file document (PDF, DOCX, PPTX).</p>
          
          <form onSubmit={handleAddMaterial} style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: '#fafafa', padding: '10px', borderRadius: '6px' }}>
            <input type="text" placeholder="Material Title" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required style={{ padding: '6px' }} />
            
            <div style={{ borderLeft: '2px solid #e8e8e8', paddingLeft: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="url" placeholder="External URL" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} style={{ padding: '6px' }} />
                <span style={{ fontWeight: 'bold', color: '#8c8c8c', fontSize: '12px' }}>OR</span>
                <input id="matFileInput" type="file" onChange={(e) => setMatFile(e.target.files[0])} accept=".pdf,.docx,.pptx" />
            </div>

            <button type="submit" style={{ padding: '6px 12px', background: '#c62828', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Material</button>
          </form>
          
          <ul style={{ paddingLeft: '20px' }}>
            {courseContent.materials?.map((mat, idx) => (
              <li key={idx} style={{ marginBottom: '10px' }}>
                <a 
                    href={mat.fileData || mat.fileUrl} 
                    download={mat.fileData ? mat.fileName : undefined} 
                    target={mat.fileData ? "_self" : "_blank"} 
                    rel="noreferrer" 
                    style={{ color: '#c62828', fontWeight: 'bold', textDecoration: 'none' }}
                >
                    {mat.title} {mat.fileName ? `(File: ${mat.fileName})` : '(Link)'}
                </a>
                <button onClick={() => handleDeleteMaterial(idx)} style={{ marginLeft: '15px', color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <AssignmentBuilder
          courseCode={course.code}
          block={block} 
          assignments={courseAssignments} 
          setAssignments={setCourseAssignments} 
          onDataChange={fetchCourseData} 
        />
        
        <GradingSection 
          assignments={courseAssignments} 
          setAssignments={setCourseAssignments} 
          enrolledStudents={blockStudents}
          blockScoped
          onDataChange={fetchCourseData} 
        />

      </div>
    </div>
  );
}