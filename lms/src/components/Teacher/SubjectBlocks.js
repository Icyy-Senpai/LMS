import React from 'react';
import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, RightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SubjectBlocks({ course, onOpenBlock, onBack }) {
  const blocks = course.blocks || [];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16 }}>Back</Button>
      <Card style={{ marginBottom: 20, borderTop: `4px solid ${course.color || '#c62828'}` }}>
        <Text type="secondary" strong>{course.code}</Text>
        <Title level={4} style={{ margin: '4px 0' }}>{course.name}</Title>
        <Space wrap>
          {course.targetProgram && <Tag>{course.targetProgram}</Tag>}
          {course.targetYear && <Tag color="red">{course.targetYear}</Tag>}
          <Tag color="blue">{blocks.length} block{blocks.length === 1 ? '' : 's'}</Tag>
        </Space>
      </Card>

      <Title level={5} style={{ marginBottom: 12 }}>Blocks you handle for {course.code}</Title>
      {blocks.length === 0 ? (
        <Empty description={`You are not assigned to teach ${course.code} in any block yet. A Dean assigns professors to blocks.`} />
      ) : (
        <Row gutter={[16, 16]}>
          {blocks.map(b => (
            <Col xs={24} sm={12} md={8} xl={6} key={b.code}>
              <Card hoverable onClick={() => onOpenBlock(b)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <Title level={4} style={{ margin: 0 }}>{b.code}</Title>
                    <Text type="secondary" ellipsis style={{ display: 'block' }}>{b.name}</Text>
                  </div>
                  <RightOutlined style={{ color: '#bfbfbf' }} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <Tag icon={<TeamOutlined />}>{b.maxAmountOfStudents ? `${b.studentCount} / ${b.maxAmountOfStudents}` : b.studentCount} students</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
