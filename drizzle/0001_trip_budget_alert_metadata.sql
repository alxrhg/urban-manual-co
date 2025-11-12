ALTER TABLE `trips`
  ADD COLUMN `total_budget` INT NULL;

CREATE TABLE IF NOT EXISTS `itinerary_day_budgets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trip_id` VARCHAR(255) NOT NULL,
  `day_index` INT NOT NULL,
  `budget_date` DATETIME NULL,
  `planned_budget` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_itinerary_day_budgets_trip_day` (`trip_id`, `day_index`)
);

ALTER TABLE `opportunity_alerts`
  ADD COLUMN `message` TEXT NULL,
  ADD COLUMN `metadata` TEXT NULL,
  ADD COLUMN `cta_label` VARCHAR(100) NULL,
  ADD COLUMN `cta_payload` TEXT NULL,
  ADD COLUMN `triggered_at` DATETIME NULL;
