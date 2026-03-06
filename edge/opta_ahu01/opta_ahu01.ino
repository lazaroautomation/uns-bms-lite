/*
 * ============================================================================
 * UNS-BMS-Lite | Edge Device: Arduino Opta
 * Role         : AHU-01 — Simulated telemetry publisher
 * Interface    : Serial command shell (115200 baud)
 * ============================================================================
 *
 * TIMESTAMP ARCHITECTURE:
 *   event_ts  — when the sensor value was read (NTP-synced UTC epoch ms)
 *               set by this device, never overwritten downstream
 *   ingest_ts — added by Node-RED when the message arrives at the broker
 *               difference = pipeline latency (observable in Grafana)
 *
 * NTP:
 *   Syncs to your PC acting as NTP server (same clock as Docker containers).
 *   Set NTP_SERVER to your PC's LAN IP. Port 123/UDP must be open.
 *   Always UTC (gmtOffset = 0). Grafana handles display timezone.
 *
 * SERIAL COMMANDS:
 *   connect   → connect to MQTT broker
 *   start     → begin publishing telemetry every 1s
 *   stop      → pause publishing (keeps MQTT connected)
 *   status    → print current connection and run state
 *
 * BOOT SEQUENCE:
 *   1. Ethernet starts with static IP
 *   2. NTP sync attempted (blocks until successful)
 *   3. IP, broker, and NTP server printed to serial
 *   4. Waits for: connect → start
 * ============================================================================
 */

#include <Ethernet.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <EthernetUdp.h>
#include <NTPClient.h>

// ─── Network ─────────────────────────────────────────────────────────────────

byte      MAC[]      = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0x01 };
IPAddress STATIC_IP  (192, 168,   1, 120);
IPAddress DNS_SERVER (192, 168,   1,   1);
IPAddress GATEWAY    (192, 168,   1,   1);
IPAddress SUBNET     (255, 255, 255,   0);

// ─── NTP ─────────────────────────────────────────────────────────────────────

// Point to your PC's LAN IP — it is the NTP server for all edge devices.
// Must match the machine running Docker (same clock source as containers).
// Windows: enable W32tm and open UDP/123. Linux/Mac: already running by default.
const char* NTP_SERVER      = "192.168.1.X";   // ← replace with your PC's LAN IP
const long  NTP_GMT_OFFSET  = 0;               // always UTC — Grafana converts for display
const int   NTP_INTERVAL_MS = 60000;           // re-sync every 60 s

EthernetUDP ntpUDP;
NTPClient   timeClient(ntpUDP, NTP_SERVER, NTP_GMT_OFFSET, NTP_INTERVAL_MS);

/// Returns current UTC time as Unix epoch milliseconds.
/// Uses NTPClient for seconds + Ethernet stack millis for sub-second precision.
unsigned long long getEpochMs() {
  timeClient.update();
  // NTPClient gives whole seconds; add millis offset within the current second
  unsigned long long epochSec = (unsigned long long)timeClient.getEpochTime();
  return epochSec * 1000ULL;
}

// ─── MQTT ────────────────────────────────────────────────────────────────────

const char* MQTT_HOST      = "192.168.1.100";   // ← EMQX broker IP (Docker host)
const int   MQTT_PORT      = 1883;
const char* MQTT_CLIENT_ID = "opta-ahu01";

const char* TOPIC_TELEMETRY = "uns/site01/hvac/ahu01/telemetry";
const char* TOPIC_STATUS    = "uns/site01/hvac/ahu01/status";
const char* TOPIC_CMD_ALL   = "uns/site01/hvac/ahu01/command/#";
const char* LWT_PAYLOAD     = "{\"online\":false,\"device\":\"opta-ahu01\"}";

// ─── Timing ──────────────────────────────────────────────────────────────────

const unsigned long TELEMETRY_INTERVAL_MS = 1000;   // 1 second
const unsigned long STATUS_INTERVAL_MS    = 30000;  // 30 seconds

// ─── AHU State ───────────────────────────────────────────────────────────────

float  supply_air_setpoint_c = 16.0;
float  vfd_speed_pct         = 60.0;
float  valve_position_pct    = 0.0;
String ahu_mode              = "auto";

// ─── Simulation State ────────────────────────────────────────────────────────

float sim_chw_temp_in   = 7.0;
float sim_chw_temp_out  = 12.0;
float sim_supply_temp   = 16.5;
float sim_return_temp   = 24.0;
float sim_filter_dp     = 120.0;
float sim_duct_pressure = 350.0;
float sim_co2_ppm       = 650.0;

// ─── Runtime State ───────────────────────────────────────────────────────────

EthernetClient ethClient;
PubSubClient   mqtt(ethClient);

unsigned long lastTelemetryMs = 0;
unsigned long lastStatusMs    = 0;

bool   isPublishing = false;
String serialBuffer = "";

// ─── Simulated Reads ─────────────────────────────────────────────────────────

float readChwTempIn() {
  sim_chw_temp_in += (random(-10, 11) / 100.0);
  return constrain(sim_chw_temp_in, 5.0, 10.0);
}

float readChwTempOut() {
  sim_chw_temp_out += (random(-10, 11) / 100.0);
  return constrain(sim_chw_temp_out, 9.0, 16.0);
}

float readSupplyTemp() {
  if (ahu_mode == "auto") {
    float error = sim_supply_temp - supply_air_setpoint_c;
    valve_position_pct = constrain(50.0 + (error * 5.0), 0.0, 100.0);
    sim_supply_temp += (error > 0 ? -0.1 : 0.05);
  }
  sim_supply_temp += (random(-5, 6) / 100.0);
  return constrain(sim_supply_temp, 12.0, 22.0);
}

float readReturnTemp() {
  sim_return_temp += (random(-8, 9) / 100.0);
  return constrain(sim_return_temp, 20.0, 28.0);
}

float readFilterDp() {
  sim_filter_dp += (random(0, 3) / 10.0);
  return constrain(sim_filter_dp, 50.0, 400.0);
}

float readDuctPressure() {
  sim_duct_pressure = (vfd_speed_pct / 100.0) * 500.0 + random(-20, 21);
  return constrain(sim_duct_pressure, 0.0, 600.0);
}

float readVfdSpeed() {
  return constrain(vfd_speed_pct + random(-2, 3), 0.0, 100.0);
}

float readCo2Ppm() {
  float vf = vfd_speed_pct / 100.0;
  sim_co2_ppm += (vf > 0.5 ? -2.0 : 3.0) + random(-5, 6);
  return constrain(sim_co2_ppm, 380.0, 1200.0);
}

float readValvePosition() {
  return constrain(valve_position_pct + random(-1, 2), 0.0, 100.0);
}

// ─── MQTT Command Callback ───────────────────────────────────────────────────

void onCommand(char* topic, byte* payload, unsigned int length) {
  String topicStr(topic);
  String payloadStr;
  for (unsigned int i = 0; i < length; i++) payloadStr += (char)payload[i];

  Serial.print("[CMD] "); Serial.print(topic);
  Serial.print(" → "); Serial.println(payloadStr);

  JsonDocument doc;
  if (deserializeJson(doc, payloadStr)) return;

  if      (topicStr.endsWith("/supply_air_setpoint"))
    supply_air_setpoint_c = doc["value"] | supply_air_setpoint_c;
  else if (topicStr.endsWith("/vfd_speed_override"))
    vfd_speed_pct = constrain((float)(doc["value"] | vfd_speed_pct), 0.0, 100.0);
  else if (topicStr.endsWith("/valve_override"))
    valve_position_pct = constrain((float)(doc["value"] | valve_position_pct), 0.0, 100.0);
  else if (topicStr.endsWith("/mode"))
    ahu_mode = (const char*)(doc["value"] | ahu_mode.c_str());
}

// ─── MQTT Connect ─────────────────────────────────────────────────────────────

bool connectMQTT() {
  Serial.print("[MQTT] Connecting to ");
  Serial.print(MQTT_HOST); Serial.print(":"); Serial.print(MQTT_PORT);
  Serial.println(" ...");

  bool ok = mqtt.connect(
    MQTT_CLIENT_ID,
    nullptr, nullptr,
    TOPIC_STATUS, 0, true, LWT_PAYLOAD
  );

  if (ok) {
    Serial.println("[MQTT] Connected.");

    JsonDocument doc;
    doc["online"] = true;
    doc["device"] = MQTT_CLIENT_ID;
    doc["fw"]     = "1.0.0";
    char buf[128];
    serializeJson(doc, buf);
    mqtt.publish(TOPIC_STATUS, buf, true);

    mqtt.subscribe(TOPIC_CMD_ALL);
    Serial.println();
    Serial.println("Type  start  to begin publishing.");
  } else {
    Serial.print("[MQTT] Failed. rc=");
    Serial.print(mqtt.state());
    Serial.println(" — check broker IP and that EMQX is running.");
  }

  return ok;
}

// ─── Publish Telemetry ────────────────────────────────────────────────────────

void publishTelemetry() {
  // Stamp the event time first — before any sensor reads or serialization delay.
  // This is the true measurement time. Node-RED will add ingest_ts downstream.
  unsigned long long event_ts = getEpochMs();

  float chwIn    = readChwTempIn();
  float chwOut   = readChwTempOut();
  float supplyT  = readSupplyTemp();
  float returnT  = readReturnTemp();
  float filterDp = readFilterDp();
  float ductPa   = readDuctPressure();
  float vfdSpd   = readVfdSpeed();
  float co2      = readCo2Ppm();
  float valvePos = readValvePosition();

  JsonDocument doc;

  // ── Identity ──
  doc["device"] = MQTT_CLIENT_ID;
  doc["mode"]   = ahu_mode;

  // ── Event timestamp (UTC epoch ms) ──
  // Cast to unsigned long to fit ArduinoJson — safe until year 2554.
  doc["event_ts"] = (unsigned long)event_ts;

  // ── Process values ──
  doc["chw_temp_in_c"]         = serialized(String(chwIn,     2));
  doc["chw_temp_out_c"]        = serialized(String(chwOut,    2));
  doc["chw_delta_t_c"]         = serialized(String(chwOut - chwIn, 2));
  doc["supply_air_temp_c"]     = serialized(String(supplyT,   2));
  doc["supply_air_setpoint_c"] = supply_air_setpoint_c;
  doc["return_air_temp_c"]     = serialized(String(returnT,   2));
  doc["filter_dp_pa"]          = serialized(String(filterDp,  1));
  doc["duct_pressure_pa"]      = serialized(String(ductPa,    1));
  doc["vfd_speed_pct"]         = serialized(String(vfdSpd,    1));
  doc["vfd_setpoint_pct"]      = vfd_speed_pct;
  doc["valve_position_pct"]    = serialized(String(valvePos,  1));
  doc["co2_ppm"]               = serialized(String(co2,       0));
  doc["uptime_ms"]             = millis();

  char buf[512];
  serializeJson(doc, buf);
  mqtt.publish(TOPIC_TELEMETRY, buf);

  Serial.print("[PUB] "); Serial.println(buf);
}

// ─── Publish Status ───────────────────────────────────────────────────────────

void publishStatus() {
  JsonDocument doc;
  doc["online"]            = true;
  doc["device"]            = MQTT_CLIENT_ID;
  doc["fw"]                = "1.0.0";
  doc["uptime_ms"]         = millis();
  doc["mode"]              = ahu_mode;
  doc["supply_setpoint_c"] = supply_air_setpoint_c;
  doc["vfd_setpoint_pct"]  = vfd_speed_pct;
  doc["eth_link"]          = (Ethernet.linkStatus() == LinkON);
  doc["event_ts"]          = (unsigned long)getEpochMs();

  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(TOPIC_STATUS, buf, true);
}

// ─── Serial Command Handler ───────────────────────────────────────────────────

void handleCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();

  if (cmd == "connect") {
    if (mqtt.connected()) {
      Serial.println("[INFO] Already connected.");
    } else {
      connectMQTT();
    }

  } else if (cmd == "start") {
    if (!mqtt.connected()) {
      Serial.println("[INFO] Not connected. Type  connect  first.");
    } else if (isPublishing) {
      Serial.println("[INFO] Already publishing.");
    } else {
      isPublishing    = true;
      lastTelemetryMs = 0;
      Serial.println("[INFO] Publishing started — telemetry every 1s.");
      Serial.println("[INFO] Type  stop  to pause.");
    }

  } else if (cmd == "stop") {
    if (!isPublishing) {
      Serial.println("[INFO] Not currently publishing.");
    } else {
      isPublishing = false;
      Serial.println("[INFO] Publishing paused. MQTT still connected.");
      Serial.println("[INFO] Type  start  to resume.");
    }

  } else if (cmd == "status") {
    Serial.println("──────────────────────────────────────");
    Serial.print  ("  IP         : "); Serial.println(Ethernet.localIP());
    Serial.print  ("  Broker     : "); Serial.print(MQTT_HOST);
    Serial.print(":"); Serial.println(MQTT_PORT);
    Serial.print  ("  NTP Server : "); Serial.println(NTP_SERVER);
    Serial.print  ("  NTP Time   : "); Serial.println(timeClient.getFormattedTime());
    Serial.print  ("  MQTT       : "); Serial.println(mqtt.connected() ? "Connected" : "Disconnected");
    Serial.print  ("  Publishing : "); Serial.println(isPublishing ? "YES" : "NO");
    Serial.print  ("  Mode       : "); Serial.println(ahu_mode);
    Serial.print  ("  Uptime     : "); Serial.print(millis() / 1000); Serial.println(" s");
    Serial.println("──────────────────────────────────────");

  } else if (cmd.length() > 0) {
    Serial.print("[?] Unknown: '"); Serial.print(cmd); Serial.println("'");
    Serial.println("    connect | start | stop | status");
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Serial.println();
  Serial.println("============================================");
  Serial.println("  UNS-BMS-Lite  |  Arduino Opta  |  AHU-01");
  Serial.println("============================================");

  // ── Ethernet ──
  Ethernet.begin(MAC, STATIC_IP, DNS_SERVER, GATEWAY, SUBNET);
  delay(1000);

  Serial.print("[ETH] IP      : "); Serial.println(Ethernet.localIP());
  Serial.print("[ETH] Broker  : "); Serial.print(MQTT_HOST);
  Serial.print(":"); Serial.println(MQTT_PORT);
  Serial.print("[NTP] Server  : "); Serial.println(NTP_SERVER);

  // ── NTP sync — block until successful ──
  // Device must have a valid UTC clock before publishing any event_ts.
  Serial.print("[NTP] Syncing  ...");
  timeClient.begin();
  while (!timeClient.update()) {
    timeClient.forceUpdate();
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
  Serial.print("[NTP] UTC time : "); Serial.println(timeClient.getFormattedTime());

  // ── MQTT ──
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onCommand);
  mqtt.setBufferSize(512);

  randomSeed(analogRead(0));

  Serial.println();
  Serial.println("Type  connect  to connect to the broker.");
  Serial.println();
}

// ─── Loop ────────────────────────────────────────────────────────────────────

void loop() {

  // ── Serial input — read char by char, handle on newline ──
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        handleCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
    }
  }

  // ── Keep MQTT alive (processes incoming commands) ──
  if (mqtt.connected()) mqtt.loop();

  // ── Publish loop — only when started ──
  if (isPublishing && mqtt.connected()) {
    unsigned long now = millis();

    if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryMs = now;
      publishTelemetry();
    }

    if (now - lastStatusMs >= STATUS_INTERVAL_MS) {
      lastStatusMs = now;
      publishStatus();
    }
  }
}
