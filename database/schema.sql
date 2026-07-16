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

