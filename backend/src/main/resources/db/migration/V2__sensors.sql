CREATE TABLE IF NOT EXISTS sensor_devices (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 port INT NOT NULL UNIQUE,
 sensor_type VARCHAR(40) NOT NULL,
 description VARCHAR(255)
);
INSERT INTO sensor_devices(port,sensor_type,description) VALUES
(1,'DISTANCE','Distância do reservatório virtual, conversão 5-50 cm com calibração'),
(2,'CAPACITIVE','Presença de peças na esteira'),
(3,'INDUCTIVE','Detecção de metal na esteira');
