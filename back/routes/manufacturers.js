
const express = require('express');
const pool = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { UNKNOWN_MANUFACTURER_ID_UUID } = require('../constants');

const router = express.Router();

// GET /api/manufacturers (Public)
router.get('/', async (req, res) => {
  try {
    const [manufacturers] = await pool.query('SELECT uuid as id, name FROM manufacturers ORDER BY name');
    res.json(manufacturers);
  } catch (error) {
    console.error("Failed to fetch manufacturers:", error);
    res.status(500).json({ message: "Failed to fetch manufacturers: " + error.message });
  }
});

// POST /api/manufacturers (Admin only - Find or Create by Name)
router.post('/', protect, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: "Manufacturer name is required and must be a non-empty string." });
  }
  const trimmedName = name.trim();
  let connection;

  try {
    connection = await pool.getConnection();
    // Check if manufacturer already exists by name
    const [existing] = await connection.execute('SELECT uuid, name FROM manufacturers WHERE name = ?', [trimmedName]);
    if (existing.length > 0) {
      // If it exists, return its UUID and name
      return res.status(200).json({ id: existing[0].uuid, name: existing[0].name, message: "Manufacturer already exists." });
    }

    // If not, create a new manufacturer
    const newUuid = generateId('man_');
    await connection.execute('INSERT INTO manufacturers (uuid, name) VALUES (?, ?)', [newUuid, trimmedName]);
    res.status(201).json({ id: newUuid, name: trimmedName, message: "Manufacturer created successfully." });
  } catch (error) {
    console.error("Failed to find or add manufacturer:", error);
    res.status(500).json({ message: "Failed to find or add manufacturer: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/manufacturers/:uuid (Admin only)
router.put('/:uuid', protect, isAdmin, async (req, res) => {
  const manufacturerUuid = req.params.uuid;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: "Manufacturer name is required and must be a non-empty string." });
  }
  if (manufacturerUuid === UNKNOWN_MANUFACTURER_ID_UUID) {
    return res.status(400).json({ message: "The 'Unknown Manufacturer' cannot be modified."});
  }
  const trimmedName = name.trim();

  try {
    const [existingByName] = await pool.execute(
        'SELECT manufacturer_id FROM manufacturers WHERE name = ? AND uuid != ?', 
        [trimmedName, manufacturerUuid]
    );
    if (existingByName.length > 0) {
      return res.status(400).json({ message: `Manufacturer name "${trimmedName}" already exists.` });
    }

    const [result] = await pool.execute(
      'UPDATE manufacturers SET name = ? WHERE uuid = ?',
      [trimmedName, manufacturerUuid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Manufacturer not found" });
    }
    res.json({ id: manufacturerUuid, name: trimmedName });
  } catch (error) {
    console.error("Failed to update manufacturer:", error);
    res.status(500).json({ message: "Failed to update manufacturer: " + error.message });
  }
});

// DELETE /api/manufacturers/:uuid (Admin only)
router.delete('/:uuid', protect, isAdmin, async (req, res) => {
  const manufacturerUuidToDelete = req.params.uuid;

  if (manufacturerUuidToDelete === UNKNOWN_MANUFACTURER_ID_UUID) {
    return res.status(400).json({ success: false, message: "The 'Unknown Manufacturer' cannot be deleted." });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [manufacturerRow] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [manufacturerUuidToDelete]);
    if (manufacturerRow.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Manufacturer not found.' });
    }
    const manufacturerIdToDelete = manufacturerRow[0].manufacturer_id;

    const [unknownManRow] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [UNKNOWN_MANUFACTURER_ID_UUID]);
    if (unknownManRow.length === 0) {
        await connection.rollback();
        return res.status(500).json({ success: false, message: "Fallback 'Unknown Manufacturer' missing. Deletion aborted." });
    }
    const unknownManDbId = unknownManRow[0].manufacturer_id;

    await connection.execute(
      'UPDATE products SET manufacturer_id = ? WHERE manufacturer_id = ?',
      [unknownManDbId, manufacturerIdToDelete]
    );

    const [deleteResult] = await connection.execute('DELETE FROM manufacturers WHERE manufacturer_id = ?', [manufacturerIdToDelete]);
    
    if (deleteResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Manufacturer not found during deletion.' });
    }
    
    await connection.commit();
    res.status(200).json({ success: true, message: 'Manufacturer deleted successfully. Associated products reassigned.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Failed to delete manufacturer:", error);
    res.status(500).json({ success: false, message: "Failed to delete manufacturer: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
