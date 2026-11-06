-- CAOS Vintage · Esquema relacional SQLite (3FN)
-- Generado automáticamente por scripts/export_schema.py a partir de SQLAlchemy.
-- Uso: sqlite3 caos_vintage.db < database/schema.sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE categories (
	id INTEGER NOT NULL, 
	name VARCHAR(80) NOT NULL, 
	slug VARCHAR(100) NOT NULL, 
	description TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);
CREATE TABLE inventory_movements (
	id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	movement_type VARCHAR(20) NOT NULL, 
	quantity INTEGER NOT NULL, 
	reference VARCHAR(60), 
	notes TEXT, 
	created_by_id INTEGER, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_movements_quantity_positive CHECK (quantity > 0), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE RESTRICT, 
	CONSTRAINT ck_movement_type CHECK (movement_type IN ('entry', 'sale', 'return', 'adjustment')), 
	FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE TABLE password_reset_tokens (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	token_hash VARCHAR(128) NOT NULL, 
	expires_at DATETIME NOT NULL, 
	used_at DATETIME, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (token_hash)
);
CREATE TABLE price_suggestions (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	product_id INTEGER, 
	strategy VARCHAR(30) NOT NULL, 
	category_name VARCHAR(80) NOT NULL, 
	condition VARCHAR(20) NOT NULL, 
	brand VARCHAR(80), 
	purchase_cost NUMERIC(12, 2) NOT NULL, 
	suggested_price NUMERIC(12, 2) NOT NULL, 
	min_price NUMERIC(12, 2) NOT NULL, 
	max_price NUMERIC(12, 2) NOT NULL, 
	estimated_profit NUMERIC(12, 2) NOT NULL, 
	margin_percent NUMERIC(5, 2) NOT NULL, 
	confidence NUMERIC(5, 2) NOT NULL, 
	rationale TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE SET NULL, 
	CONSTRAINT ck_suggestion_condition CHECK (condition IN ('nuevo', 'excelente', 'muy_bueno', 'bueno', 'regular'))
);
CREATE TABLE product_styles (
	product_id INTEGER NOT NULL, 
	style_id INTEGER NOT NULL, 
	PRIMARY KEY (product_id, style_id), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
	FOREIGN KEY(style_id) REFERENCES styles (id) ON DELETE CASCADE
);
CREATE TABLE products (
	id INTEGER NOT NULL, 
	sku VARCHAR(40) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	category_id INTEGER NOT NULL, 
	brand VARCHAR(80), 
	size VARCHAR(20), 
	color VARCHAR(50), 
	condition VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	purchase_cost NUMERIC(12, 2) NOT NULL, 
	price NUMERIC(12, 2) NOT NULL, 
	image_url VARCHAR(500), 
	is_featured BOOLEAN NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_products_price_positive CHECK (price > 0), 
	CONSTRAINT ck_products_cost_non_negative CHECK (purchase_cost >= 0), 
	UNIQUE (sku), 
	FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE RESTRICT, 
	CONSTRAINT ck_product_condition CHECK (condition IN ('nuevo', 'excelente', 'muy_bueno', 'bueno', 'regular')), 
	CONSTRAINT ck_product_status CHECK (status IN ('available', 'sold', 'reserved', 'archived'))
);
CREATE TABLE sale_items (
	id INTEGER NOT NULL, 
	sale_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	product_name VARCHAR(160) NOT NULL, 
	quantity INTEGER NOT NULL, 
	unit_price NUMERIC(12, 2) NOT NULL, 
	unit_cost NUMERIC(12, 2) NOT NULL, 
	line_total NUMERIC(12, 2) NOT NULL, 
	line_profit NUMERIC(12, 2) NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_sale_items_sale_product UNIQUE (sale_id, product_id), 
	CONSTRAINT ck_sale_items_unique_unit CHECK (quantity = 1), 
	CONSTRAINT ck_sale_items_price_non_negative CHECK (unit_price >= 0), 
	CONSTRAINT ck_sale_items_cost_non_negative CHECK (unit_cost >= 0), 
	FOREIGN KEY(sale_id) REFERENCES sales (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE RESTRICT
);
CREATE TABLE sales (
	id INTEGER NOT NULL, 
	code VARCHAR(30) NOT NULL, 
	user_id INTEGER NOT NULL, 
	sold_by_id INTEGER, 
	customer_name VARCHAR(120), 
	customer_email VARCHAR(255), 
	subtotal NUMERIC(12, 2) NOT NULL, 
	discount NUMERIC(12, 2) NOT NULL, 
	total NUMERIC(12, 2) NOT NULL, 
	payment_method VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	notes TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_sales_subtotal_non_negative CHECK (subtotal >= 0), 
	CONSTRAINT ck_sales_discount_non_negative CHECK (discount >= 0), 
	CONSTRAINT ck_sales_total_non_negative CHECK (total >= 0), 
	UNIQUE (code), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE RESTRICT, 
	FOREIGN KEY(sold_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ck_payment_method CHECK (payment_method IN ('cash', 'transfer', 'card', 'mercadopago')), 
	CONSTRAINT ck_sale_status CHECK (status IN ('completed', 'cancelled'))
);
CREATE TABLE styles (
	id INTEGER NOT NULL, 
	name VARCHAR(60) NOT NULL, 
	slug VARCHAR(80) NOT NULL, 
	description TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);
CREATE TABLE users (
	id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	phone VARCHAR(40), 
	is_active BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_user_role CHECK (role IN ('admin', 'client'))
);
CREATE UNIQUE INDEX ix_categories_slug ON categories (slug);
CREATE UNIQUE INDEX ix_styles_slug ON styles (slug);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_role_active ON users (role, is_active);
CREATE INDEX ix_products_status_active ON products (status, is_active);
CREATE INDEX ix_products_name ON products (name);
CREATE INDEX ix_products_category ON products (category_id);
CREATE INDEX ix_sales_created_at ON sales (created_at);
CREATE INDEX ix_sales_status ON sales (status);
CREATE INDEX ix_sales_user ON sales (user_id);
CREATE INDEX ix_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX ix_price_suggestions_created ON price_suggestions (created_at);
CREATE INDEX ix_price_suggestions_user ON price_suggestions (user_id);
CREATE INDEX ix_movements_product_created ON inventory_movements (product_id, created_at);
CREATE INDEX ix_sale_items_product ON sale_items (product_id);
