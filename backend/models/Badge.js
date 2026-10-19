const mongoose = require('mongoose');

const BADGE_SHAPES = ['circle', 'square', 'hexagon', 'octagon', 'diamond', 'shield', 'star', 'heart'];

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // The uploaded (or AI-generated) image, already cropped to `shape` by the browser (PNG data URL with a transparent background).
  photoUrl: { type: String, required: true, default: '' },
  shape: { type: String, enum: BADGE_SHAPES, default: 'circle' },
  course: { type: String, required: true },      // course code
  block: { type: String, required: true },
  department: { type: String, required: true },  // the course's target program
  createdBy: { type: String, required: true },   // schoolId of the teacher / dean who made it
  createdByName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  studentsWithBadge: [{
    name: { type: String, required: true },
    // NOT unique: a unique index here would be global across every badge, so a student could only ever hold one badge.
    // "Already awarded" is enforced per badge in badgeController.assignBadge instead.
    schoolId: { type: String, required: true },
    department: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
    awardedBy: { type: String, default: '' }
  }]
});

// Names only have to be unique within one course + block, so two courses can both have a "Perfect Attendance".
badgeSchema.index({ course: 1, block: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
module.exports.BADGE_SHAPES = BADGE_SHAPES;
