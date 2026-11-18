CREATE TABLE IF NOT EXISTS pieces (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 material VARCHAR(20) NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL,
 INDEX idx_pieces_time(occurred_at)
);
CREATE TABLE IF NOT EXISTS sensor_readings (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 observed_at TIMESTAMP(6) NOT NULL,
 x01_raw INT NULL, x02_raw INT NULL, x03_raw INT NULL,
 distance_cm DOUBLE NULL, tank_level DOUBLE NULL,
 INDEX idx_readings_time(observed_at)
);
CREATE TABLE IF NOT EXISTS operator_users (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(50) NOT NULL
);
