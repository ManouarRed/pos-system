
const { v4: uuidv4 } = require('uuid');

// Generate a unique ID with a prefix
const generateId = (prefix = 'id_') => {
  return `${prefix}${uuidv4()}`;
};

module.exports = {
  generateId,
};
