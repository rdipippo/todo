-- Todo App Database Schema
-- MySQL 8.0+

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS todo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE todo;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_category (user_id, name),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT DEFAULT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT DEFAULT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_completed (user_id, completed),
  INDEX idx_due_date (user_id, due_date),
  INDEX idx_priority (user_id, priority)
) ENGINE=InnoDB;

-- Cleanup procedure for expired tokens (optional - can be run via cron)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_expired_tokens()
BEGIN
  DELETE FROM email_verification_tokens WHERE expires_at < NOW();
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
END //
DELIMITER ;
