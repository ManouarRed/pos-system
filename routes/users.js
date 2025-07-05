
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users (Admin only)
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const [usersRows] = await pool.query("SELECT uuid as id, username, role, permissions, created_at, updated_at FROM users ORDER BY username");
    const users = usersRows.map(user => {
        let parsedPermissions = {};
        if (user.permissions) {
            try {
                parsedPermissions = JSON.parse(user.permissions);
            } catch (e) {
                console.error(`Failed to parse permissions for user ${user.username}:`, e);
            }
        }
        return { ...user, permissions: parsedPermissions };
    });
    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
});

// POST /api/users (Admin only - Add new user)
router.post('/', protect, isAdmin, async (req, res) => {
  const { username, password, role, permissions } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password, and role are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }
  if (!['admin', 'employee'].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'employee'." });
  }
  const userUuid = generateId('user_');

  // Default permissions for employees if not provided or if role is admin
  let permissionsToStore = null;
  if (role === 'employee') {
    permissionsToStore = JSON.stringify({
        editProducts: permissions?.editProducts || false,
        accessInventory: permissions?.accessInventory || false,
        viewFullSalesHistory: permissions?.viewFullSalesHistory || false,
    });
  }


  try {
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Username "${username}" already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.execute(
      'INSERT INTO users (uuid, username, hashedPassword, role, permissions) VALUES (?, ?, ?, ?, ?)',
      [userUuid, username, hashedPassword, role, permissionsToStore]
    );
    
    res.status(201).json({ 
        id: userUuid, 
        username, 
        role, 
        permissions: role === 'employee' ? JSON.parse(permissionsToStore) : {} 
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Failed to add user: " + error.message });
  }
});

// PUT /api/users/:uuid (Admin only - Update user)
router.put('/:uuid', protect, isAdmin, async (req, res) => {
  const userUuidToUpdate = req.params.uuid;
  const { username, password, role, permissions } = req.body; // `permissions` is req.body.permissions


  if (!username && !password && !role && permissions === undefined) {
      return res.status(400).json({ message: "No update data provided." });
  }

  try {
    const [userRows] = await pool.execute('SELECT user_id, username, role, permissions as currentPermissions FROM users WHERE uuid = ?', [userUuidToUpdate]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const userToUpdate = userRows[0];
    const currentDbId = userToUpdate.user_id;

    const updateFields = {};

    if (username && username !== userToUpdate.username) {
      const [existing] = await pool.execute('SELECT user_id FROM users WHERE username = ? AND uuid != ?', [username, userUuidToUpdate]);
      if (existing.length > 0) {
        return res.status(400).json({ message: `Username "${username}" already exists.` });
      }
      updateFields.username = username;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long." });
      }
      const salt = await bcrypt.genSalt(10);
      updateFields.hashedPassword = await bcrypt.hash(password, salt);
    }
    
    let finalRole = userToUpdate.role;
    if (role) {
      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ message: "Invalid role." });
      }
      if (req.user.id === userUuidToUpdate && userToUpdate.role === 'admin' && role === 'employee') {
        const [adminCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        if (adminCount[0].count === 1) {
          return res.status(400).json({ message: "Cannot change role. You are the only admin." });
        }
      }
      updateFields.role = role;
      finalRole = role; // Update finalRole for permission logic
    }
    
    // This is the critical part for saving permissions
    if (finalRole === 'employee' && permissions !== undefined) {
        updateFields.permissions = JSON.stringify({
            editProducts: permissions?.editProducts || false,
            accessInventory: permissions?.accessInventory || false,
            viewFullSalesHistory: permissions?.viewFullSalesHistory || false,
        });
    } else if (finalRole === 'admin') {
        updateFields.permissions = null; // Admins don't use explicit permission flags
    }


    if (Object.keys(updateFields).length === 0) {
        // If only permissions might have changed but no other fields, updateFields might be empty
        // This case needs to ensure permissions are still processed if they were the only change intended.
        // However, the current logic only adds to updateFields if permissions *is not undefined* and role is employee.
        // If permissions object itself didn't change (e.g. from {} to {}), this block might be hit.
        // For now, if no actual field values changed, we can return the current user state.
        console.log(`[User Update /api/users/${userUuidToUpdate}] No direct field changes detected in updateFields object. Returning current user data.`);
        let currentParsedPermissions = {};
        if (userToUpdate.currentPermissions) {
            try { currentParsedPermissions = JSON.parse(userToUpdate.currentPermissions); } catch (e) {}
        }
        return res.status(200).json({ 
            id: userUuidToUpdate, 
            username: userToUpdate.username, 
            role: userToUpdate.role, // Use existing role if not changed
            permissions: userToUpdate.role === 'employee' ? currentParsedPermissions : {}
        });
    }
    
    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateFields), currentDbId];
    
    console.log(`[User Update /api/users/${userUuidToUpdate}] Executing SQL: UPDATE users SET ${setClauses}, updated_at = NOW() WHERE user_id = ? with values:`, values);
    await pool.execute(`UPDATE users SET ${setClauses}, updated_at = NOW() WHERE user_id = ?`, values);
    
    let updatedPermissionsResponse = {};
    if (updateFields.permissions) { // If permissions were part of the update
        try { updatedPermissionsResponse = JSON.parse(updateFields.permissions); } catch(e) {}
    } else if (userToUpdate.currentPermissions && finalRole === 'employee') { // If not updated, but role is still employee, use existing
        try { updatedPermissionsResponse = JSON.parse(userToUpdate.currentPermissions); } catch(e) {}
    }


    res.json({ 
        id: userUuidToUpdate, 
        username: updateFields.username || userToUpdate.username, 
        role: finalRole,
        permissions: finalRole === 'employee' ? updatedPermissionsResponse : {}
    });

  } catch (error) {
    console.error(`[User Update /api/users/${userUuidToUpdate}] Error updating user:`, error);
    res.status(500).json({ message: "Failed to update user: " + error.message });
  }
});

// DELETE /api/users/:uuid (Admin only - Delete user)
router.delete('/:uuid', protect, isAdmin, async (req, res) => {
  const userUuidToDelete = req.params.uuid;

  if (req.user.id === userUuidToDelete) { 
    return res.status(400).json({ success: false, message: "You cannot delete your own account." });
  }

  try {
    const [result] = await pool.execute('DELETE FROM users WHERE uuid = ?', [userUuidToDelete]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: "User deleted successfully." });
    } else {
      res.status(404).json({ success: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Failed to delete user: " + error.message });
  }
});

module.exports = router;
