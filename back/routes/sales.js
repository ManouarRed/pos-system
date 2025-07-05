const express = require('express');
const pool = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper function to format sale object for response
const formatSaleForResponse = (saleRowFromDb, itemsFromDb) => {
    if (!saleRowFromDb) return null;
    return {
        id: saleRowFromDb.id,
        totalAmount: parseFloat(saleRowFromDb.total_amount),
        paymentMethod: saleRowFromDb.payment_method,
        notes: saleRowFromDb.notes,
        submissionDate: saleRowFromDb.submissionDate,
        submitted_by_username: saleRowFromDb.submitted_by_username,
        items: itemsFromDb.map(dbItem => ({
            productId: dbItem.product_uuid,
            title: dbItem.title,
            code: dbItem.code,
            image: dbItem.image,
            fullSizeImage: dbItem.full_size_image,
            selectedSize: dbItem.selected_size,
            quantity: parseInt(dbItem.quantity, 10),
            unitPrice: parseFloat(dbItem.unit_price),
            discount: parseFloat(dbItem.discount),
            finalPrice: parseFloat(dbItem.final_price)
        })),
    };
};


// GET /api/sales (Protected)
router.get('/', protect, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const currentUser = req.user;

        let salesQueryBase = `
            SELECT s.uuid as id, s.total_amount, s.payment_method, s.notes, s.submission_date as submissionDate, u.username as submitted_by_username, s.user_id
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.user_id
        `;
        const queryParams = [];

        if (currentUser.role === 'employee' && (!currentUser.permissions || !currentUser.permissions.viewFullSalesHistory)) {
            salesQueryBase += ' WHERE s.user_id = ?';
            queryParams.push(currentUser.db_id);
        }

        console.log("DEBUG: currentUser.role:", currentUser.role);
        console.log("DEBUG: currentUser.permissions.viewFullSalesHistory:", currentUser.permissions?.viewFullSalesHistory);
        console.log("DEBUG: currentUser.db_id:", currentUser.db_id);
        console.log("DEBUG: Final salesQueryBase:", salesQueryBase);
        console.log("DEBUG: Final queryParams:", queryParams);

        salesQueryBase += ' ORDER BY s.submission_date DESC';

        const [salesRows] = await connection.query(salesQueryBase, queryParams);

        const sales = await Promise.all(salesRows.map(async (saleRow) => {
            const [itemsRows] = await connection.execute(`
                SELECT product_uuid, title, code, image, full_size_image, selected_size, quantity, unit_price, discount, final_price
                FROM sale_items
                WHERE sale_id = (SELECT sale_id FROM sales WHERE uuid = ?)
            `, [saleRow.id]);
            return formatSaleForResponse(saleRow, itemsRows);
        }));
        res.json(sales);
    } catch (error) {
        console.error("Failed to fetch sales:", error);
        res.status(500).json({ message: "Failed to fetch sales: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/sales (Protected)
router.post('/', protect, async (req, res) => {
    const { items, totalAmount, paymentMethod, notes } = req.body;
    const userId = req.user.db_id;

    if (!items || !Array.isArray(items) || items.length === 0 || totalAmount == null || !paymentMethod) {
        return res.status(400).json({ message: "Missing required fields for sale." });
    }

    const saleUuid = generateId('sale_');
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [saleResult] = await connection.execute(
            'INSERT INTO sales (uuid, user_id, total_amount, payment_method, notes, submission_date) VALUES (?, ?, ?, ?, ?, NOW())',
            [saleUuid, userId, parseFloat(totalAmount), paymentMethod, notes || '']
        );
        const saleId = saleResult.insertId;

        for (const item of items) {
            console.log("Processing sale item:", item); // Debugging line
            let dbProductId = null;
            let productUuid = null;
            let itemTitle;
            let itemCode;
            let itemImage;
            let itemFullSizeImage;
            let itemSelectedSize;
            let itemQuantity;
            let itemUnitPrice;
            let itemDiscount;
            let itemFinalPrice;

            if (item.isManual === true) {
                dbProductId = null;
                productUuid = null;
                itemTitle = item.title || '';
                itemCode = item.code || '';
                itemImage = '';
                itemFullSizeImage = '';
                itemSelectedSize = item.selectedSize || 'N/A';
                itemQuantity = item.quantity || 0;
                itemUnitPrice = item.unitPrice || 0;
                itemDiscount = item.discount || 0;
                itemFinalPrice = (item.manualPrice || 0) * (item.quantity || 0) - (item.discount || 0);
            } else {
                const [productRow] = await connection.execute('SELECT product_id FROM products WHERE uuid = ?', [item.productId]);
                if (productRow.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({ message: `Product with UUID ${item.productId} not found.` });
                }
                dbProductId = productRow[0].product_id;
                productUuid = item.productId;
                itemTitle = item.title;
                itemCode = item.code;
                itemImage = item.image;
                itemFullSizeImage = item.fullSizeImage;
                itemSelectedSize = item.selectedSize;
                itemQuantity = item.quantity;
                itemUnitPrice = item.unitPrice;
                itemDiscount = item.discount;
                itemFinalPrice = item.finalPrice;

                if (item.selectedSize) {
                    const [sizeRow] = await connection.execute(
                        'SELECT stock FROM product_sizes WHERE product_id = ? AND size_name = ?',
                        [dbProductId, item.selectedSize]
                    );
                    if (sizeRow.length > 0 && sizeRow[0].stock >= item.quantity) {
                        await connection.execute(
                            'UPDATE product_sizes SET stock = stock - ? WHERE product_id = ? AND size_name = ?',
                            [item.quantity, dbProductId, item.selectedSize]
                        );
                    } else if (sizeRow.length > 0 && sizeRow[0].stock < item.quantity) {
                        await connection.rollback();
                        return res.status(400).json({ message: `Not enough stock for ${item.title} (Size: ${item.selectedSize}). Available: ${sizeRow[0].stock}, Requested: ${item.quantity}.` });
                    }
                }
            }

            await connection.execute(
                `INSERT INTO sale_items (sale_id, product_id, product_uuid, title, code, image, full_size_image, selected_size, quantity, unit_price, discount, final_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [saleId, dbProductId, productUuid, itemTitle, itemCode, itemImage, itemFullSizeImage, itemSelectedSize, itemQuantity, itemUnitPrice, itemDiscount, itemFinalPrice]
            );
        }

        await connection.commit();

        const [newSaleRows] = await connection.execute(`
            SELECT s.uuid as id, s.total_amount, s.payment_method, s.notes, s.submission_date as submissionDate, u.username as submitted_by_username
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.user_id
            WHERE s.sale_id = ?
        `, [saleId]);
        const [newItemsRows] = await connection.execute(
            'SELECT product_uuid as productId, title, code, image, full_size_image, selected_size, quantity, unit_price, discount, final_price FROM sale_items WHERE sale_id = ?',
            [saleId]
        );

        res.status(201).json(formatSaleForResponse(newSaleRows[0], newItemsRows));

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error submitting sale:", error);
        if (error.message.startsWith("Not enough stock for")) {
             return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to submit sale: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.put('/:uuid', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required to edit sales." });
    }

    const saleUuid = req.params.uuid;
    const { items, totalAmount, paymentMethod, notes } = req.body;

    if (!items || !Array.isArray(items) || totalAmount == null || !paymentMethod) {
        return res.status(400).json({ message: "Invalid sale data for update." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [saleRow] = await connection.execute('SELECT sale_id FROM sales WHERE uuid = ?', [saleUuid]);
        if (saleRow.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Sale not found" });
        }
        const saleId = saleRow[0].sale_id;

        await connection.execute(
            'UPDATE sales SET total_amount = ?, payment_method = ?, notes = ?, updated_at = NOW() WHERE sale_id = ?',
            [parseFloat(totalAmount), paymentMethod, notes || '', saleId]
        );

        await connection.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);

        for (const item of items) {
             const [productRow] = await connection.execute('SELECT product_id FROM products WHERE uuid = ?', [item.productId]);
             if (productRow.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Product with UUID ${item.productId} not found during sale update.` });
             }
             const dbProductId = productRow[0].product_id;
            await connection.execute(
                `INSERT INTO sale_items (sale_id, product_id, product_uuid, title, code, image, selected_size, quantity, unit_price, discount, final_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [saleId, dbProductId, item.productId, item.title, item.code, item.image, item.selectedSize, item.quantity, item.unitPrice, item.discount, item.finalPrice]
            );
        }

        await connection.commit();

        const [updatedSaleRows] = await connection.execute(`
            SELECT s.uuid as id, s.total_amount, s.payment_method, s.notes, s.submission_date as submissionDate, u.username as submitted_by_username
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.user_id
            WHERE s.sale_id = ?
        `, [saleId]);
        const [updatedItemsRows] = await connection.execute(
            'SELECT product_uuid as productId, title, code, image, selected_size, quantity, unit_price, discount, final_price FROM sale_items WHERE sale_id = ?',
            [saleId]
        );

        res.json(formatSaleForResponse(updatedSaleRows[0], updatedItemsRows));

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error updating sale:", error);
         if (error.message.startsWith("Product with UUID")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to update sale: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// DELETE /api/sales/bulk-delete (Protected, Admin only)
router.delete('/bulk-delete', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const { saleIds } = req.body;

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
        return res.status(400).json({ message: "No sale IDs provided for deletion." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const saleUuid of saleIds) {
            const [saleRow] = await connection.execute('SELECT sale_id FROM sales WHERE uuid = ?', [saleUuid]);
            if (saleRow.length === 0) {
                console.warn(`Sale with UUID ${saleUuid} not found for deletion.`);
                continue;
            }
            const saleId = saleRow[0].sale_id;

            await connection.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
            await connection.execute('DELETE FROM sales WHERE sale_id = ?', [saleId]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: `Successfully deleted ${saleIds.length} sale(s).` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error bulk deleting sales:", error);
        res.status(500).json({ message: "Failed to bulk delete sales: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;