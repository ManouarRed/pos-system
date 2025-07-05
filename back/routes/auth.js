
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }
  if (!JWT_SECRET) {
    console.error("JWT_SECRET not configured on server for /login route.");
    return res.status(500).json({ message: "Authentication system configuration error." });
  }

  try {
    const [rows] = await pool.execute('SELECT user_id, uuid, username, hashedPassword, role, permissions FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];
    let userPermissions = {};
    if (user.permissions) {
        try {
            userPermissions = JSON.parse(user.permissions);
        } catch (e) {
            console.error(`Failed to parse permissions for user ${user.username} during login:`, e);
            userPermissions = {};
        }
    }


    if (await bcrypt.compare(password, user.hashedPassword)) {
      const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, {
        expiresIn: '1d', 
      });

      res.json({
        token,
        user: {
          id: user.uuid, 
          username: user.username,
          role: user.role,
          permissions: userPermissions,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me (Protected Route)
router.get('/me', protect, async (req, res) => {
  if (req.user) {
    // req.user already has permissions parsed by 'protect' middleware
    const { db_id, ...userForClient } = req.user;
    res.json(userForClient);
  } else {
    res.status(404).json({ message: 'User not found or token invalid after middleware pass.' });
  }
});

module.exports = router;