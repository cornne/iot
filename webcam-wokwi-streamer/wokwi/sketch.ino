#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define BTN_PIN       4   // Nút bấm xanh chụp ảnh
#define POWER_PIN     5   // Công tắc nguồn (Gạt Bật / Tắt)
#define LED_RED_PIN   13  // Đèn đỏ cảnh báo
#define LED_GREEN_PIN 2   // Đèn xanh an toàn
#define BUZZER_PIN    14  // Còi báo (LEDC PWM Volume)

LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClient espClient;
PubSubClient client(espClient);

const char* MQTT_SERVER    = "broker.emqx.io";
const char* TOPIC_CAPTURE  = "wokwi/esp32cam/esp32cam_studio/trigger_capture";
const char* TOPIC_FEEDBACK = "wokwi/esp32cam/esp32cam_studio/allergen_feedback";
const char* TOPIC_CONFIG   = "wokwi/esp32cam/esp32cam_studio/config";

// Thông số cấu hình (nhận từ Web)
unsigned long alertDurationMs = 5000; // Thời gian còi kêu (2s - 15s)
int           buzzerVolumePct = 60;   // Độ to còi / Âm lượng (10% - 100%)
int           buzzerDuty      = 153;  // Duty PWM (0 - 255)
unsigned long safeDurationMs  = 3000; // Thời gian LED xanh sáng (3s)
unsigned long blinkPeriodMs   = 200;  // Tốc độ chớp đèn đỏ

// Trạng thái runtime
bool isPowerOn = true;
bool lastPowerState = false;
unsigned long snapCount = 0;
bool isAlertActive = false;
unsigned long lastBlinkTime = 0;
bool ledRedState = false;
unsigned long alertOffTime = 0;
unsigned long safeOffTime = 0;

void showReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SCALLERGEN READY");
  lcd.setCursor(0, 1);
  lcd.print("Press BTN to SCAN");
}

void handleConfig(String json) {
  int dIdx = json.indexOf("alert_duration_sec");
  if (dIdx >= 0) {
    int cIdx = json.indexOf(":", dIdx);
    if (cIdx >= 0) {
      int v = json.substring(cIdx + 1).toInt();
      if (v >= 1 && v <= 60) alertDurationMs = (unsigned long)v * 1000;
    }
  }
  int vIdx = json.indexOf("buzzer_volume");
  if (vIdx >= 0) {
    int cIdx = json.indexOf(":", vIdx);
    if (cIdx >= 0) {
      int v = json.substring(cIdx + 1).toInt();
      if (v >= 5 && v <= 100) {
        buzzerVolumePct = v;
        buzzerDuty = map(buzzerVolumePct, 0, 100, 0, 255);
      }
    }
  }

  // Không phát còi, không bật đèn khi nhận cấu hình
  ledcWrite(0, 0);
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);

  Serial.println("[CONFIG UPDATED] Coi: " + String(alertDurationMs / 1000) + "s | Am luong: " + String(buzzerVolumePct) + "%");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONFIG UPDATED!");
  lcd.setCursor(0, 1);
  lcd.print("Coi:");
  lcd.print(alertDurationMs / 1000);
  lcd.print("s | Vol:");
  lcd.print(buzzerVolumePct);
  lcd.print("%");

  delay(1500);
  showReady();
}

void handleFeedback(String json) {
  if (json.indexOf("hardware_config") >= 0 || json.indexOf("alert_duration_sec") >= 0) {
    handleConfig(json);
    return;
  }

  if (json.indexOf("\"is_safe\":false") >= 0 || json.indexOf("\"is_safe\": false") >= 0) {
    isAlertActive = true;
    alertOffTime = millis() + alertDurationMs;
    safeOffTime = 0;
    digitalWrite(LED_GREEN_PIN, LOW);

    String msg = "NGUY HIEM DI UNG";
    int wIdx = json.indexOf("\"warning_text\":");
    if (wIdx >= 0) {
      int sQ = json.indexOf("\"", wIdx + 15);
      int eQ = json.indexOf("\"", sQ + 1);
      if (sQ >= 0 && eQ > sQ) msg = json.substring(sQ + 1, eQ);
    }

    Serial.println("[ALERT] Di ung phat hien! Keu: " + String(alertDurationMs / 1000) + "s (Am luong: " + String(buzzerVolumePct) + "%)");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("!ALLERGEN ALERT!");
    lcd.setCursor(0, 1);
    lcd.print(msg.length() > 16 ? msg.substring(0, 16) : msg);
  } else {
    isAlertActive = false;
    alertOffTime = 0;
    digitalWrite(LED_RED_PIN, LOW);
    ledcWrite(0, 0);

    digitalWrite(LED_GREEN_PIN, HIGH);
    safeOffTime = millis() + safeDurationMs;

    Serial.println("[SAFE] An toan! Bat LED Xanh 3s");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("[SAFE] NO HAZARD");
    lcd.setCursor(0, 1);
    lcd.print("LED GREEN (3s)");
  }
}

void triggerScan() {
  snapCount++;
  isAlertActive = false;
  alertOffTime = 0;
  safeOffTime = 0;
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  ledcWrite(0, 0);

  client.publish(TOPIC_CAPTURE, "CAPTURE_NOW");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SNAP #");
  lcd.print(snapCount);
  lcd.print(" SENT!");
  lcd.setCursor(0, 1);
  lcd.print("AI Analyzing...");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String json = "";
  for (unsigned int i = 0; i < length; i++) json += (char)payload[i];

  if (String(topic).indexOf("config") >= 0 || json.indexOf("hardware_config") >= 0) {
    handleConfig(json);
  } else {
    handleFeedback(json);
  }
}

void reconnectMqtt() {
  while (!client.connected()) {
    String cid = "wokwi_esp32_" + String(random(0xffff), HEX);
    if (client.connect(cid.c_str())) {
      client.subscribe(TOPIC_FEEDBACK);
      client.subscribe(TOPIC_CONFIG);
      Serial.println("[MQTT] Da ket noi broker & subscribe config/feedback");
      showReady();
    } else {
      delay(1500);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(POWER_PIN, INPUT_PULLUP);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);

  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);

  // Cấu hình LEDC PWM điều khiển độ to/nhỏ của còi (Channel 0, 1500Hz, 8-bit)
  ledcSetup(0, 1500, 8);
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWrite(0, 0);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("ScAllergen Guard");
  lcd.setCursor(0, 1);
  lcd.print("Booting WiFi...");

  WiFi.begin("Wokwi-GUEST", "");
  while (WiFi.status() != WL_CONNECTED) delay(100);

  client.setServer(MQTT_SERVER, 1883);
  client.setCallback(mqttCallback);
  client.setBufferSize(4096);
}

void loop() {
  // 1. Công tắc nguồn
  bool pwr = (digitalRead(POWER_PIN) == HIGH);
  if (pwr != lastPowerState) {
    lastPowerState = pwr;
    isPowerOn = pwr;
    if (isPowerOn) {
      lcd.backlight();
      showReady();
    } else {
      isAlertActive = false;
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, LOW);
      ledcWrite(0, 0);
      lcd.clear();
      lcd.noBacklight();
    }
  }
  if (!isPowerOn) { delay(50); return; }

  if (!client.connected()) reconnectMqtt();
  client.loop();

  // 2. Nút bấm xanh chụp ảnh
  if (digitalRead(BTN_PIN) == LOW) {
    delay(40);
    if (digitalRead(BTN_PIN) == LOW) {
      triggerScan();
      while (digitalRead(BTN_PIN) == LOW) { client.loop(); delay(10); }
    }
  }

  // 3. Cảnh báo dị ứng (Hú còi theo độ to tùy chỉnh & Chớp đèn đỏ)
  if (isAlertActive) {
    if (millis() < alertOffTime) {
      unsigned long now = millis();
      if (now - lastBlinkTime >= blinkPeriodMs) {
        lastBlinkTime = now;
        ledRedState = !ledRedState;
        digitalWrite(LED_RED_PIN, ledRedState ? HIGH : LOW);
        if (ledRedState) ledcWrite(0, buzzerDuty);
        else ledcWrite(0, 0);
      }
    } else {
      isAlertActive = false;
      digitalWrite(LED_RED_PIN, LOW);
      ledcWrite(0, 0);
      showReady();
    }
  }

  // 4. Tắt đèn xanh sau 3s
  if (safeOffTime > 0 && millis() > safeOffTime) {
    digitalWrite(LED_GREEN_PIN, LOW);
    safeOffTime = 0;
    showReady();
  }
}