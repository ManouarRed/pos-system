-- Main Database Schema for React POS System

-- Disable foreign key checks temporarily to avoid issues with table creation order
SET FOREIGN_KEY_CHECKS=0;

-- Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Manufacturers Table
CREATE TABLE IF NOT EXISTS `manufacturers` (
  `manufacturer_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_manufacturer_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(255) NOT NULL UNIQUE,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `hashedPassword` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `id_user_uuid` (`uuid`),
  INDEX `id_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `product_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(255) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `price` DECIMAL(10, 2) NOT NULL,
  `image` TEXT,
  `full_size_image` TEXT,
  `category_id` INT,
  `manufacturer_id` INT,
  `isVisible` TINYINT(1) DEFAULT 1, -- 1 for true, 0 for false
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`manufacturer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_product_uuid` (`uuid`),
  INDEX `idx_product_code` (`code`),
  INDEX `idx_product_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Sizes Table (for stock per size)
CREATE TABLE IF NOT EXISTS `product_sizes` (
  `product_size_id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `size_name` VARCHAR(100) NOT NULL, -- e.g., "S", "M", "42", "128GB"
  `stock` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_product_size` (`product_id`, `size_name`),
  INDEX `idx_product_size_name` (`size_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Table
CREATE TABLE IF NOT EXISTS `sales` (
  `sale_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(255) NOT NULL UNIQUE,
  `user_id` INT, -- User who made the sale
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(100) NOT NULL,
  `notes` TEXT,
  `submission_date` DATETIME NOT NULL, -- Date and time the sale was submitted
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_sale_uuid` (`uuid`),
  INDEX `idx_sale_submission_date` (`submission_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sale Items Table (Junction table for products in a sale)
CREATE TABLE IF NOT EXISTS `sale_items` (
  `sale_item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT, -- Store the actual product_id at time of sale for potential FK integrity if product is not hard-deleted
  `product_uuid` VARCHAR(255), -- Denormalized: Public UUID of the product at time of sale
  `title` VARCHAR(255) NOT NULL, -- Denormalized: Product title at time of sale
  `code` VARCHAR(100) NOT NULL, -- Denormalized: Product code at time of sale
  `image` TEXT, -- Denormalized: Product image URL at time of sale
  `full_size_image` TEXT, -- Denormalized: Product full size image URL at time of sale
  `selected_size` VARCHAR(100), -- Denormalized: Selected size at time of sale
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL, -- Denormalized: Price per unit at time of sale
  `discount` DECIMAL(10, 2) DEFAULT 0.00, -- Discount for this item line
  `final_price` DECIMAL(10, 2) NOT NULL, -- (unit_price * quantity) - discount
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE SET NULL ON UPDATE CASCADE, -- SET NULL if product is deleted to keep sale history
  INDEX `idx_sale_item_product_uuid` (`product_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- Note on Denormalization in `sale_items`:
-- Storing product details like title, code, image, unit_price, and selected_size directly in `sale_items`
-- is a form of denormalization. This is often done in sales/order systems to ensure that
-- historical sale records accurately reflect the product details as they were *at the time of sale*,
-- even if the product's details (e.g., price, title) change later in the `products` table.
-- The `product_id` (FK to `products.product_id`) is kept for referential integrity and to potentially
-- link back to the current product, but the `product_uuid` is also stored as the definitive identifier
-- used by the frontend for that product at the time of sale.