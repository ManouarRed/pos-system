
const express = require('express');
const pool = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to fetch product sizes
async function getProductSizes(connection, productId) {
    const [sizes] = await connection.execute('SELECT size_name as size, stock FROM product_sizes WHERE product_id = ?', [productId]);
    return sizes;
}

// Helper to enrich product data with category name, manufacturer name, and sizes
async function enrichProductData(connection, productRow) {
    if (!productRow) return null;

    const [categoryRows] = await connection.execute('SELECT name FROM categories WHERE category_id = ?', [productRow.category_id]);
    const [manufacturerRows] = await connection.execute('SELECT name FROM manufacturers WHERE manufacturer_id = ?', [productRow.manufacturer_id]);
    
    const sizes = await getProductSizes(connection, productRow.product_id);
    const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);

    return {
        id: productRow.uuid, // Public ID
        title: productRow.title,
        code: productRow.code,
        price: parseFloat(productRow.price),
        image: productRow.image ? `${process.env.API_BASE_URL || 'http://localhost:3001'}${productRow.image}` : '',
        fullSizeImage: productRow.full_size_image ? `${process.env.API_BASE_URL || 'http://localhost:3001'}${productRow.full_size_image}` : '',
        categoryId: productRow.category_uuid, // Send category public UUID
        manufacturerId: productRow.manufacturer_uuid, // Send manufacturer public UUID
        categoryName: categoryRows.length > 0 ? categoryRows[0].name : 'N/A',
        manufacturerName: manufacturerRows.length > 0 ? manufacturerRows[0].name : 'N/A',
        sizes,
        totalStock,
        isVisible: productRow.isVisible === 1, // Convert TINYINT(1) to boolean
    };
}


// GET /api/products (Public - for POS)
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        let query = `
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible, 
                   p.category_id, p.manufacturer_id, 
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.isVisible = TRUE
        `;
        const queryParams = [];

        const { q, categoryId: categoryUuid } = req.query; // categoryId from frontend is a UUID

        if (q) {
            const searchKeywords = q.split(' ').filter(Boolean); // Split by space and remove empty strings
            if (searchKeywords.length > 0) {
                const keywordClauses = searchKeywords.map(keyword => '(p.title LIKE ? OR p.code LIKE ?)');
                query += ' AND (' + keywordClauses.join(' AND ') + ')';
                searchKeywords.forEach(keyword => {
                    queryParams.push(`%${keyword}%`, `%${keyword}%`);
                });
            }
        }
        if (categoryUuid && categoryUuid !== "All Categories") {
            query += ' AND cat.uuid = ?';
            queryParams.push(categoryUuid);
        }
        query += ' ORDER BY p.title';

        const [productsRows] = await connection.execute(query, queryParams);
        const enrichedProducts = await Promise.all(productsRows.map(p => enrichProductData(connection, p)));
        res.json(enrichedProducts);
    } catch (error) {
        console.error("Failed to fetch products:", error);
        res.status(500).json({ message: "Failed to fetch products: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/products/admin (Admin or Employee with editProducts permission - PAGINATED)
router.get('/admin', protect, async (req, res) => {
    const user = req.user;
    const isEmployeeWithEditProductPermission = user.role === 'employee' && user.permissions && user.permissions.editProducts === true;

    if (user.role !== 'admin' && !isEmployeeWithEditProductPermission) {
        return res.status(403).json({ message: 'Forbidden: Admin access or product editing permission required.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;

        const { searchTerm, categoryId: categoryUuid, manufacturerId: manufacturerUuid, sortKey, sortDirection } = req.query;

        let whereClauses = [];
        const queryParams = [];

        if (searchTerm) {
            whereClauses.push('(p.title LIKE ? OR p.code LIKE ?)');
            queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
        }
        if (categoryUuid && categoryUuid !== "ALL") {
            whereClauses.push('cat.uuid = ?');
            queryParams.push(categoryUuid);
        }
        if (manufacturerUuid && manufacturerUuid !== "ALL") {
            whereClauses.push('man.uuid = ?');
            queryParams.push(manufacturerUuid);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countQuery = `
            SELECT COUNT(DISTINCT p.product_id) as total
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            ${whereSql}
        `;
        const [totalRows] = await connection.execute(countQuery, queryParams);
        const totalItems = totalRows[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        let orderBySql = 'ORDER BY p.title ASC'; 
        if (sortKey) {
            const validSortKeys = { title: 'p.title', price: 'p.price', totalStock: 'totalStockValue' };
            const dbSortKey = validSortKeys[sortKey];
            const direction = sortDirection === 'descending' ? 'DESC' : 'ASC';
            if (dbSortKey) {
                if (sortKey === 'totalStock') {
                     orderBySql = `ORDER BY (SELECT SUM(ps.stock) FROM product_sizes ps WHERE ps.product_id = p.product_id) ${direction}`;
                } else {
                    orderBySql = `ORDER BY ${dbSortKey} ${direction}`;
                }
            }
        }
        
        const productsQuery = `
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            ${whereSql}
            ${orderBySql}
            LIMIT ? OFFSET ?
        `;
        const finalQueryParams = [...queryParams, limit, offset];
        const [productsRows] = await connection.execute(productsQuery, finalQueryParams);
        
        const enrichedProducts = await Promise.all(productsRows.map(p => enrichProductData(connection, p)));

        res.json({
            items: enrichedProducts,
            totalItems,
            totalPages,
            currentPage: page,
            limit
        });

    } catch (error) {
        console.error("Failed to fetch admin products:", error);
        res.status(500).json({ message: "Failed to fetch admin products: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});


// GET /api/products/details-for-reporting (Protected - for sales/analytics enrichment)
router.get('/details-for-reporting', protect, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        // Fetch all necessary fields for enrichProductData, including p.category_id and p.manufacturer_id for lookups
        const [productsRows] = await connection.execute(`
            SELECT 
                p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible, 
                p.category_id, cat.uuid as category_uuid, 
                p.manufacturer_id, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            ORDER BY p.title
        `);
        
        const enrichedProducts = await Promise.all(productsRows.map(p => enrichProductData(connection, p)));
        // enrichProductData already adds sizes, totalStock, categoryName, manufacturerName
        res.json(enrichedProducts);

    } catch (error) {
        console.error("Failed to fetch products for reporting:", error);
        res.status(500).json({ message: "Failed to fetch products for reporting: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});


// GET /api/products/:uuid (Public)
router.get('/:uuid', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [productRows] = await connection.execute(`
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.uuid = ?
        `, [req.params.uuid]);

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const enrichedProduct = await enrichProductData(connection, productRows[0]);
        res.json(enrichedProduct);
    } catch (error) {
        console.error("Failed to fetch product by UUID:", error);
        res.status(500).json({ message: "Failed to fetch product by UUID: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});


// POST /api/products (Admin only)
router.post('/', protect, isAdmin, async (req, res) => {
    const { title, code, price, categoryId: categoryUuid, manufacturerId: manufacturerUuid, sizes, image, fullSizeImage, isVisible } = req.body;
    
    console.log("DEBUG: Product import request body - categoryId:", categoryUuid, "manufacturerId:", manufacturerUuid);

    if (!title || !code || price == null || !categoryUuid || !manufacturerUuid || !sizes || image === undefined) {
        return res.status(400).json({ message: "Missing required product fields." });
    }

    let parsedSizes;
    try {
        parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        if (!Array.isArray(parsedSizes) || !parsedSizes.every(s => typeof s.size === 'string' && typeof s.stock === 'number' && s.stock >= 0)) {
            throw new Error();
        }
    } catch (e) {
        return res.status(400).json({ message: "Sizes must be a valid JSON array of {size: string, stock: number (>=0)}." });
    }
    
    const newProductUuid = generateId('prod_');
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingCode] = await connection.execute('SELECT product_id FROM products WHERE code = ?', [code.trim()]);
        if (existingCode.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Product code "${code.trim()}" already exists.` });
        }

        console.log("DEBUG: Querying category with UUID:", categoryUuid);
        const [catRow] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [categoryUuid]);
        console.log("DEBUG: Category query result:", catRow);
        const [manRow] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [manufacturerUuid]);

        if (catRow.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Invalid Category ID." });
        }
        if (manRow.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Invalid Manufacturer ID." });
        }
        const dbCategoryId = catRow[0].category_id;
        const dbManufacturerId = manRow[0].manufacturer_id;

        const [result] = await connection.execute(
            'INSERT INTO products (uuid, title, code, price, category_id, manufacturer_id, image, full_size_image, isVisible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newProductUuid, title.trim(), code.trim(), parseFloat(price), dbCategoryId, dbManufacturerId, image.trim(), fullSizeImage.trim(), isVisible !== undefined ? Boolean(isVisible) : true]
        );
        const newProductId = result.insertId;

        if (parsedSizes.length > 0) {
            const sizeValues = parsedSizes.map(s => [newProductId, s.size, s.stock]);
            await connection.query('INSERT INTO product_sizes (product_id, size_name, stock) VALUES ?', [sizeValues]);
        }

        await connection.commit();
        
        const [newProductRows] = await connection.execute(`
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.product_id = ?
        `, [newProductId]);
        const enrichedProduct = await enrichProductData(connection, newProductRows[0]);
        res.status(201).json(enrichedProduct);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to add product:", error);
        res.status(500).json({ message: "Failed to add product: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});


// PUT /api/products/:uuid (Admin only)
router.put('/:uuid', protect, isAdmin, async (req, res) => {
    const productUuid = req.params.uuid;
    const { title, code, price, categoryId: categoryUuid, manufacturerId: manufacturerUuid, sizes, image, fullSizeImage, isVisible } = req.body;
    
    let parsedSizes;
    if (sizes !== undefined) {
        try {
            parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
            if (!Array.isArray(parsedSizes) || !parsedSizes.every(s => typeof s.size === 'string' && typeof s.stock === 'number' && s.stock >= 0)) {
                throw new Error("Invalid sizes format.");
            }
        } catch (e) {
            return res.status(400).json({ message: "Invalid sizes format: " + e.message });
        }
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [productRows] = await connection.execute('SELECT product_id, category_id, manufacturer_id FROM products WHERE uuid = ?', [productUuid]);
        if (productRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Product not found" });
        }
        const productId = productRows[0].product_id;
        let currentCategoryId = productRows[0].category_id;
        let currentManufacturerId = productRows[0].manufacturer_id;

        if (code) {
            const [existingCode] = await connection.execute('SELECT product_id FROM products WHERE code = ? AND uuid != ?', [code.trim(), productUuid]);
            if (existingCode.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Product code "${code.trim()}" already exists.` });
            }
        }
        if (categoryUuid) {
            const [catRow] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [categoryUuid]);
            if (catRow.length === 0) { await connection.rollback(); return res.status(400).json({ message: "Invalid Category ID."});}
            currentCategoryId = catRow[0].category_id;
        }
        if (manufacturerUuid) {
            const [manRow] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [manufacturerUuid]);
            if (manRow.length === 0) { await connection.rollback(); return res.status(400).json({ message: "Invalid Manufacturer ID."});}
            currentManufacturerId = manRow[0].manufacturer_id;
        }

        const updateFields = {};
        if (title !== undefined) updateFields.title = title.trim();
        if (code !== undefined) updateFields.code = code.trim();
        if (price !== undefined) updateFields.price = parseFloat(price);
        if (categoryUuid !== undefined) updateFields.category_id = currentCategoryId;
        if (manufacturerUuid !== undefined) updateFields.manufacturer_id = currentManufacturerId;
        if (image !== undefined) updateFields.image = image.trim();
        if (fullSizeImage !== undefined) updateFields.full_size_image = fullSizeImage.trim();
        if (isVisible !== undefined) updateFields.isVisible = Boolean(isVisible);

        console.log("Backend: Product updateFields:", updateFields);
        if (Object.keys(updateFields).length > 0){
            const setClauses = Object.keys(updateFields).map(key => '`' + key + '` = ?').join(', ');
            const updateValues = Object.values(updateFields);
            await connection.execute(
                `UPDATE products SET ${setClauses} WHERE product_id = ?`,
                [...updateValues, productId]
            );
        }

        if (parsedSizes !== undefined) {
            await connection.execute('DELETE FROM product_sizes WHERE product_id = ?', [productId]);
            if (parsedSizes.length > 0) {
                const sizeValues = parsedSizes.map(s => [productId, s.size, s.stock]);
                await connection.query('INSERT INTO product_sizes (product_id, size_name, stock) VALUES ?', [sizeValues]);
            }
        }
        
        await connection.commit();

        const [updatedProductRows] = await connection.execute(`
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.product_id = ?
        `, [productId]);
        const enrichedProduct = await enrichProductData(connection, updatedProductRows[0]);
        res.json(enrichedProduct);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to update product:", error);
        res.status(500).json({ message: "Failed to update product: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});


// DELETE /api/products/bulk-delete (Admin only)
router.delete('/bulk-delete', protect, isAdmin, async (req, res) => {
    const { productIds } = req.body; // Expecting an array of product UUIDs
    console.log(`Attempting bulk delete for product UUIDs: ${productIds.join(', ')}`);
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No product IDs provided for bulk deletion.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Fetch internal product_ids from UUIDs
        const [productRows] = await connection.execute(
            `SELECT product_id FROM products WHERE uuid IN (${productIds.map(() => '?').join(',')})`,
            productIds
        );
        const internalProductIds = productRows.map(row => row.product_id);
        console.log(`Internal product IDs found for bulk deletion: ${internalProductIds.join(', ')}`);

        if (internalProductIds.length === 0) {
            console.warn(`No matching products found for bulk deletion for UUIDs: ${productIds.join(', ')}`);
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'No matching products found for deletion.' });
        }

        // Delete associated product sizes first
        await connection.execute(
            `DELETE FROM product_sizes WHERE product_id IN (${internalProductIds.map(() => '?').join(',')})`,
            internalProductIds
        );

        // Delete products
        await connection.execute(
            `DELETE FROM products WHERE product_id IN (${internalProductIds.map(() => '?').join(',')})`,
            internalProductIds
        );
        
        await connection.commit();
        res.json({ success: true, message: `${internalProductIds.length} products deleted successfully.` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to bulk delete products:", error);
        res.status(500).json({ success: false, message: "Failed to bulk delete products: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// DELETE /api/products/:uuid (Admin only)
router.delete('/:uuid', protect, isAdmin, async (req, res) => {
    const productUuid = req.params.uuid;
    console.log(`Attempting to delete product with UUID: ${productUuid}`);
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [productRows] = await connection.execute('SELECT product_id FROM products WHERE uuid = ?', [productUuid]);
        if (productRows.length === 0) {
            console.warn(`Product with UUID ${productUuid} not found for deletion.`);
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const productId = productRows[0].product_id;
        console.log(`Found product ID ${productId} for UUID ${productUuid}. Proceeding with deletion.`);

        await connection.execute('DELETE FROM products WHERE product_id = ?', [productId]);
        
        await connection.commit();
        console.log(`Successfully deleted product with UUID: ${productUuid}`);
        res.json({ success: true, message: 'Product deleted successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Failed to delete product with UUID ${productUuid}:`, error);
        res.status(500).json({ success: false, message: "Failed to delete product: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// PATCH /api/products/:uuid/toggle-visibility (Admin only)
router.patch('/:uuid/toggle-visibility', protect, isAdmin, async (req, res) => {
    const productUuid = req.params.uuid;
    let connection;
    try {
        connection = await pool.getConnection();
        const [productRows] = await connection.execute('SELECT product_id, isVisible FROM products WHERE uuid = ?', [productUuid]);
        if (productRows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        const productId = productRows[0].product_id;
        const newVisibility = !productRows[0].isVisible;

        await connection.execute('UPDATE products SET isVisible = ? WHERE product_id = ?', [newVisibility, productId]);
        
        const [updatedProductRows] = await connection.execute(`
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.product_id = ?
        `, [productId]);
        const enrichedProduct = await enrichProductData(connection, updatedProductRows[0]);
        res.json(enrichedProduct);

    } catch (error) {
        console.error("Failed to toggle product visibility:", error);
        res.status(500).json({ message: "Failed to toggle product visibility: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /api/products/:uuid/stock (Admin or POS)
router.put('/:uuid/stock', protect, async (req, res) => {
    const productUuid = req.params.uuid;
    const { sizeName, newStock, updatedSizesArray, action } = req.body;
    let connection;

    if (req.user.role === 'employee' && action !== 'sell' && !req.user.permissions?.accessInventory) {
        return res.status(403).json({ message: "Forbidden: Inventory access permission required to directly set stock." });
    }


    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [productRows] = await connection.execute('SELECT product_id FROM products WHERE uuid = ?', [productUuid]);
        if (productRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Product not found" });
        }
        const productId = productRows[0].product_id;

        if (updatedSizesArray && Array.isArray(updatedSizesArray)) {
            await connection.execute('DELETE FROM product_sizes WHERE product_id = ?', [productId]);
            if (updatedSizesArray.length > 0) {
                const sizeValues = updatedSizesArray.map(s => [productId, s.size, Math.max(0, Number(s.stock) || 0)]);
                await connection.query('INSERT INTO product_sizes (product_id, size_name, stock) VALUES ?', [sizeValues]);
            }
        } else if (sizeName !== undefined && newStock !== undefined && action === 'sell') {
            const quantitySold = Math.abs(Number(newStock)); 
             if(isNaN(quantitySold) || quantitySold <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: "For 'sell' action, newStock (quantitySold) must be a positive number."});
            }
            const [sizeRow] = await connection.execute(
                'SELECT stock FROM product_sizes WHERE product_id = ? AND size_name = ?',
                [productId, sizeName]
            );
            if (sizeRow.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Size "${sizeName}" not found for this product.` });
            }
            const currentStock = sizeRow[0].stock;
            if (currentStock < quantitySold) {
                 console.warn(`Stock issue during sale: Product ID ${productId}, Size ${sizeName}. Current: ${currentStock}, Sold: ${quantitySold}. Setting stock to 0.`);
                 await connection.execute(
                    'UPDATE product_sizes SET stock = 0 WHERE product_id = ? AND size_name = ?',
                    [productId, sizeName]
                );
            } else {
                 await connection.execute(
                    'UPDATE product_sizes SET stock = stock - ? WHERE product_id = ? AND size_name = ?',
                    [quantitySold, productId, sizeName]
                );
            }

        } else if (sizeName !== undefined && newStock !== undefined) {
            const stockValue = Math.max(0, Number(newStock));
            if (isNaN(stockValue)) {
                await connection.rollback();
                return res.status(400).json({ message: "New stock value must be a non-negative number." });
            }
            await connection.execute(
                'INSERT INTO product_sizes (product_id, size_name, stock) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock = VALUES(stock)',
                [productId, sizeName, stockValue]
            );
        } else {
            await connection.rollback();
            return res.status(400).json({ message: "Invalid stock update payload." });
        }

        await connection.commit();
        
        const [updatedProductRows] = await connection.execute(`
            SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.product_id = ?
        `, [productId]);
        const enrichedProduct = await enrichProductData(connection, updatedProductRows[0]);
        res.json(enrichedProduct);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to update product stock:", error);
        res.status(500).json({ message: "Failed to update product stock: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/products/:uuid/duplicate (Admin only)
router.post('/:uuid/duplicate', protect, isAdmin, async (req, res) => {
    const productUuidToDuplicate = req.params.uuid;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [originalProductRows] = await connection.execute(
            'SELECT * FROM products WHERE uuid = ?', [productUuidToDuplicate]
        );
        if (originalProductRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Original product not found" });
        }
        const originalProduct = originalProductRows[0];

        const newUuid = generateId('prod_');
        const newCode = `${originalProduct.code}_COPY_${Math.random().toString(36).substring(2, 6)}`;
        const newTitle = `${originalProduct.title} (Copy)`;

        const [result] = await connection.execute(
            'INSERT INTO products (uuid, title, code, price, category_id, manufacturer_id, image, full_size_image, isVisible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newUuid, newTitle, newCode, originalProduct.price, originalProduct.category_id, originalProduct.manufacturer_id, originalProduct.image, originalProduct.full_size_image, false]
        );
        const newProductId = result.insertId;

        const originalSizes = await getProductSizes(connection, originalProduct.product_id);
        if (originalSizes.length > 0) {
            const sizeValues = originalSizes.map(s => [newProductId, s.size, s.stock]);
            await connection.query('INSERT INTO product_sizes (product_id, size_name, stock) VALUES ?', [sizeValues]);
        }
        
        await connection.commit();

        const [newProductRows] = await connection.execute(`
             SELECT p.product_id, p.uuid, p.title, p.code, p.price, p.image, p.full_size_image, p.isVisible,
                   p.category_id, p.manufacturer_id,
                   cat.uuid as category_uuid, man.uuid as manufacturer_uuid
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.category_id
            LEFT JOIN manufacturers man ON p.manufacturer_id = man.manufacturer_id
            WHERE p.product_id = ?
        `, [newProductId]);
        const enrichedProduct = await enrichProductData(connection, newProductRows[0]);
        res.status(201).json(enrichedProduct);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to duplicate product:", error);
        res.status(500).json({ message: "Failed to duplicate product: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
