import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

export default function CourseView({ course, user, onBack, initialTab = 'announcements', focusTaskId, readOnly = false }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [courseContent, setCourseContent] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [submitFileData, setSubmitFileData] = useState(null);
  const [submitFileName, setSubmitFileName] = useState('');
  const [submitFileUrl, setSubmitFileUrl] = useState('');

  const [isQuizModalVisible, setIsQuizModalVisible] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  
  const activeQuizRef = useRef(null);

  const [highlightId, setHighlightId] = useState(null);
  const focusedRef = useRef(null);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const fetchCourseData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/instructor/course/${encodeURIComponent(course.code)}`, { params: { studentId: user.schoolId } }),
      api.get(`/assignments/${encodeURIComponent(course.code)}`, { params: { studentId: user.schoolId } })
    ]).then(([contentRes, assData]) => {
      if (contentRes.data.success) setCourseContent(contentRes.data.content);
      if (assData.data.success) setCourseAssignments(assData.data.assignments);
    }).catch(() => alert("Failed to load course workspace"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourseData();
  }, [course.code]);

  useEffect(() => {
    if (loading || !focusTaskId || activeTab !== 'assignments' || focusedRef.current === focusTaskId) return;
    const el = document.getElementById(`task-${focusTaskId}`);
    if (!el) return;
    focusedRef.current = focusTaskId;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(focusTaskId);
    setTimeout(() => setHighlightId(null), 3000);
  }, [loading, focusTaskId, activeTab, courseAssignments]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (activeQuizRef.current && !document.fullscreenElement) {
          alert("CHEATING DETECTED: You exited full-screen mode. Your quiz has been automatically submitted with a score of 0.");
          forceZeroSubmit(activeQuizRef.current);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const forceZeroSubmit = async (quiz) => {
    try {
      await api.post('/assignments/submit', {
        assignmentId: quiz._id,
        studentUsername: user.schoolId,
        answers: [],
        cheatingFlag: true
      });
      setIsQuizModalVisible(false);
      setActiveQuiz(null);
      activeQuizRef.current = null;
      fetchCourseData(); 
    } catch (err) { console.error("Force submit failed"); }
  };

  const startQuizFullscreen = async (quiz) => {
    try {
        await document.documentElement.requestFullscreen();
        setActiveQuiz(quiz);
        activeQuizRef.current = quiz;
        setQuizAnswers({});
        setIsQuizModalVisible(true);
    } catch (err) {
        alert("You must allow full-screen mode to take this quiz.");
    }
  };

  const openSubmitModal = (assignmentId) => {
    setActiveAssignmentId(assignmentId);
    setSubmitFileData(null);
    setSubmitFileName('');
    setSubmitFileUrl('');
    setIsSubmitModalVisible(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size / 1024 / 1024 > 10) return alert("File must be smaller than 10MB!");
    const reader = new FileReader();
    reader.onload = () => {
      setSubmitFileData(reader.result);
      setSubmitFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleStudentSubmission = async (e) => {
    e.preventDefault();
    if (!submitFileUrl && !submitFileData) return alert("Please provide a link or upload a file to submit.");
    try {
      const response = await api.post('/assignments/submit', {
        assignmentId: activeAssignmentId,
        studentUsername: user.schoolId,
        fileUrl: submitFileUrl,
        fileName: submitFileName,
        fileData: submitFileData
      });
      if (response.data.success) {
        alert("Assignment submitted successfully!");
        fetchCourseData();
        setIsSubmitModalVisible(false);
      } else {
        alert(response.data.message || "Submission failed");
      }
    } catch (err) { alert("Server connection error"); }
  };

  const handleQuizAnswerChange = (questionIndex, value) => {
    setQuizAnswers({ ...quizAnswers, [questionIndex]: value });
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(quizAnswers).length < activeQuiz.questions.length) {
      return alert("Please answer all questions before submitting.");
    }

    setIsSubmittingQuiz(true);

    const formattedAnswers = activeQuiz.questions.map((q, idx) => ({
        studentAnswer: quizAnswers[idx] || "No answer provided"
    }));

    try {
      const currentQuiz = activeQuiz;
      activeQuizRef.current = null;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      const response = await api.post('/assignments/submit', {
        assignmentId: currentQuiz._id,
        studentUsername: user.schoolId,
        answers: formattedAnswers,
        cheatingFlag: false
      });

      if (response.data.success) {
        alert(`Quiz submitted successfully! AI Graded Score: ${response.data.submission.grade}`);
        setIsQuizModalVisible(false);
        setActiveQuiz(null);
        fetchCourseData();
      } else {
        alert(response.data.message || "Submission failed");
      }
    } catch (err) { 
      alert("Server connection error"); 
    } finally {
      setIsSubmittingQuiz(false); 
    }
  };

  const getOverdueText = (deadline) => {
    const ms = new Date() - new Date(deadline);
    const mins = Math.floor((ms / 1000) / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hrs > 0) return `${hrs} hour${hrs > 1 ? 's' : ''}`;
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  };

  const getAllSharedFiles = () => {
    let allFiles = [];

    if (courseContent?.materials?.length > 0) {
        courseContent.materials.forEach(mat => {
            allFiles.push({
                source: 'Course Material',
                title: mat.fileName ? `${mat.title} (${mat.fileName})` : mat.title,
                url: mat.fileData || mat.fileUrl,
                isBase64: !!mat.fileData
            });
        });
    }

    if (courseAssignments?.length > 0) {
        courseAssignments.forEach(ass => {
            if (ass.attachedFiles && ass.attachedFiles.length > 0) {
                ass.attachedFiles.forEach(file => {
                    allFiles.push({
                        source: `Assignment: ${ass.title}`,
                        title: file.fileName,
                        url: file.fileData, 
                        isBase64: true
                    });
                });
            }
        });
    }

    return allFiles;
  };

  if (loading) return <div>Loading course...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '80vh', fontFamily: 'sans-serif' }}>
      
      {isSubmitModalVisible && (
        <div style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', border: '2px solid black', padding: '20px', zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
          <h3>Submit Assignment</h3>
          <form onSubmit={handleStudentSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>Cloud Drive URL: <input type="url" value={submitFileUrl} onChange={e => setSubmitFileUrl(e.target.value)} /></label>
            <label>Upload File: <input type="file" onChange={handleFileUpload} /></label>
            <button type="submit" style={{ padding: '8px', cursor: 'pointer', background: '#c62828', color: '#fff', border: 'none' }}>Turn In</button>
            <button type="button" onClick={() => setIsSubmitModalVisible(false)} style={{ padding: '8px', cursor: 'pointer' }}>Cancel</button>
          </form>
        </div>
      )}

      {isQuizModalVisible && activeQuiz && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', overflowY: 'auto', background: '#f5f5f5', padding: '40px', zIndex: 9999 }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#424242', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>{activeQuiz.title}</h2>
            <p style={{ color: 'red', fontWeight: 'bold' }}>WARNING: Do not exit full screen. If you exit or press Esc, your quiz will automatically submit with a score of 0.</p>
            <p><em>{activeQuiz.instructions}</em></p>
            
            {isSubmittingQuiz ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <h3 style={{ color: '#c62828' }}>Evaluating Answers with AI...</h3>
                    <p>Please wait while your quiz is being graded.</p>
                </div>
            ) : (
              <form onSubmit={handleQuizSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                {activeQuiz.questions.map((q, idx) => (
                  <div key={idx} style={{ background: '#fafafa', padding: '15px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>{idx + 1}. {q.question}</p>
                    
                    {q.type === 'mcq' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px' }}>
                        {q.options.map((opt, oIdx) => (
                          <label key={oIdx} style={{ cursor: 'pointer' }}>
                            <input 
                              type="radio" name={`question-${idx}`} value={opt} 
                              onChange={(e) => handleQuizAnswerChange(idx, e.target.value)} 
                              required style={{ marginRight: '8px' }}
                            /> 
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'fill_blank' && (
                      <input 
                        type="text" placeholder="Type your answer here..." 
                        onChange={(e) => handleQuizAnswerChange(idx, e.target.value)} 
                        required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      />
                    )}

                    {q.type === 'enumeration' && (
                      <textarea 
                        rows="3" placeholder="List your answers here..." 
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                        onChange={(e) => handleQuizAnswerChange(idx, e.target.value)} 
                        required 
                      />
                    )}
                  </div>
                ))}
                
                <div style={{ marginTop: '20px' }}>
                  <button type="submit" style={{ padding: '12px 24px', width: '100%', cursor: 'pointer', background: '#424242', color: '#fff', border: 'none', fontSize: '16px', fontWeight: 'bold', borderRadius: '4px' }}>Submit Quiz</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div style={{ width: '200px', borderRight: '1px solid #f0f0f0', padding: '10px', background: '#fafafa' }}>
        <h4 style={{ color: '#c62828', margin: '10px 0 20px 0', textAlign: 'center' }}>{course.code}</h4>
        <button onClick={onBack} style={{ width: '100%', marginBottom: '20px', padding: '8px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}>&larr; Back to Dashboard</button>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li><button onClick={() => setActiveTab('announcements')} style={{ width: '100%', padding: '8px', background: activeTab === 'announcements' ? '#fdecea' : '#fff', border: '1px solid #d9d9d9', cursor: 'pointer' }}>Announcements</button></li>
          <li><button onClick={() => setActiveTab('videos')} style={{ width: '100%', padding: '8px', background: activeTab === 'videos' ? '#fdecea' : '#fff', border: '1px solid #d9d9d9', cursor: 'pointer' }}>Video Lessons</button></li>
          <li><button onClick={() => setActiveTab('materials')} style={{ width: '100%', padding: '8px', background: activeTab === 'materials' ? '#fdecea' : '#fff', border: '1px solid #d9d9d9', cursor: 'pointer' }}>Reading Materials</button></li>
          <li><button onClick={() => setActiveTab('assignments')} style={{ width: '100%', padding: '8px', background: activeTab === 'assignments' ? '#fdecea' : '#fff', border: '1px solid #d9d9d9', cursor: 'pointer' }}>Assignments & Quizzes</button></li>
          <li><button onClick={() => setActiveTab('shared_files')} style={{ width: '100%', padding: '8px', background: activeTab === 'shared_files' ? '#fdecea' : '#fff', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 'bold' }}>Shared Files</button></li>
        </ul>
      </div>
      
      <div style={{ flex: 1, padding: '20px' }}>
        {readOnly && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', color: '#237804', fontWeight: 'bold' }}>
            This course is completed. You can still review its content, but new submissions are disabled.
          </div>
        )}
        {activeTab === 'announcements' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Announcements</h3>
            {courseContent?.announcements?.length > 0 ? (
              <ul style={{ padding: 0, listStyle: 'none' }}>{courseContent.announcements.map((item, idx) => (
                <li key={idx} style={{ background: '#fafafa', border: '1px solid #e8e8e8', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '16px', color: '#c62828' }}>{item.title}</strong> <br/>
                  <span style={{ color: 'gray', fontSize: '12px' }}>Posted: {new Date(item.date).toLocaleDateString()}</span>
                  <p style={{ marginTop: '10px' }}>{item.content}</p>
                </li>
              ))}</ul>
            ) : <p>No announcements.</p>}
          </div>
        )}
        
        {activeTab === 'videos' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Video Lessons</h3>
            {courseContent?.videos?.length > 0 ? <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>{courseContent.videos.map((item, idx) => (<li key={idx} style={{ marginBottom: '8px' }}><a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#c62828', textDecoration: 'none', fontWeight: 'bold' }}>{item.title}</a></li>))}</ul> : <p>No videos.</p>}
          </div>
        )}
        
        {activeTab === 'materials' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Reading Materials</h3>
            {courseContent?.materials?.length > 0 ? (
                <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
                  {courseContent.materials.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      <a 
                          href={item.fileData || item.fileUrl} 
                          download={item.fileData ? item.fileName : undefined} 
                          target={item.fileData ? "_self" : "_blank"} 
                          rel="noreferrer" 
                          style={{ color: '#c62828', textDecoration: 'none', fontWeight: 'bold' }}
                      >
                          {item.title} {item.fileName ? `(${item.fileName})` : ''}
                      </a>
                    </li>
                  ))}
                </ul>
            ) : <p>No reading materials.</p>}
          </div>
        )}

        {activeTab === 'shared_files' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Course Shared Files</h3>
            <p style={{ color: 'gray', marginBottom: '20px' }}>All documents and materials uploaded by your instructor for this course.</p>
            
            {getAllSharedFiles().length > 0 ? (
                <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getAllSharedFiles().map((file, idx) => (
                        <li key={idx} style={{ border: '1px solid #e8e8e8', padding: '15px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                            <div>
                                <strong style={{ fontSize: '15px' }}>{file.title}</strong>
                                <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>Source: {file.source}</div>
                            </div>
                            <a 
                                href={file.url} 
                                download={file.isBase64 ? file.title : undefined}
                                target={file.isBase64 ? "_self" : "_blank"} 
                                rel="noreferrer"
                                style={{ background: '#c62828', color: '#fff', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                            >
                                {file.isBase64 ? 'Download File' : 'Open Link'}
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No files have been shared in this course yet.</p>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Assignments & Quizzes</h3>
            {courseAssignments.length > 0 ? (
              courseAssignments.map(item => {
                const mySubmission = item.submissions?.find(s => s.studentUsername === user.schoolId);
                const isPastDeadline = new Date() > new Date(item.deadline);
                const isStrictlyClosed = item.autoClose && isPastDeadline;
                const isQuiz = item.type === 'Quiz';

                return (
                  <div key={item._id} id={`task-${item._id}`} style={{ border: highlightId === item._id ? '2px solid #faad14' : '1px solid #e8e8e8', boxShadow: highlightId === item._id ? '0 0 0 4px rgba(250,173,20,0.25)' : 'none', padding: '20px', marginBottom: '20px', borderRadius: '8px', background: highlightId === item._id ? '#fffbe6' : '#fafafa', transition: 'all 0.4s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: isQuiz ? '#424242' : '#000', fontSize: '18px' }}>
                          {item.title} <span style={{ color: 'gray', fontSize: '14px', fontWeight: 'normal' }}> (Max Score: {item.maxGrade})</span>
                        </h4>
                        <span style={{ color: isPastDeadline && !mySubmission ? 'red' : 'gray', fontSize: '13px', fontWeight: 'bold' }}>
                            Due: {new Date(item.deadline).toLocaleString()}
                        </span>
                    </div>
                    
                    <p style={{ fontSize: '15px' }}>{item.instructions}</p>
                    
                    {item.attachedFiles?.length > 0 && (
                      <div style={{ margin: '15px 0', padding: '10px', background: '#fff', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                        <strong>Reference Files:</strong>
                        <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                            {item.attachedFiles.map((f, i) => (
                                <li key={i}>
                                    <a href={f.fileData || f.fileUrl} download={f.fileData ? f.fileName : undefined} target={f.fileData ? "_self" : "_blank"} rel="noreferrer" style={{ color: '#c62828' }}>
                                        {f.fileName || f.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ backgroundColor: '#fff', padding: '15px', marginTop: '20px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>Your Submission Record</h5>
                      
                      {mySubmission ? (
                        <div>
                          {mySubmission.cheatingFlag ? (
                             <p style={{ color: '#b71c1c', background: '#fff1f0', padding: '8px', border: '1px solid #ffa39e', borderRadius: '4px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Flagged: Cheating (Exited Full Screen)</p>
                          ) : (
                             <p style={{ margin: '0 0 8px 0' }}><strong>Status:</strong> {new Date(mySubmission.submittedAt) > new Date(item.deadline) ? <span style={{color:'orange', fontWeight: 'bold'}}>Turned in Late</span> : <span style={{color:'green', fontWeight: 'bold'}}>Turned In Successfully</span>}</p>
                          )}
                          <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}><strong>Grade:</strong> <span style={{ fontWeight: 'bold', color: '#c62828' }}>{mySubmission.grade !== null && mySubmission.grade !== undefined ? `${mySubmission.grade} / ${item.maxGrade}` : 'Pending Evaluation'}</span></p>
                          
                          {mySubmission.feedback && <div style={{ margin: '10px 0', background: '#fdecea', padding: '12px', borderLeft: '4px solid #c62828', borderRadius: '4px' }}><strong>Teacher Feedback:</strong> <br/>{mySubmission.feedback}</div>}
                          
                          {!isQuiz && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                              {mySubmission.fileUrl && <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" style={{ background: '#fff5f5', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', border: '1px solid #f5c2c0' }}>View Cloud Link</a>}
                              {mySubmission.fileName && <a href={mySubmission.fileData} download={mySubmission.fileName} style={{ background: '#fff5f5', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', border: '1px solid #f5c2c0' }}>Download File: {mySubmission.fileName}</a>}
                            </div>
                          )}
                        </div>
                      ) : <p style={{ color: isPastDeadline ? 'red' : 'gray', margin: '0 0 10px 0', fontWeight: 'bold' }}>{isPastDeadline ? `Missing (Overdue)` : 'Not Submitted Yet'}</p>}
                      
                      {!readOnly && !isStrictlyClosed && !mySubmission && (
                        <button 
                          onClick={() => isQuiz ? startQuizFullscreen(item) : openSubmitModal(item._id)} 
                          style={{ marginTop: '15px', padding: '10px 20px', cursor: 'pointer', background: isQuiz ? '#424242' : '#c62828', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '15px' }}
                        >
                          {isQuiz ? "Take Quiz" : "Submit Work"}
                        </button>
                      )}

                      {!readOnly && !isStrictlyClosed && mySubmission && !isQuiz && (
                         <button onClick={() => openSubmitModal(item._id)} style={{ marginTop: '15px', padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px', fontWeight: 'bold' }}>Update Submission</button>
                      )}

                      {isStrictlyClosed && !mySubmission && <p style={{ color: 'red', margin: '15px 0 0 0', fontWeight: 'bold', padding: '10px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '4px', display: 'inline-block' }}>Submissions are closed.</p>}
                    </div>
                  </div>
                );
              })
            ) : <p>No assignments or quizzes have been posted yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}