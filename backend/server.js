const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const forumRoutes = require('./routes/forumRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const socialRoutes = require('./routes/socialRoutes');
const adminRoutes = require('./routes/adminRoutes'); // New

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect('mongodb://127.0.0.1:27017/lms_project')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', userRoutes);
app.use('/api', courseRoutes);
app.use('/api', forumRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', quizRoutes);
app.use('/api', socialRoutes);
app.use('/api', adminRoutes);

app.listen(5000, () => console.log('Backend running on port 5000'));