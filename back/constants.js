
// pos-backend/constants.js

// These UUIDs will be used to identify the special 'Uncategorized' category
// and 'Unknown Manufacturer' in the database.
// Ensure these UUIDs are used when seeding these records into your DB.
// The server.js startup script will attempt to seed these if they don't exist.

const UNCATEGORIZED_ID_UUID = 'cat_uncategorized_00000000-0000-0000-0000-000000000000';
const UNKNOWN_MANUFACTURER_ID_UUID = 'man_unknown_00000000-0000-0000-0000-000000000000';

module.exports = {
  UNCATEGORIZED_ID_UUID,
  UNKNOWN_MANUFACTURER_ID_UUID,
};
