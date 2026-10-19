const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const DEFAULTS = {
  Student: () => `${new Date().getFullYear()}-0000001`,
  Teacher: () => 'FACULTY-001'
};

const parse = (id) => {
  const m = /^(.*?)(\d+)$/.exec(String(id || '').trim());
  return m ? { prefix: m[1], digits: m[2] } : null;
};

const getNextSchoolId = async (accountType) => {
  const Model = accountType === 'Student' ? Student : accountType === 'Teacher' ? Teacher : null;
  if (!Model) throw new Error('School IDs are only generated for Student and Teacher accounts.');

  const rows = await Model.find({}, 'schoolId').lean();
  let best = null;
  for (const { schoolId } of rows) {
    const p = parse(schoolId);
    if (!p) continue;
    const n = BigInt(p.digits);
    if (!best || n > best.n) best = { ...p, n };
  }

  const make = (n) => (best ? `${best.prefix}${String(n).padStart(best.digits.length, '0')}` : null);
  let candidate = best ? make(best.n + 1n) : DEFAULTS[accountType]();
  let next = best ? best.n + 1n : null;

  while (await Student.exists({ schoolId: candidate }) || await Teacher.exists({ schoolId: candidate })) {
    if (next === null) { candidate = `${candidate}-1`; continue; }
    next += 1n;
    candidate = make(next);
  }
  return candidate;
};

module.exports = { getNextSchoolId };
