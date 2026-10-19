import React, { useState } from 'react';
import { Button, Modal, Upload, Form, InputNumber, Card, Input as AntInput, Space, message, Spin, Select, Row, Col, Typography } from 'antd';
import { UploadOutlined, RobotOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';

const { TextArea } = AntInput;
const { Title, Text } = Typography;

// ==========================================
// AI QUIZ GENERATOR COMPONENT
// ==========================================
function AIQuizGenerator({ courseCode, block, onQuizSaved }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState(null);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [quizMetadata, setQuizMetadata] = useState(null);

  const [form] = Form.useForm();

  const handleGenerate = async (values) => {
    if (!file) return message.error('Please upload a lesson document first.');

    setIsGenerating(true);
    const formData = new FormData();
    formData.append('lessonDoc', file); 
    formData.append('mcqCount', values.mcqCount || 0);
    formData.append('fillBlankCount', values.fillBlankCount || 0);
    formData.append('enumCount', values.enumCount || 0);
    formData.append('quizTitle', values.quizTitle || 'Quiz');
    formData.append('deadline', values.deadline ? new Date(values.deadline).toISOString() : new Date().toISOString());
    formData.append('autoClose', values.autoClose || false);
    formData.append('maxGrade', values.maxGrade || 100);

    try {
      const response = await api.post('/quiz/generate', formData);
      if (response.data.success) {
        setGeneratedQuiz(response.data.quiz);
        setQuizMetadata({
          title: values.quizTitle || 'Quiz',
          deadline: values.deadline,
          autoClose: values.autoClose || false,
          maxGrade: values.maxGrade || 100
        });
        message.success('Quiz generated successfully! Review and edit below.');
      }
    } catch (err) {
      message.error('Failed to generate quiz. Ensure your backend AI route is configured correctly.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuiz = [...generatedQuiz];
    updatedQuiz[index][field] = value;
    setGeneratedQuiz(updatedQuiz);
  };

  const removeQuestion = (index) => {
    setGeneratedQuiz(generatedQuiz.filter((_, i) => i !== index));
  };

  const handleSaveToCourse = async () => {
    try {
      const response = await api.post('/assignments/create', {
        courseCode,
        block,
        title: quizMetadata.title,
        instructions: 'Please answer the following questions based on the lesson.',
        deadline: quizMetadata.deadline,
        autoClose: quizMetadata.autoClose,
        maxGrade: Number(quizMetadata.maxGrade),
        type: 'Quiz',
        questions: generatedQuiz,
      });

      if (response.data.success) {
        message.success(`Quiz saved to block ${block}!`);
        setIsModalVisible(false);
        setGeneratedQuiz(null);
        setQuizMetadata(null);
        setFile(null);
        if (onQuizSaved) onQuizSaved(response.data.assignment);
      }
    } catch (err) {
      message.error('Error saving quiz to database.');
    }
  };

  return (
    <>
      <Button 
        type="primary" 
        icon={<RobotOutlined />} 
        onClick={() => setIsModalVisible(true)} 
        style={{ backgroundColor: '#424242', borderColor: '#424242' }}
      >
        Generate Quiz
      </Button>

      <Modal title="Generate Quiz with AI" open={isModalVisible} onCancel={() => setIsModalVisible(false)} width={800} footer={null} destroyOnClose>
        {!generatedQuiz ? (
          <Spin spinning={isGenerating} tip="AI is reading the document and drafting questions...">
            <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ mcqCount: 5, fillBlankCount: 3, enumCount: 2, quizTitle: 'Quiz', maxGrade: 100, autoClose: false }}>
              <Form.Item name="quizTitle" label="Quiz Title" rules={[{ required: true, message: 'Please enter a quiz title' }]}>
                <AntInput placeholder="e.g., Chapter 1 Assessment" />
              </Form.Item>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item name="deadline" label="Deadline" style={{ flex: 1 }} rules={[{ required: true, message: 'Please set a due date' }]}>
                  <input type="datetime-local" style={{ width: '100%', padding: '6px', border: '1px solid #d9d9d9', borderRadius: '4px' }} />
                </Form.Item>
                <Form.Item name="maxGrade" label="Max Grade Possible" style={{ flex: 1 }}>
                  <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <Form.Item name="autoClose" valuePropName="checked">
                <label><input type="checkbox" /> Automatically close submissions past deadline</label>
              </Form.Item>
              <Form.Item label="Upload Lesson Document" required>
                <Upload beforeUpload={(f) => { setFile(f); return false; }} maxCount={1} accept=".pdf,.docx,.pptx">
                  <Button icon={<UploadOutlined />}>Select Document (PDF, DOCX, PPTX)</Button>
                </Upload>
              </Form.Item>
              <Space size="large" style={{ marginBottom: 16 }}>
                <Form.Item name="mcqCount" label="Multiple Choice"><InputNumber min={0} max={20} /></Form.Item>
                <Form.Item name="fillBlankCount" label="Fill in Blanks"><InputNumber min={0} max={20} /></Form.Item>
                <Form.Item name="enumCount" label="Enumeration"><InputNumber min={0} max={20} /></Form.Item>
              </Space>
              <Button type="primary" htmlType="submit" block size="large">Generate Draft & Review Questions</Button>
            </Form>
          </Spin>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <Text strong>Quiz Title:</Text> {quizMetadata?.title} <br/>
              <Text strong>Deadline:</Text> {new Date(quizMetadata?.deadline).toLocaleString()} | <Text strong>Auto-Close:</Text> {quizMetadata?.autoClose ? 'Yes' : 'No'}
            </div>
            {generatedQuiz.map((q, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 16, borderColor: '#d9d9d9' }} extra={<Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeQuestion(idx)} />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <AntInput addonBefore={`Q${idx+1}:`} value={q.question} onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)} />
                  {q.type === 'mcq' && (
                    <div style={{ marginLeft: '24px' }}>
                      {q.options.map((opt, oIdx) => (
                        <AntInput key={oIdx} size="small" addonBefore={`Opt ${String.fromCharCode(65 + oIdx)}`} value={opt} style={{ marginBottom: 4 }} onChange={(e) => { const newOpts = [...q.options]; newOpts[oIdx] = e.target.value; handleQuestionChange(idx, 'options', newOpts); }} />
                      ))}
                      <Select size="small" value={q.answer} style={{ width: '100%', marginTop: 8 }} onChange={(val) => handleQuestionChange(idx, 'answer', val)} options={q.options.map(o => ({ label: `Correct Answer: ${o}`, value: o }))} />
                    </div>
                  )}
                  {q.type !== 'mcq' && (
                    <TextArea rows={2} placeholder="Correct Answer(s)" value={q.answer} onChange={(e) => handleQuestionChange(idx, 'answer', e.target.value)} />
                  )}
                </Space>
              </Card>
            ))}
            <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button onClick={() => setGeneratedQuiz(null)}>Discard & Start Over</Button>
              <Button type="primary" onClick={handleSaveToCourse}>Save Quiz to Course</Button>
            </Space>
          </div>
        )}
      </Modal>
    </>
  );
}

// ==========================================
// MAIN ASSIGNMENT BUILDER COMPONENT
// ==========================================
// Everything created here belongs to `block` only (see Assignment.block).
export default function AssignmentBuilder({ courseCode, block, assignments, setAssignments, onDataChange }) {
  const [assTitle, setAssTitle] = useState('');
  const [assInstructions, setAssInstructions] = useState('');
  const [assDeadline, setAssDeadline] = useState('');
  const [assAutoClose, setAssAutoClose] = useState(false);
  const [assMaxGrade, setAssMaxGrade] = useState(100);
  const [fileList, setFileList] = useState([]);

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    const attachedFiles = [];
    for (let file of fileList) {
        // FIX: Extract the actual File object regardless of how Ant Design wrapped it
        const actualFile = file.originFileObj || file; 
        
        const base64Data = await getBase64(actualFile);
        attachedFiles.push({
            fileName: actualFile.name,
            fileData: base64Data,
            contentType: actualFile.type || 'application/octet-stream'
        });
    }

    const payload = {
      courseCode,
      block,
      title: assTitle, 
      instructions: assInstructions, 
      deadline: assDeadline,
      autoClose: assAutoClose, 
      maxGrade: Number(assMaxGrade),
      attachedFiles
    };

    try {
      const response = await api.post('/assignments/create', payload);
      if (response.data.success) {
        message.success('Assignment Created!');
        setAssignments([response.data.assignment, ...assignments]);
        setAssTitle(''); setAssInstructions(''); setAssDeadline(''); 
        setAssAutoClose(false); setAssMaxGrade(100); setFileList([]);
        if (typeof onDataChange === 'function') onDataChange();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment and all its submissions?")) return;
    try {
      const response = await api.delete(`/assignments/${assignmentId}`);
      if (response.data.success) {
        message.success('Assignment deleted.');
        setAssignments(assignments.filter(a => a._id !== assignmentId));
        if (typeof onDataChange === 'function') onDataChange();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to delete assignment.');
    }
  };

  const handleAIQuizSaved = (newQuizAssignment) => {
    setAssignments([newQuizAssignment, ...assignments]);
    if (typeof onDataChange === 'function') onDataChange();
  };

  const uploadProps = {
    onRemove: (file) => {
      setFileList(prev => prev.filter(item => item.uid !== file.uid));
    },
    beforeUpload: (file) => {
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Files must be smaller than 5MB!');
        return Upload.LIST_IGNORE;
      }
      // Store the raw File object directly
      setFileList(prev => [...prev, file]);
      return false; // Prevent auto-uploading to a URL
    },
    fileList,
    multiple: true,
    accept: '.pdf,.docx,.pptx'
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', padding: '20px', borderRadius: '8px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Assignments & Quizzes Builder</h3>
        <AIQuizGenerator courseCode={courseCode} block={block} onQuizSaved={handleAIQuizSaved} />
      </div>

      <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxWidth: '600px', background: '#fafafa', padding: '15px', borderRadius: '6px' }}>
        <input type="text" placeholder="Assignment Title" value={assTitle} onChange={(e) => setAssTitle(e.target.value)} required style={{ padding: '8px' }} />
        <textarea placeholder="Instructions / Description" value={assInstructions} onChange={(e) => setAssInstructions(e.target.value)} rows="3" required style={{ padding: '8px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ flex: 1 }}>Deadline: <br/><input type="datetime-local" value={assDeadline} onChange={(e) => setAssDeadline(e.target.value)} required style={{ padding: '8px', width: '100%' }} /></label>
            <label style={{ flex: 1 }}>Max Grade: <br/><input type="number" value={assMaxGrade} onChange={(e) => setAssMaxGrade(e.target.value)} required style={{ padding: '8px', width: '100%' }} /></label>
        </div>
        <label><input type="checkbox" checked={assAutoClose} onChange={(e) => setAssAutoClose(e.target.checked)} /> Automatically close submissions past deadline</label>
        
        <fieldset style={{ border: '1px dashed #ccc', padding: '15px', marginTop: '10px', background: '#fff' }}>
          <legend style={{ padding: '0 5px' }}>Attach Resource Files (PDF, DOCX, PPTX)</legend>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Select Files to Attach</Button>
          </Upload>
        </fieldset>

        <button type="submit" style={{ padding: '10px', background: '#c62828', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Create Manual Assignment</button>
      </form>

      <h4>Active Assignments & Quizzes · Block {block}</h4>
      <ul style={{ paddingLeft: 0 }}>
        {assignments.map(ass => (
          <li key={ass._id} style={{ marginBottom: '10px', padding: '15px', border: '1px solid #e8e8e8', listStyle: 'none', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong style={{ fontSize: '16px', color: ass.type === 'Quiz' ? '#424242' : 'inherit' }}>{ass.title}</strong>
                <span style={{ marginLeft: 8, fontSize: '12px', padding: '1px 6px', borderRadius: 4, background: ass.block ? '#e6f4ff' : '#f5f5f5', color: ass.block ? '#0958d9' : '#8c8c8c' }}>
                  {ass.block ? `Block ${ass.block}` : 'All blocks (older)'}
                </span>
              </span>
              <button onClick={() => handleDeleteAssignment(ass._id)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}>Delete</button>
            </div>
            <div style={{ color: 'gray', fontSize: '13px', marginTop: '5px' }}>
                Max Grade: {ass.maxGrade} | Due: {new Date(ass.deadline).toLocaleString()} | Auto-Close: {ass.autoClose ? 'Yes' : 'No'}
            </div>
            <div style={{ fontSize: '13px', marginTop: '5px' }}>
                Submissions: <strong>{ass.submissions?.length || 0}</strong>
                {ass.type === 'Quiz' && ass.questions && (
                <span style={{ color: '#424242', marginLeft: '15px' }}>Questions: <strong>{ass.questions.length}</strong></span>
                )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}