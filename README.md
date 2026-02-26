# UNS-BMS-Lite

A lightweight, bidirectional Unified Namespace (UNS) demo for Building Management Systems.

This project demonstrates a real-time industrial data architecture using MQTT as the core event backbone, enabling bidirectional communication between edge devices, processing logic, storage, and visualization.

---

## 🚀 Architecture Overview

UNS-BMS-Lite is built around an MQTT broker (EMQX) acting as the Core Unified Namespace.

All components both publish and subscribe to the broker, enabling:

- Real-time telemetry flow
- Command/control feedback
- Data transformation
- Historical storage
- Live visualization
- User interaction

### 🔁 Fully Bidirectional Design

- Edge devices publish telemetry and subscribe to control commands.
- Node-RED subscribes to raw data and publishes transformed data.
- InfluxDB subscribes to topics for storage.
- Visualization layer subscribes to live tags and publishes user inputs.
- MQTT Broker (EMQX) is the central event backbone.

---

## 🏗 System Architecture

<p align="center">
  <img width="2834" height="1835" alt="uns-bms-lite-architecture" src="https://github.com/user-attachments/assets/e16803b4-94a5-4bfc-8e5f-8528446518db" />
</p>

---

## 🧠 Component Responsibilities

### Edge Simulator
- Publishes: Raw Telemetry
- Subscribes: Control Commands

### Node-RED
- Subscribes: Raw Data
- Publishes: Transformed Data

### InfluxDB / Historian
- Subscribes: All required data streams
- Publishes: Health/Stats (optional)

### Visualization (React + Embedded Grafana)
- Subscribes: Real-time tags
- Publishes: User inputs / commands

### MQTT Broker (EMQX)
- Central UNS backbone
- Manages topic routing
- Enables decoupled architecture

---

## 🔌 Topic Philosophy (Example Structure)
