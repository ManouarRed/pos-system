
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // MySQL connection pool

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file. Authentication will not work.");
}

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const [rows] = await pool.execute('SELECT user_id, uuid, username, role, permissions FROM users WHERE user_id = ?', [decoded.id]);
      
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      let userPermissions = {};
      if (rows[0].permissions) {
        try {
          userPermissions = JSON.parse(rows[0].permissions);
        } catch (e) {
          console.error(`Failed to parse permissions for user ${rows[0].username}:`, e);
          userPermissions = {}; // Default to empty if parsing fails
        }
      }

      req.user = {
        id: rows[0].uuid, // Use public uuid for req.user.id
        db_id: rows[0].user_id, // Internal DB id
        username: rows[0].username,
        role: rows[0].role,
        permissions: userPermissions, // Attach parsed permissions
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
};

module.exports = { protect, isAdmin };