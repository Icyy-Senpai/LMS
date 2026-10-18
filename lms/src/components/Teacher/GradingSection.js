import React, { useState } from 'react';
import { List, Card, Button, Table, Tag, Modal, Input, Space, Typography, Form, message, Pagination } from 'antd';
import { ArrowLeftOutlined, LinkOutlined, DownloadOutlined, WarningOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function GradingSection({ assignments, setAssignments, enrolledStudents, onDataChange }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Pagination state for quiz questions
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const questionsPerPage = 5;

  const [form] = Form.useForm();

  const getStudentTableData = () => {
    if (!selectedAssignment) return [];
    const baseStudents = enrolledStudents && enrolledStudents.length > 0
        ? enrolledStudents.map(s => ({ schoolId: s.schoolId, name: `${s.firstName} ${s.lastName}` }))
        : selectedAssignment.submissions.map(s => ({ schoolId: s.studentUsername, name: s.studentUsername }));

    return baseStudents.map(student => {
      const submission = selectedAssignment.submissions?.find(s => s.studentUsername === student.schoolId);
      const isPastDeadline = new Date() > new Date(selectedAssignment.deadline);

      let status = 'Not Submitted';
      let statusColor = 'default';

      if (submission) {
        if (submission.cheatingFlag) {
            status = 'Flagged: Cheating';
            statusColor = 'red';
        } else {
            status = new Date(submission.submittedAt) > new Date(selectedAssignment.deadline) ? 'Turned in Late' : 'Turned In';
            statusColor = 'success';
        }
      } else if (isPastDeadline) {
        status = 'Missing';
        statusColor = 'error';
      }

      return {
        key: student.schoolId,
        schoolId: student.schoolId,
        name: student.name,
        status,
        statusColor,
        submission
      };
    });
  };

  const handleOpenGrading = (record) => {
    setGradingSubmission(record);
    form.setFieldsValue({
      grade: record.submission?.grade || 0,
      feedback: record.submission?.feedback || ''
    });
    setCurrentQuestionPage(1); // Reset pagination to page 1 when opening a new submission
    setIsModalVisible(true);
  };

  const handleSaveGrade = async (values) => {
    try {
      const response = await api.post('/assignments/grade', {
        submissionId: gradingSubmission.submission._id,
        grade: Number(values.grade),
        feedback: values.feedback
      });

      if (response.data.success) {
        message.success('Grade saved successfully!');
        if (typeof onDataChange === 'function') onDataChange();
        
        const updatedAssignmentList = assignments.map(ass => 
            ass._id === selectedAssignment._id ? 
            {...ass, submissions: ass.submissions.map(sub => sub._id === response.data.submission._id ? response.data.submission : sub)} : ass
        );
        setAssignments(updatedAssignmentList);
        setSelectedAssignment(updatedAssignmentList.find(a => a._id === selectedAssignment._id));
        
        setIsModalVisible(false);
      }
    } catch (err) {
      message.error('Error saving grade.');
    }
  };

  const columns = [
    { title: 'Student ID', dataIndex: 'schoolId', key: 'schoolId' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Status', key: 'status', render: (_, record) => <Tag color={record.statusColor}>{record.status}</Tag> },
    { title: 'Grade', key: 'grade', render: (_, record) => (
      <Text strong>{record.submission?.grade !== null && record.submission?.grade !== undefined ? `${record.submission.grade} / ${selectedAssignment.maxGrade}` : '-'}</Text>
    )},
    { title: 'Action', key: 'action', render: (_, record) => (
      <Button type="primary" size="small" disabled={!record.submission} onClick={() => handleOpenGrading(record)}>Review & Grade</Button>
    )}
  ];

  if (!selectedAssignment) {
    return (
      <div style={{ border: '1px solid #d9d9d9', padding: '20px', borderRadius: '8px', background: '#fff' }}>
        <Title level={4}>Grading & Submissions</Title>
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={assignments}
          pagination={{ pageSize: 5 }} // Pagination for the assignment list
          renderItem={ass => (
            <List.Item>
              <Card size="small" hoverable onClick={() => setSelectedAssignment(ass)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ color: ass.type === 'Quiz' ? '#722ed1' : 'inherit' }}>{ass.title}</Text><br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Due: {new Date(ass.deadline).toLocaleString()}</Text>
                  </div>
                  <Tag color="blue">{ass.submissions?.length || 0} Submissions</Tag>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>
    );
  }

  // Calculate pagination bounds for the questions array
  const studentAnswers = gradingSubmission?.submission?.answers || [];
  const startIndex = (currentQuestionPage - 1) * questionsPerPage;
  const paginatedAnswers = studentAnswers.slice(startIndex, startIndex + questionsPerPage);

  return (
    <div style={{ border: '1px solid #d9d9d9', padding: '20px', borderRadius: '8px', background: '#fff' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedAssignment(null)} style={{ marginBottom: '16px' }}>Back</Button>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>{selectedAssignment.title}</Title>
        <Text type="secondary">Max Grade: {selectedAssignment.maxGrade} | Due: {new Date(selectedAssignment.deadline).toLocaleString()}</Text>
      </div>

      <Table 
        size="small" 
        dataSource={getStudentTableData()} 
        columns={columns} 
        pagination={{ pageSize: 10 }} // Pagination for the student roster
      />

      <Modal title={`Evaluate: ${gradingSubmission?.name}`} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} destroyOnClose width={850}>
        {gradingSubmission?.submission && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
            {gradingSubmission.submission.cheatingFlag && (
                <div style={{ background: '#fff1f0', padding: '10px', border: '1px solid #ffa39e', color: '#cf1322', marginBottom: '15px', borderRadius: '4px' }}>
                    <WarningOutlined style={{ marginRight: '8px' }} /> 
                    <strong>Cheating Flag:</strong> Student exited full-screen mode during the quiz. Auto-graded to 0.
                </div>
            )}
            
            {selectedAssignment.type !== 'Quiz' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                {gradingSubmission.submission.fileUrl && <Button type="dashed" href={gradingSubmission.submission.fileUrl} target="_blank" block>Open Cloud Link</Button>}
                {gradingSubmission.submission.fileName && <Button type="dashed" href={gradingSubmission.submission.fileData} download={gradingSubmission.submission.fileName} block>Download Attached File</Button>}
              </Space>
            )}

            {/* AI Auto-Checked Quiz Answers Display in Form Layout */}
            {selectedAssignment.type === 'Quiz' && studentAnswers.length > 0 && (
                <div>
                    <Title level={5} style={{ marginBottom: '5px' }}>Student's Quiz Responses</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
                        <RobotOutlined /> AI has auto-graded this submission. You may review the AI feedback and manually override the final score below.
                    </Text>
                    
                    {paginatedAnswers.map((ans, idx) => {
                        const originalIndex = startIndex + idx;
                        // Cross-reference the original question to fetch options for MCQs
                        const originalQuestion = selectedAssignment.questions.find(q => q.question === ans.question) || selectedAssignment.questions[originalIndex];
                        const isFullyCorrect = ans.pointsAwarded > 0;

                        return (
                          <div key={originalIndex} style={{ 
                              background: '#fff', 
                              padding: '20px', 
                              borderRadius: '8px', 
                              border: '1px solid #e8e8e8', 
                              marginBottom: '15px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              borderLeft: isFullyCorrect ? '5px solid #52c41a' : '5px solid #ff4d4f'
                          }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '15px' }}>
                                  {originalIndex + 1}. {ans.question}
                                </p>
                                <Tag color={isFullyCorrect ? 'green' : 'red'} style={{ margin: 0 }}>
                                  {isFullyCorrect ? <CheckCircleOutlined /> : <CloseCircleOutlined />} +{ans.pointsAwarded} Pts
                                </Tag>
                              </div>
                              
                              {/* Recreate the Student's Form Input */}
                              {originalQuestion?.type === 'mcq' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px', marginBottom: '10px' }}>
                                  {originalQuestion.options.map((opt, oIdx) => {
                                    const isStudentChoice = opt === ans.studentAnswer;
                                    const isCorrectChoice = opt === ans.correctAnswer;
                                    
                                    let color = '#595959';
                                    let bg = 'transparent';
                                    if (isCorrectChoice) {
                                      color = '#52c41a';
                                      bg = '#f6ffed';
                                    } else if (isStudentChoice && !isCorrectChoice) {
                                      color = '#ff4d4f';
                                      bg = '#fff1f0';
                                    }

                                    return (
                                      <label key={oIdx} style={{ 
                                          cursor: 'not-allowed', 
                                          color: color, 
                                          fontWeight: isStudentChoice || isCorrectChoice ? 'bold' : 'normal',
                                          background: bg,
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: isStudentChoice ? `1px solid ${color}` : '1px solid transparent'
                                      }}>
                                        <input 
                                          type="radio" 
                                          checked={isStudentChoice} 
                                          readOnly 
                                          disabled 
                                          style={{ marginRight: '8px' }}
                                        /> 
                                        {opt}
                                        {isCorrectChoice && <span style={{ marginLeft: '10px', fontSize: '12px' }}>(Correct Answer)</span>}
                                        {isStudentChoice && !isCorrectChoice && <span style={{ marginLeft: '10px', fontSize: '12px' }}>(Student Selected)</span>}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {originalQuestion?.type === 'fill_blank' && (
                                <div style={{ paddingLeft: '10px', marginBottom: '10px' }}>
                                  <input 
                                    type="text" 
                                    value={ans.studentAnswer} 
                                    disabled 
                                    style={{ 
                                      width: '100%', padding: '8px', boxSizing: 'border-box', 
                                      borderColor: isFullyCorrect ? '#52c41a' : '#ff4d4f', 
                                      background: isFullyCorrect ? '#f6ffed' : '#fff1f0',
                                      color: 'black', fontWeight: 'bold', borderRadius: '4px'
                                    }}
                                  />
                                  {!isFullyCorrect && (
                                    <Text type="secondary" style={{ display: 'block', marginTop: '5px', color: '#52c41a' }}>
                                      <strong>Expected Answer:</strong> {ans.correctAnswer}
                                    </Text>
                                  )}
                                </div>
                              )}

                              {originalQuestion?.type === 'enumeration' && (
                                <div style={{ paddingLeft: '10px', marginBottom: '10px' }}>
                                  <textarea 
                                    rows="3" 
                                    value={ans.studentAnswer} 
                                    disabled 
                                    style={{ 
                                      width: '100%', padding: '8px', boxSizing: 'border-box', 
                                      borderColor: isFullyCorrect ? '#52c41a' : '#ff4d4f', 
                                      background: isFullyCorrect ? '#f6ffed' : '#fff1f0',
                                      color: 'black', fontWeight: 'bold', borderRadius: '4px'
                                    }} 
                                  />
                                  <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                                    <strong>Expected Answer:</strong> {ans.correctAnswer}
                                  </Text>
                                </div>
                              )}

                              {/* AI Feedback Box */}
                              {ans.aiFeedback && (
                                  <div style={{ marginTop: '15px', padding: '10px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', fontSize: '13px' }}>
                                      <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                      <strong>AI Evaluation:</strong> {ans.aiFeedback}
                                  </div>
                              )}
                          </div>
                        )
                    })}

                    <Pagination
                      current={currentQuestionPage}
                      pageSize={questionsPerPage}
                      total={studentAnswers.length}
                      onChange={(page) => setCurrentQuestionPage(page)}
                      showSizeChanger={false}
                      style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}
                    />
                </div>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: '20px' }}>
          <Form form={form} layout="vertical" onFinish={handleSaveGrade}>
            <Form.Item name="grade" label={`Adjust/Confirm Final Score (out of ${selectedAssignment?.maxGrade})`} rules={[{ required: true }]}>
              <Input type="number" max={selectedAssignment?.maxGrade} min={0} style={{ fontSize: '16px', fontWeight: 'bold' }} />
            </Form.Item>
            <Form.Item name="feedback" label="Manual Teacher Feedback & Comments">
              <TextArea rows={3} placeholder="Add your manual comments here..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">Save Grade & Feedback</Button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}