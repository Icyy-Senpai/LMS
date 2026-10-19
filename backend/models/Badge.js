const mongoose = require('mongoose');

const BADGE_SHAPES = ['circle', 'square', 'hexagon', 'octagon', 'diamond', 'shield', 'star', 'heart'];

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  photoUrl: { type: String, required: true, default: '' },
  shape: { type: String, enum: BADGE_SHAPES, default: 'circle' },
  course: { type: String, required: true },
  block: { type: String, required: true },
  department: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdByName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  studentsWithBadge: [{
    name: { type: String, required: true },
    schoolId: { type: String, required: true },
    department: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
    awardedBy: { type: String, default: '' }
  }]
});

badgeSchema.index({ course: 1, block: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
module.exports.BADGE_SHAPES = BADGE_SHAPES;
