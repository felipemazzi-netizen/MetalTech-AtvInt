-- MetalTech — consultas básicas para o MySQL Workbench
USE metaltech;
SHOW TABLES;
SELECT * FROM sensor_devices ORDER BY port;
SELECT id, material, occurred_at FROM pieces ORDER BY occurred_at DESC LIMIT 50;
SELECT material, COUNT(*) AS quantidade FROM pieces GROUP BY material;
SELECT observed_at, x01_raw, x02_raw, x03_raw, distance_cm, tank_level FROM sensor_readings ORDER BY observed_at DESC LIMIT 20;
-- Não altere dados de produção na demonstração. O modo demo do React não grava no banco.
