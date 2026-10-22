-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: smart_park
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias` (
  `categoria` varchar(30) NOT NULL,
  `tarifa_hora` decimal(10,2) NOT NULL DEFAULT 15.00,
  `penalizacion` decimal(10,2) NOT NULL DEFAULT 50.00,
  PRIMARY KEY (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `empleados` (
  `id_empleado` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `placa` varchar(15) NOT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `uk_placa_empleado` (`placa`),
  CONSTRAINT `fk_empleados_vehiculos` FOREIGN KEY (`placa`) REFERENCES `vehiculos` (`placa`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lugares`
--

DROP TABLE IF EXISTS `lugares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lugares` (
  `id_lugar` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `codigo_espacio` varchar(10) NOT NULL,
  `tipo_lugar` enum('Normal','Accesible') NOT NULL DEFAULT 'Normal',
  PRIMARY KEY (`id_lugar`),
  UNIQUE KEY `uk_codigo_espacio` (`codigo_espacio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lugares`
--

LOCK TABLES `lugares` WRITE;
/*!40000 ALTER TABLE `lugares` DISABLE KEYS */;
/*!40000 ALTER TABLE `lugares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metodos_pago`
--

DROP TABLE IF EXISTS `metodos_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metodos_pago` (
  `metodo` varchar(30) NOT NULL,
  PRIMARY KEY (`metodo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metodos_pago`
--

LOCK TABLES `metodos_pago` WRITE;
/*!40000 ALTER TABLE `metodos_pago` DISABLE KEYS */;
/*!40000 ALTER TABLE `metodos_pago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pagos` (
  `id_pago` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_sesion` int(10) unsigned NOT NULL,
  `metodo_pago` varchar(30) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `estado_pago` enum('Completado','Pendiente','Rechazado') NOT NULL DEFAULT 'Completado',
  `referencia_transaccion` varchar(100) NOT NULL COMMENT 'UID del lector NFC PN532 o folio bancario',
  `fecha_hora_pago` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_pago`),
  KEY `fk_pagos_sesiones` (`id_sesion`),
  KEY `fk_pagos_metodos` (`metodo_pago`),
  CONSTRAINT `fk_pagos_metodos` FOREIGN KEY (`metodo_pago`) REFERENCES `metodos_pago` (`metodo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pagos_sesiones` FOREIGN KEY (`id_sesion`) REFERENCES `sesiones` (`id_sesion`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos`
--

LOCK TABLES `pagos` WRITE;
/*!40000 ALTER TABLE `pagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas`
--

DROP TABLE IF EXISTS `reservas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reservas` (
  `codigo_reserva` varchar(20) NOT NULL,
  `placa` varchar(15) DEFAULT NULL,
  `id_lugar` int(10) unsigned NOT NULL,
  `fecha_reserva` date NOT NULL,
  `hora_llegada` time NOT NULL,
  `estado_reserva` enum('Reservado','Completada','Cancelada') NOT NULL DEFAULT 'Reservado',
  `lugar_reservado` int(10) unsigned GENERATED ALWAYS AS (if(`estado_reserva` = 'Reservado',`id_lugar`,NULL)) VIRTUAL,
  PRIMARY KEY (`codigo_reserva`),
  UNIQUE KEY `uk_lugar_reservado` (`lugar_reservado`),
  KEY `fk_reservas_vehiculos` (`placa`),
  KEY `fk_reservas_lugares` (`id_lugar`),
  CONSTRAINT `fk_reservas_lugares` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id_lugar`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reservas_vehiculos` FOREIGN KEY (`placa`) REFERENCES `vehiculos` (`placa`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas`
--

LOCK TABLES `reservas` WRITE;
/*!40000 ALTER TABLE `reservas` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesiones`
--

DROP TABLE IF EXISTS `sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sesiones` (
  `id_sesion` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `placa` varchar(15) DEFAULT NULL,
  `id_lugar` int(10) unsigned NOT NULL,
  `hora_entrada` datetime NOT NULL DEFAULT current_timestamp(),
  `hora_salida` datetime DEFAULT NULL,
  `monto_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado_sesion` enum('Activa','Pagada','Adeudo') NOT NULL DEFAULT 'Activa',
  `lugar_activo` int(10) unsigned GENERATED ALWAYS AS (if(`estado_sesion` = 'Activa',`id_lugar`,NULL)) VIRTUAL,
  `placa_activa` varchar(15) GENERATED ALWAYS AS (if(`estado_sesion` = 'Activa',`placa`,NULL)) VIRTUAL,
  PRIMARY KEY (`id_sesion`),
  UNIQUE KEY `uk_lugar_activo` (`lugar_activo`),
  UNIQUE KEY `uk_placa_activa` (`placa_activa`),
  KEY `fk_sesiones_vehiculos` (`placa`),
  KEY `fk_sesiones_lugares` (`id_lugar`),
  CONSTRAINT `fk_sesiones_lugares` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id_lugar`) ON UPDATE CASCADE,
  CONSTRAINT `fk_sesiones_vehiculos` FOREIGN KEY (`placa`) REFERENCES `vehiculos` (`placa`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones`
--

LOCK TABLES `sesiones` WRITE;
/*!40000 ALTER TABLE `sesiones` DISABLE KEYS */;
/*!40000 ALTER TABLE `sesiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehiculos`
--

DROP TABLE IF EXISTS `vehiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehiculos` (
  `placa` varchar(15) NOT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `categoria` varchar(30) NOT NULL DEFAULT 'General',
  PRIMARY KEY (`placa`),
  KEY `fk_vehiculos_categorias` (`categoria`),
  CONSTRAINT `fk_vehiculos_categorias` FOREIGN KEY (`categoria`) REFERENCES `categorias` (`categoria`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehiculos`
--

LOCK TABLES `vehiculos` WRITE;
/*!40000 ALTER TABLE `vehiculos` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehiculos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22 17:12:01
