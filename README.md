# UNS-BMS-Lite

A lightweight, bidirectional Unified Namespace (UNS) demo for Building Management Systems.

This project demonstrates a real-time industrial architecture built around MQTT as a Core Unified Namespace.  
All components publish and subscribe to the broker, enabling full bidirectional communication between edge devices, processing logic, storage, and visualization.

The system supports both a software simulator (.NET) and real hardware (ESP32).

---

## 🚀 Architecture Overview

UNS-BMS-Lite is built around an MQTT broker (EMQX) acting as the central event backbone.

The architecture is fully event-driven and bidirectional:

- Edge devices publish telemetry and subscribe to control commands
- Node-RED subscribes to raw data and publishes transformed data
- InfluxDB subscribes to topics for historical storage
- React UI subscribes to real-time tags and publishes user commands
- Grafana is embedded inside the React application for historical visualization

This is not a linear pipeline — it is a decoupled namespace-based architecture.

---

## 🏗 System Architecture

<p align="center">
  <img width="1800" height="900" alt="uns-bms-lite-architecture" src="https://github.com/user-attachments/assets/e16803b4-94a5-4bfc-8e5f-8528446518db" />
</p>

---

## 🔁 Bidirectional Communication Model

### Edge Layer

Two supported implementations:

#### 1. .NET Console Simulator
- Publishes: Raw telemetry
- Subscribes: Control commands
- Ideal for local demo and development

#### 2. ESP32 Firmware
- Publishes: Sensor telemetry
- Subscribes: Control commands
- Demonstrates real embedded integration

---

### Node-RED
- Subscribes: Raw telemetry
- Publishes: Structured / transformed data

### InfluxDB (Historian)
- Subscribes: Required data streams
- Stores time-series history

### Visualization (React + Embedded Grafana)
- Subscribes: Real-time MQTT tags
- Publishes: User inputs / control commands
- Displays: Historical dashboards via Grafana iframe

### MQTT Broker (EMQX)
- Central Unified Namespace
- Topic routing
- Decoupled communication backbone

---

## 🔌 Example Topic Structure
uns/
site01/
hvac/
ahu01/
telemetry/temperature
telemetry/humidity
command/setpoint
status/health

Telemetry flows upward.  
Commands flow downward.  
All components interact through the namespace.

---

## 💻 Tech Stack

- MQTT Broker: EMQX
- Flow Engine: Node-RED
- Historian: InfluxDB
- Frontend: React
- Visualization: Embedded Grafana
- Simulator: .NET Console App
- Hardware Option: ESP32
- Orchestration: Docker Compose

---

## 🐳 Running the Full Demo

Start the infrastructure stack:

```bash
docker compose up -d
