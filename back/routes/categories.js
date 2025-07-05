
const express = require('express');
const pool = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { UNCATEGORIZED_ID_UUID } = require('../constants');

const router = express.Router();

// GET /api/categories (Public - PAGINATED)
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Default limit
    const offset = (page - 1) * limit;

    const [totalRows] = await connection.query('SELECT COUNT(*) as total FROM categories');
    const totalItems = totalRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [categoriesRows] = await connection.query(
      'SELECT uuid as id, name FROM categories ORDER BY name LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    res.json({
      items: categoriesRows,
      totalItems,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    res.status(500).json({ message: "Failed to fetch categories: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST /api/categories (Admin only - Find or Create by Name)
router.post('/', protect, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: "Category name is required and must be a non-empty string." });
  }
  const trimmedName = name.trim();
  let connection;

  try {
    connection = await pool.getConnection();
    // Check if category already exists by name
    const [existing] = await connection.execute('SELECT uuid, name FROM categories WHERE name = ?', [trimmedName]);
    if (existing.length > 0) {
      // If it exists, return its UUID and name
      return res.status(200).json({ id: existing[0].uuid, name: existing[0].name, message: "Category already exists." });
    }

    // If not, create a new category
    const newUuid = generateId('cat_');
    await connection.execute('INSERT INTO categories (uuid, name) VALUES (?, ?)', [newUuid, trimmedName]);
    res.status(201).json({ id: newUuid, name: trimmedName, message: "Category created successfully." });
  } catch (error) {
    console.error("Failed to find or add category:", error);
    res.status(500).json({ message: "Failed to find or add category: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/categories/:uuid (Admin only)
router.put('/:uuid', protect, isAdmin, async (req, res) => {
  const categoryUuid = req.params.uuid;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: "Category name is required and must be a non-empty string." });
  }
  if (categoryUuid === UNCATEGORIZED_ID_UUID) {
    return res.status(400).json({ message: "The 'Uncategorized' category cannot be modified."});
  }
  const trimmedName = name.trim();

  try {
    const [existingByName] = await pool.execute(
        'SELECT category_id FROM categories WHERE name = ? AND uuid != ?', 
        [trimmedName, categoryUuid]
    );
    if (existingByName.length > 0) {
      return res.status(400).json({ message: `Category name "${trimmedName}" already exists.` });
    }

    const [result] = await pool.execute(
      'UPDATE categories SET name = ? WHERE uuid = ?',
      [trimmedName, categoryUuid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ id: categoryUuid, name: trimmedName });
  } catch (error) {
    console.error("Failed to update category:", error);
    res.status(500).json({ message: "Failed to update category: " + error.message });
  }
});

// DELETE /api/categories/:uuid (Admin only)
router.delete('/:uuid', protect, isAdmin, async (req, res) => {
  const categoryUuidToDelete = req.params.uuid;

  if (categoryUuidToDelete === UNCATEGORIZED_ID_UUID) {
    return res.status(400).json({ success: false, message: "The 'Uncategorized' category cannot be deleted." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get the category_id for the UUID to delete
    const [categoryRow] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [categoryUuidToDelete]);
    if (categoryRow.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    const categoryIdToDelete = categoryRow[0].category_id;

    // Get the category_id for 'Uncategorized'
    const [uncategorizedRow] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [UNCATEGORIZED_ID_UUID]);
    if (uncategorizedRow.length === 0) {
        // This should not happen if seeding works
        await connection.rollback();
        return res.status(500).json({ success: false, message: "Fallback 'Uncategorized' category missing. Deletion aborted." });
    }
    const uncategorizedDbId = uncategorizedRow[0].category_id;

    // Update products associated with the deleted category
    await connection.execute(
      'UPDATE products SET category_id = ? WHERE category_id = ?',
      [uncategorizedDbId, categoryIdToDelete]
    );

    // Delete the category
    const [deleteResult] = await connection.execute('DELETE FROM categories WHERE category_id = ?', [categoryIdToDelete]);
    
    if (deleteResult.affectedRows === 0) {
      // Should have been caught by the find check, but good to have
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Category not found during deletion.' });
    }

    await connection.commit();
    res.status(200).json({ success: true, message: 'Category deleted successfully. Associated products reassigned.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Failed to delete category:", error);
    res.status(500).json({ success: false, message: "Failed to delete category: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
