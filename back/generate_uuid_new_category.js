const { v4: uuidv4 } = require('uuid');
require('fs').writeFileSync('uuid_new_category.txt', uuidv4());