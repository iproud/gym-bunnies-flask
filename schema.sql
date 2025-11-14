-- Translated MySQL Schema for SQLite

-- Table structure for table `users`
CREATE TABLE `users` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `is_admin` INTEGER NOT NULL DEFAULT 0,
  `first_name` TEXT NOT NULL,
  `last_name` TEXT NOT NULL,
  `email` TEXT NOT NULL UNIQUE,
  `password` TEXT NOT NULL, -- Will store HASHED passwords, not Base64
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table structure for table `gym_equipment`
CREATE TABLE `gym_equipment` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `type` TEXT NOT NULL CHECK(type IN ('Cardio', 'Strength')),
  `name` TEXT NOT NULL,
  `description` TEXT,
  `image_base64` TEXT, -- Storing Base64 as TEXT
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table structure for table `workouts`
CREATE TABLE `workouts` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `equipment_id` INTEGER NOT NULL,
  `date` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `started_at` DATETIME,
  `ended_at` DATETIME,
  `status` TEXT NOT NULL DEFAULT 'in progress' CHECK(status IN ('in progress', 'completed', 'abandoned')),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`equipment_id`) REFERENCES `gym_equipment` (`id`)
);

-- Table structure for table `sets`
CREATE TABLE `sets` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `workout_id` INTEGER NOT NULL,
  `set_num` INTEGER NOT NULL,
  `reps_dist` REAL NOT NULL,
  `weight_time` INTEGER NOT NULL,
  `resistance` INTEGER NOT NULL,
  FOREIGN KEY (`workout_id`) REFERENCES `workouts` (`id`)
);

-- Table structure for table `user_preferences`
CREATE TABLE `user_preferences` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL UNIQUE,
  `units` TEXT DEFAULT 'metric',
  `default_rest_time` INTEGER DEFAULT 60,
  `theme` TEXT DEFAULT 'light',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- Table structure for table `dates` (Note: This table may be redundant if you use built-in SQLite date functions)
CREATE TABLE `dates` (
  `date_id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `date` DATE NOT NULL,
  `timestamp` INTEGER NOT NULL,
  `weekend` TEXT NOT NULL DEFAULT 'Weekday',
  `day_of_week` TEXT NOT NULL,
  `month` TEXT NOT NULL,
  `month_day` INTEGER NOT NULL,
  `year` INTEGER NOT NULL,
  `week_starting_monday` TEXT NOT NULL
);
