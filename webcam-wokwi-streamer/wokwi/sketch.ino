/**
 * Sadie's Link Smart Glasses - ESP32 Firmware (Wokwi & Core 3.0 Compatible)
 * -------------------------------------------------------------
 * Board: ESP32 DevKit-C v4
 * Button (Trigger Scan): GPIO 4
 * LED Red (Allergen Alert): GPIO 13
 * LED Green (Safe): GPIO 2
 * Buzzer (Alarm): GPIO 14 (Sử dụng tone/noTone chuẩn ESP32 Core 3.0)
 * LCD 1602 I2C: SDA=21, SCL=22
 * Broker: broker.emqx.io (Port 1883 TCP)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define TRIGGER_PIN 4
#define LED_ALERT_RED_PIN 13
#define LED_SAFE_GREEN_PIN 2
#define BUZZER_PIN 14

LiquidCrystal_I2C lcd(0x27, 16, 2);

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;

const String TOPIC_TRIGGER_CAPTURE   = "wokwi/esp32cam/esp32cam_studio/trigger_capture";
const String TOPIC_ALLERGEN_FEEDBACK = "wokwi/esp32cam/esp32cam_studio/allergen_feedback";
const String TOPIC_CONFIG            = "wokwi/esp32cam/esp32cam_studio/config";

WiFiClient espClient;
PubSubClient client(espClient);

// Cấu hình thông số động
unsigned long configAlertDurationMs = 5000;
unsigned long configSafeDurationMs  = 5000;
int           configBuzzerFreq      = 1500;
unsigned long configBlinkPeriodMs   = 200;

// Runtime state
unsigned long snapshotsTaken = 0;
bool isAllergenAlertActive = false;
unsigned long lastBlinkTime = 0;
bool ledRedState = false;
unsigned long alertTurnOffTime = 0;
unsigned long safeLedTurnOffTime = 0;

void setupWifi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(150);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected! IP: ");
  Serial.println(WiFi.localIP());
}

void handleHardwareConfig(String json) {
  Serial.println("\n[ESP32 CONFIG] Cập nhật thông số từ Web:");
  Serial.println(json);

  int durIdx = json.indexOf("\"alert_duration_sec\":");
  if (durIdx >= 0) {
    int val = json.substring(durIdx + 21).toInt();
    if (val >= 1 && val <= 60) configAlertDurationMs = (unsigned long)val * 1000;
  }

  int freqIdx = json.indexOf("\"buzzer_freq_hz\":");
  if (freqIdx >= 0) {
    int val = json.substring(freqIdx + 17).toInt();
    if (val >= 200 && val <= 5000) configBuzzerFreq = val;
  }

  // Bíp nhẹ xác nhận
  tone(BUZZER_PIN, configBuzzerFreq);
  digitalWrite(LED_SAFE_GREEN_PIN, HIGH);
  delay(120);
  noTone(BUZZER_PIN);
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONFIG UPDATED!");
  lcd.setCursor(0, 1);
  lcd.printf("Dur:%lus Freq:%d", configAlertDurationMs / 1000, configBuzzerFreq);

  delay(1000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SCALLERGEN READY");
  lcd.setCursor(0, 1);
  lcd.print("Press BTN to SCAN");
}

void handleAllergenFeedback(byte* payload, unsigned int length) {
  String json = "";
  for (unsigned int i = 0; i < length; i++) {
    json += (char)payload[i];
  }

  if (json.indexOf("hardware_config") >= 0 || json.indexOf("alert_duration_sec") >= 0) {
    handleHardwareConfig(json);
    return;
  }

  Serial.println("\n[SCALLERGEN FEEDBACK] Nhận phản hồi dị ứng:");
  Serial.println(json);

  if (json.indexOf("\"is_safe\":false") >= 0 || json.indexOf("\"is_safe\": false") >= 0 || json.indexOf("false") >= 0) {
    // CẢNH BÁO DỊ ỨNG -> CÒI HÚ & ĐÈN ĐỎ
    isAllergenAlertActive = true;
    alertTurnOffTime = millis() + configAlertDurationMs;
    safeLedTurnOffTime = 0;
    digitalWrite(LED_SAFE_GREEN_PIN, LOW);

    String warningMsg = "NGUY HIEM DI UNG";
    int warnIdx = json.indexOf("\"warning_text\":");
    if (warnIdx >= 0) {
      int startQuote = json.indexOf("\"", warnIdx + 15);
      int endQuote = json.indexOf("\"", startQuote + 1);
      if (startQuote >= 0 && endQuote > startQuote) {
        warningMsg = json.substring(startQuote + 1, endQuote);
      }
    }

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("!ALLERGEN ALERT!");
    lcd.setCursor(0, 1);
    if (warningMsg.length() > 16) {
      lcd.print(warningMsg.substring(0, 16));
    } else {
      lcd.print(warningMsg);
    }
  } else {
    // AN TOÀN -> BẬT ĐÈN XANH
    isAllergenAlertActive = false;
    alertTurnOffTime = 0;
    digitalWrite(LED_ALERT_RED_PIN, LOW);
    noTone(BUZZER_PIN);

    digitalWrite(LED_SAFE_GREEN_PIN, HIGH);
    safeLedTurnOffTime = millis() + configSafeDurationMs;

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("[SAFE] NO HAZARD");
    lcd.setCursor(0, 1);
    lcd.printf("LED GREEN (%lus)", configSafeDurationMs / 1000);
  }
}

void triggerSendSnapshot() {
  snapshotsTaken++;
  isAllergenAlertActive = false;
  alertTurnOffTime = 0;
  digitalWrite(LED_ALERT_RED_PIN, LOW);
  noTone(BUZZER_PIN);
  safeLedTurnOffTime = 0;
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);

  Serial.printf("\n[TRIGGER] >>> Bấm nút chụp lần #%lu <<<\n", snapshotsTaken);
  client.publish(TOPIC_TRIGGER_CAPTURE.c_str(), "CAPTURE_NOW");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.printf("SNAP #%lu SENT!", snapshotsTaken);
  lcd.setCursor(0, 1);
  lcd.print("AI Analyzing...");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  if (topicStr.indexOf("config") >= 0) {
    String json = "";
    for (unsigned int i = 0; i < length; i++) json += (char)payload[i];
    handleHardwareConfig(json);
  } else {
    handleAllergenFeedback(payload, length);
  }
}

void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting to Broker...");
    String clientId = "SadiesWokwi_" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      client.subscribe(TOPIC_ALLERGEN_FEEDBACK.c_str());
      client.subscribe(TOPIC_CONFIG.c_str());

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SCALLERGEN READY");
      lcd.setCursor(0, 1);
      lcd.print("Press BTN to SCAN");
    } else {
      delay(1500);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_PIN, INPUT_PULLUP);
  pinMode(LED_ALERT_RED_PIN, OUTPUT);
  pinMode(LED_SAFE_GREEN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_ALERT_RED_PIN, LOW);
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);
  noTone(BUZZER_PIN);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sadie's Link ESP");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");

  setupWifi();

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  client.setBufferSize(4096);
}

void loop() {
  if (!client.connected()) {
    reconnectMqtt();
  }
  client.loop();

  // Kiểm tra nút bấm GPIO 4
  if (digitalRead(TRIGGER_PIN) == LOW) {
    delay(40);
    if (digitalRead(TRIGGER_PIN) == LOW) {
      triggerSendSnapshot();
      while (digitalRead(TRIGGER_PIN) == LOW) {
        client.loop();
        delay(15);
      }
    }
  }

  // Nhấp nháy đèn đỏ và còi hú khi có cảnh báo
  if (isAllergenAlertActive) {
    if (millis() < alertTurnOffTime) {
      unsigned long now = millis();
      if (now - lastBlinkTime >= configBlinkPeriodMs) {
        lastBlinkTime = now;
        ledRedState = !ledRedState;
        digitalWrite(LED_ALERT_RED_PIN, ledRedState ? HIGH : LOW);
        if (ledRedState) tone(BUZZER_PIN, configBuzzerFreq);
        else noTone(BUZZER_PIN);
      }
    } else {
      isAllergenAlertActive = false;
      alertTurnOffTime = 0;
      digitalWrite(LED_ALERT_RED_PIN, LOW);
      noTone(BUZZER_PIN);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SCALLERGEN READY");
      lcd.setCursor(0, 1);
      lcd.print("Press BTN to SCAN");
    }
  }

  // Tắt đèn xanh sau thời gian an toàn
  if (safeLedTurnOffTime > 0 && millis() > safeLedTurnOffTime) {
    digitalWrite(LED_SAFE_GREEN_PIN, LOW);
    safeLedTurnOffTime = 0;

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SCALLERGEN READY");
    lcd.setCursor(0, 1);
    lcd.print("Press BTN to SCAN");
  }
}