CREATE TABLE repairs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_date DATE NOT NULL,
  top_issue VARCHAR(255) NOT NULL,
  failure_qty INT UNSIGNED NOT NULL DEFAULT 0,
  build_qty INT UNSIGNED NOT NULL DEFAULT 0,
  fr_percentage DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  category VARCHAR(120) NOT NULL,
  return_status VARCHAR(50) NULL,
  fail_picture VARCHAR(255) NULL,
  major_part VARCHAR(255) NULL,
  repair_result VARCHAR(255) NULL,
  failure_factor VARCHAR(255) NULL,
  actions TEXT NULL,
  evidence_picture VARCHAR(255) NULL,
  source_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repairs_record_date (record_date),
  KEY idx_repairs_top_issue (top_issue),
  KEY idx_repairs_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE repair_catalog_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  catalog_type VARCHAR(40) NOT NULL,
  value VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_catalog_type_value (catalog_type, value),
  KEY idx_repair_catalog_type_active (catalog_type, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
SELECT 'top_issue', TRIM(top_issue)
FROM repairs
WHERE top_issue IS NOT NULL AND TRIM(top_issue) <> ''
GROUP BY TRIM(top_issue);

INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
SELECT 'category', TRIM(category)
FROM repairs
WHERE category IS NOT NULL AND TRIM(category) <> ''
GROUP BY TRIM(category);

INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
SELECT 'major_part', TRIM(major_part)
FROM repairs
WHERE major_part IS NOT NULL AND TRIM(major_part) <> ''
GROUP BY TRIM(major_part);

INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
SELECT 'failure_factor', TRIM(failure_factor)
FROM repairs
WHERE failure_factor IS NOT NULL AND TRIM(failure_factor) <> ''
GROUP BY TRIM(failure_factor);
