

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
fs.mkdir(BACKUP_DIR, { recursive: true }).catch(console.error);

// Helper to fetch all data from a table
async function fetchTableData(tableName) {
    const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
    return rows;
}

// Helper to clear and insert data into a table
async function restoreTableData(tableName, data, connection) {
    await connection.query(`DELETE FROM ${tableName}`);
    if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const values = data.map(row => columns.map(col => row[col]));
        await connection.query(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`, values);
    }
}

// @route   GET /api/data/backup
// @desc    Create a new database backup
// @access  Private (Admin only)
router.post('/backup', auth.protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    try {
        const backupData = {};
        backupData.categories = await fetchTableData('categories');
        backupData.manufacturers = await fetchTableData('manufacturers');
        backupData.products = await fetchTableData('products');
        backupData.users = await fetchTableData('users'); // Exclude sensitive user data if necessary
        backupData.sales = await fetchTableData('sales');
        backupData.sale_items = await fetchTableData('sale_items');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `pos_backup_${timestamp}.json`;
        const filePath = path.join(BACKUP_DIR, filename);

        await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

        res.status(200).json({ message: 'Backup created successfully', filename });
    } catch (error) {
        console.error('Backup failed:', error);
        res.status(500).json({ message: 'Backup failed', error: error.message });
    }
});

// @route   GET /api/data/backups
// @desc    List all available backups
// @access  Private (Admin only)
router.get('/backups', auth.protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = files.filter(file => file.startsWith('pos_backup_') && file.endsWith('.json'))
                               .sort((a, b) => b.localeCompare(a)); // Sort by date (newest first)
        res.status(200).json(backupFiles);
    } catch (error) {
        console.error('Failed to list backups:', error);
        res.status(500).json({ message: 'Failed to list backups', error: error.message });
    }
});

// @route   POST /api/data/restore
// @desc    Restore database from a backup file
// @access  Private (Admin only)
router.post('/restore', auth.protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ message: 'Backup filename is required.' });
    }

    const filePath = path.join(BACKUP_DIR, filename);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        const backupData = JSON.parse(data);

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Restore order matters due to foreign key constraints
            await restoreTableData('sale_items', backupData.sale_items, connection);
            await restoreTableData('sales', backupData.sales, connection);
            await restoreTableData('products', backupData.products, connection);
            await restoreTableData('categories', backupData.categories, connection);
            await restoreTableData('manufacturers', backupData.manufacturers, connection);
            await restoreTableData('users', backupData.users, connection);

            await connection.commit();
            res.status(200).json({ message: `Database restored successfully from ${filename}` });
        } catch (transactionError) {
            await connection.rollback();
            console.error('Database restore transaction failed:', transactionError);
            res.status(500).json({ message: 'Database restore failed during transaction', error: transactionError.message });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Restore failed:', error);
        res.status(500).json({ message: 'Restore failed', error: error.message });
    }
});

module.exports = router;
