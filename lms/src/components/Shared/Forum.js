import React, { useState, useEffect } from 'react';
import { Card, Button, Input, List, Typography, Space, Tag, Modal, Form, message } from 'antd';
import { UpOutlined, CommentOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;

export default function Forum({ courseCode, currentUser }) {
  const [threads, setThreads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [form] = Form.useForm();

  const fetchThreads = async () => {
    try {
      const res = await api.get(`/forums/${courseCode}`);
      if (res.data.success) {
        setThreads(res.data.threads);
        if (activeThread) {
            const updatedActive = res.data.threads.find(t => t._id === activeThread._id);
            if (updatedActive) setActiveThread(updatedActive);
        }
      }
    } catch (e) { }
  };

  useEffect(() => { if (courseCode) fetchThreads(); }, [courseCode]);

  const handleCreateThread = async (values) => {
    try {
      await api.post('/forums/create', { courseCode, title: values.title, content: values.content, author: currentUser.schoolId });
      setIsModalOpen(false);
      form.resetFields();
      fetchThreads();
    } catch (e) { }
  };

  const handleUpvote = async (threadId) => {
    try {
      await api.post('/forums/upvote', { threadId, likerId: currentUser.schoolId });
      fetchThreads();
    } catch (e) { }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await api.post('/forums/reply', { threadId: activeThread._id, author: currentUser.schoolId, content: replyText });
      setReplyText('');
      fetchThreads();
    } catch (e) { }
  };

  const handleDelete = async (threadId) => {
      if (!window.confirm("Are you sure you want to delete this thread?")) return;
      try {
          await api.delete(`/forums/${threadId}`);
          message.success("Thread deleted");
          setActiveThread(null);
          fetchThreads();
      } catch (e) { message.error("Error deleting thread"); }
  };

  if (!courseCode) return <div style={{ padding: 40, textAlign: 'center' }}><Title level={4}>Select a course to view discussions.</Title></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', padding: '20px', minHeight: '80vh', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={3}>r/{courseCode} Discussions</Title>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>Create Post</Button>
      </div>

      <Modal title="Create a new post" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreateThread}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="Body"><Input.TextArea rows={4} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Post to Forum</Button>
        </Form>
      </Modal>

      {!activeThread ? (
        <List dataSource={threads} locale={{emptyText: 'Be the first to post!'}} renderItem={thread => (
          <Card hoverable style={{ marginBottom: '10px', borderRadius: '8px', background: '#fafafa' }} bodyStyle={{ padding: '15px', display: 'flex', gap: '15px' }} onClick={() => setActiveThread(thread)}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '6px', minWidth: '50px', border: '1px solid #f0f0f0' }}>
              <Button type="text" icon={<UpOutlined />} size="small" onClick={(e) => { e.stopPropagation(); handleUpvote(thread._id); }} />
              <Text strong>{thread.upvotes}</Text>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Posted by u/{thread.author} • {new Date(thread.createdAt).toLocaleDateString()}</Text>
                  {currentUser.accountType === 'Teacher' && <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={(e) => { e.stopPropagation(); handleDelete(thread._id); }} />}
              </div>
              <Title level={5} style={{ margin: '5px 0' }}>{thread.title}</Title>
              <Paragraph ellipsis={{ rows: 2 }} style={{ color: '#595959' }}>{thread.content}</Paragraph>
              <Space style={{ color: 'gray', fontSize: '13px' }}>
                <CommentOutlined /> {thread.replies?.length || 0} Comments
              </Space>
            </div>
          </Card>
        )} />
      ) : (
        <div>
          <Button type="link" onClick={() => setActiveThread(null)} style={{ padding: 0, marginBottom: '15px' }}>&larr; Back to all posts</Button>
          <Card style={{ borderRadius: '8px', marginBottom: '20px', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Posted by u/{activeThread.author} • {new Date(activeThread.createdAt).toLocaleString()}</Text>
                {currentUser.accountType === 'Teacher' && <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => handleDelete(activeThread._id)} />}
            </div>
            <Title level={4} style={{ marginTop: '10px' }}>{activeThread.title}</Title>
            <Paragraph style={{ fontSize: '15px' }}>{activeThread.content}</Paragraph>
            <Tag color="blue"><UpOutlined /> {activeThread.upvotes} Upvotes</Tag>
          </Card>

          <Title level={5}>Comments ({activeThread.replies?.length || 0})</Title>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <Input.TextArea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="What are your thoughts?" />
            <Button type="primary" style={{ height: 'auto' }} onClick={handleReply}>Comment</Button>
          </div>

          <List dataSource={activeThread.replies} renderItem={reply => (
            <div style={{ padding: '15px', background: '#fafafa', borderLeft: '3px solid #d9d9d9', marginBottom: '10px', borderRadius: '4px' }}>
              <Space style={{ marginBottom: '5px' }}>
                <UserOutlined /> <Text strong>u/{reply.author}</Text> <Text type="secondary" style={{fontSize: '12px'}}>{new Date(reply.createdAt).toLocaleString()}</Text>
              </Space>
              <Paragraph style={{ margin: 0 }}>{reply.content}</Paragraph>
            </div>
          )} />
        </div>
      )}
    </div>
  );
}