import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Input, Button, List, Avatar, Typography, Space, message } from 'antd';
import { UserOutlined, SendOutlined, UserAddOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

export default function Network({ currentUser }) {
  const [activeChat, setActiveChat] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const fetchNetworkData = async () => {
    try {
      const res = await api.get(`/social/friends/${currentUser.schoolId}`);
      if (res.data.success) {
        setFriends(res.data.friends);
        setRequests(res.data.requests);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNetworkData(); }, []);

  const fetchMessages = async (friendId) => {
    try {
      const res = await api.get(`/social/messages?user1=${currentUser.schoolId}&user2=${friendId}`);
      if (res.data.success) setMessages(res.data.messages);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) { console.error(err); }
  };

  const handleSearch = async (value) => {
    if (!value) return setSearchResults([]);
    try {
      const res = await api.get(`/social/search?query=${value}&currentUserId=${currentUser.schoolId}`);
      if (res.data.success) setSearchResults(res.data.users);
    } catch (err) { console.error(err); }
  };

  const sendFriendRequest = async (recipient) => {
    try {
      const res = await api.post('/social/friend-request', { requester: currentUser.schoolId, recipient });
      if (res.data.success) message.success('Friend request sent!');
      else message.warning(res.data.message);
    } catch (err) { message.error('Error sending request.'); }
  };

  const acceptRequest = async (reqId) => {
    try {
      await api.post('/social/friend-accept', { requestId: reqId });
      message.success('Friend added!');
      fetchNetworkData();
    } catch (err) { message.error('Error accepting request.'); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const res = await api.post('/social/messages', { sender: currentUser.schoolId, receiver: activeChat.schoolId, content: newMessage });
      if (res.data.success) {
        setMessages([...messages, res.data.message]);
        setNewMessage('');
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) { message.error('Failed to send.'); }
  };

  return (
    <Row gutter={16} style={{ height: '70vh', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
      <Col span={8} style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #f0f0f0', paddingRight: '10px' }}>
        <Title level={4}>Friends</Title>
        <Input.Search placeholder="Search users by name or ID..." allowClear onSearch={handleSearch} style={{ marginBottom: 16 }} />
        
        {searchResults.length > 0 && (
          <List size="small" header={<Text strong>Search Results</Text>} dataSource={searchResults} renderItem={user => (
            <List.Item actions={[<Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => sendFriendRequest(user.schoolId)} />]}>
              <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} src={user.photoUrl} />} title={`${user.firstName} ${user.lastName}`} description={user.schoolId} />
            </List.Item>
          )} />
        )}

        {requests.length > 0 && (
          <List size="small" header={<Text strong type="danger">Friend Requests</Text>} dataSource={requests} renderItem={req => (
            <List.Item actions={[<Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => acceptRequest(req._id)}>Accept</Button>]}>
              <List.Item.Meta title={req.requester} description="Wants to be friends" />
            </List.Item>
          )} />
        )}

        <List size="small" header={<Text strong>My Friends</Text>} dataSource={friends} locale={{emptyText: 'No friends yet.'}} renderItem={friend => (
          <List.Item style={{ cursor: 'pointer', background: activeChat?.schoolId === friend.schoolId ? '#e6f7ff' : 'transparent', padding: '10px', borderRadius: '4px' }} onClick={() => { setActiveChat(friend); fetchMessages(friend.schoolId); }}>
            <List.Item.Meta avatar={<Avatar src={friend.photoUrl} icon={<UserOutlined />} />} title={`${friend.firstName} ${friend.lastName}`} description={friend.schoolId} />
          </List.Item>
        )} />
      </Col>

      <Col span={16} style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingLeft: '10px' }}>
        {activeChat ? (
          <>
            <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', borderRadius: '4px 4px 0 0' }}>
              <Title level={5} style={{ margin: 0 }}>Chat with {activeChat.firstName} {activeChat.lastName}</Title>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(msg => {
                const isMe = msg.sender === currentUser.schoolId;
                return (
                  <div key={msg._id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', background: isMe ? '#1890ff' : '#f0f0f0', color: isMe ? '#fff' : '#000', padding: '10px 15px', borderRadius: '15px' }}>
                    {msg.content}
                    <div style={{ fontSize: '10px', marginTop: '5px', textAlign: 'right', opacity: 0.7 }}>{new Date(msg.createdAt).toLocaleTimeString()}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #f0f0f0' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onPressEnter={handleSendMessage} placeholder="Type a message..." />
                <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage}>Send</Button>
              </Space.Compact>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#ccc' }}>
            <Title level={4} type="secondary">Select a friend to start chatting</Title>
          </div>
        )}
      </Col>
    </Row>
  );
}