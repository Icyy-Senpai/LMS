const mongoose = require('mongoose');

const STALE = { teachers: ['password_1'], students: ['password_1'], users: ['password_1'] };

const dropStaleIndexes = async () => {
  const db = mongoose.connection.db;
  for (const [collection, names] of Object.entries(STALE)) {
    try {
      const existing = await db.collection(collection).indexes();
      for (const name of names) {
        if (existing.some(i => i.name === name)) {
          await db.collection(collection).dropIndex(name);
          console.log(`Dropped stale index ${collection}.${name}`);
        }
      }
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') console.error(`Could not check indexes of ${collection}:`, err.message);
    }
  }
};

module.exports = { dropStaleIndexes };
