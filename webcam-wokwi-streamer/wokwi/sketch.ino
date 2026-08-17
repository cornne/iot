/**
 * Wokwi ESP32 & ScAllergen AI Smart Allergen Detector System
 * -------------------------------------------------------------
 * Board: ESP32 DevKit-C v4
 * Button (Trigger Scan): GPIO 4
 * LED Red (Allergen Alert): GPIO 13 (Kêu & chớp theo thông số cấu hình)
 * LED Green (Safe): GPIO 2 (Sáng theo thông số cấu hình)
 * Buzzer (Alarm): GPIO 14 (Tần số âm thanh tùy chỉnh từ Web)
 * LCD 1602 I2C: SDA=21, SCL=22
 * Broker: broker.emqx.io (Port 1883 TCP)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define TRIGGER_TOUCH_PIN 4   // GPIO 4: Chân Cảm Ứng Chạm Điện Dung Touch0 (T0) của ESP32
#define TOUCH_THRESHOLD 40    // Ngưỡng kích hoạt khi chạm ngón tay (Touch < 40)
#define LED_ALERT_RED_PIN 13
#define LED_SAFE_GREEN_PIN 2
#define BUZZER_PIN 14

LiquidCrystal_I2C lcd(0x27, 16, 2);

/**
 * Hàm kiểm tra sự kiện Chạm Cảm Ứng Điện Dung (Touch) hoặc Bấm Nút
 */
bool isTriggerActive() {
  // 1. Cảm biến chạm điện dung tích hợp trên ESP32 (Chạm ngón tay vào GPIO 4)
  int touchVal = touchRead(TRIGGER_TOUCH_PIN);
  if (touchVal > 0 && touchVal < TOUCH_THRESHOLD) {
    return true;
  }

  // 2. Nút bấm cơ học kết nối GPIO 4 (Dự phòng đồng thời)
  if (digitalRead(TRIGGER_TOUCH_PIN) == LOW) {
    return true;
  }

  return false;
}

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;

const char* CHANNEL_ID = "esp32cam_studio";
const String TOPIC_TRIGGER_CAPTURE   = "wokwi/esp32cam/esp32cam_studio/trigger_capture";
const String TOPIC_ALLERGEN_FEEDBACK = "wokwi/esp32cam/esp32cam_studio/allergen_feedback";
const String TOPIC_CONFIG            = "wokwi/esp32cam/esp32cam_studio/config";

WiFiClient espClient;
PubSubClient client(espClient);

// ============================================================================
// ⚙️ CẤU HÌNH THÔNG SỐ ĐỘNG (Được điều khiển và thay đổi trực tiếp từ Web)
// ============================================================================
unsigned long configAlertDurationMs = 5000; // Thời gian còi kêu (2s - 15s)
unsigned long configSafeDurationMs  = 5000; // Thời gian LED xanh sáng (2s - 15s)
int           configBuzzerFreq      = 1500; // Tần số âm thanh còi Hz (600Hz - 3000Hz)
unsigned long configBlinkPeriodMs   = 200;  // Tốc độ chớp đèn đỏ ms (50ms - 500ms)

// Biến trạng thái runtime
unsigned long snapshotsTaken = 0;
bool isAllergenAlertActive = false;
unsigned long lastBlinkTime = 0;
bool ledRedState = false;
unsigned long alertTurnOffTime = 0;
unsigned long safeLedTurnOffTime = 0;
String lastAllergenName = "";

void setupWifi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected! IP: ");
  Serial.println(WiFi.localIP());
}

/**
 * Xử lý lệnh cấu hình và thay đổi thông số phần cứng từ Web
 */
void handleHardwareConfig(String json) {
  Serial.println("\n=======================================================");
  Serial.println("[ESP32 CONFIG] Nhận thông số hiệu chỉnh phần cứng từ Web:");
  Serial.println(json);

  // 1. Thời gian cảnh báo (alert_duration_sec)
  int durIdx = json.indexOf("\"alert_duration_sec\":");
  if (durIdx >= 0) {
    int val = json.substring(durIdx + 21).toInt();
    if (val >= 1 && val <= 60) {
      configAlertDurationMs = (unsigned long)val * 1000;
    }
  }

  // 2. Tần số âm thanh còi (buzzer_freq_hz)
  int freqIdx = json.indexOf("\"buzzer_freq_hz\":");
  if (freqIdx >= 0) {
    int val = json.substring(freqIdx + 17).toInt();
    if (val >= 200 && val <= 5000) {
      configBuzzerFreq = val;
    }
  }

  // 3. Tốc độ nháy đèn (blink_rate_ms)
  int blinkIdx = json.indexOf("\"blink_rate_ms\":");
  if (blinkIdx >= 0) {
    int val = json.substring(blinkIdx + 16).toInt();
    if (val >= 20 && val <= 2000) {
      configBlinkPeriodMs = (unsigned long)val;
    }
  }

  // 4. Thời gian đèn xanh (safe_duration_sec)
  int safeIdx = json.indexOf("\"safe_duration_sec\":");
  if (safeIdx >= 0) {
    int val = json.substring(safeIdx + 20).toInt();
    if (val >= 1 && val <= 60) {
      configSafeDurationMs = (unsigned long)val * 1000;
    }
  }

  Serial.printf("[ESP32 CONFIG] Đã áp dụng: Còi=%lus, Tần số=%dHz, Nháy=%lums, Safe=%lus\n", 
                configAlertDurationMs / 1000, configBuzzerFreq, configBlinkPeriodMs, configSafeDurationMs / 1000);

  // Bíp nhẹ và chớp đèn xanh xác nhận đã nhận thông số mới
  tone(BUZZER_PIN, configBuzzerFreq);
  digitalWrite(LED_SAFE_GREEN_PIN, HIGH);
  delay(120);
  noTone(BUZZER_PIN);
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);

  // Hiển thị thông số mới lên LCD 1602
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONFIG UPDATED!");
  lcd.setCursor(0, 1);
  lcd.printf("Dur:%lus Freq:%d", configAlertDurationMs / 1000, configBuzzerFreq);

  delay(1200);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SCALLERGEN READY");
  lcd.setCursor(0, 1);
  lcd.print("Press BTN to SCAN");
  Serial.println("=======================================================\n");
}

/**
 * Xử lý kết quả phản hồi dị ứng từ ScAllergen Web
 */
void handleAllergenFeedback(byte* payload, unsigned int length) {
  String json = "";
  for (unsigned int i = 0; i < length; i++) {
    json += (char)payload[i];
  }

  // Nếu là gói tin cập nhật cấu hình thông số
  if (json.indexOf("\"type\":\"hardware_config\"") >= 0 || json.indexOf("\"type\": \"hardware_config\"") >= 0 || json.indexOf("alert_duration_sec") >= 0) {
    handleHardwareConfig(json);
    return;
  }

  Serial.println("\n=======================================================");
  Serial.println("[SCALLERGEN FEEDBACK] Nhận kết quả phân tích dị ứng từ Web:");
  Serial.println(json);

  if (json.indexOf("\"is_safe\":false") >= 0 || json.indexOf("\"is_safe\": false") >= 0 || json.indexOf("false") >= 0) {
    // === PHÁT HIỆN DỊ ỨNG -> CÒI HÚ & ĐÈN ĐỎ THEO THÔNG SỐ ĐÃ CẤU HÌNH ===
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
    lastAllergenName = warningMsg;

    Serial.printf("[CẢNH BÁO] !!! PHÁT HIỆN THÀNH PHẦN DỊ ỨNG (KÊU %lu GIÂY) !!!\n", configAlertDurationMs / 1000);
    Serial.println("[CẢNH BÁO] Chi tiết: " + warningMsg);

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
    // === AN TOÀN -> BẬT ĐÈN XANH THEO THÔNG SỐ ĐÃ CẤU HÌNH ===
    isAllergenAlertActive = false;
    alertTurnOffTime = 0;
    digitalWrite(LED_ALERT_RED_PIN, LOW);
    noTone(BUZZER_PIN);

    digitalWrite(LED_SAFE_GREEN_PIN, HIGH);
    safeLedTurnOffTime = millis() + configSafeDurationMs;

    Serial.printf("[AN TOÀN] ✓ Sản phẩm an toàn, không có thành phần dị ứng (Đèn sáng %lus).\n", configSafeDurationMs / 1000);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("[SAFE] NO HAZARD");
    lcd.setCursor(0, 1);
    lcd.printf("LED GREEN (%lus)", configSafeDurationMs / 1000);
  }
  Serial.println("=======================================================\n");
}

void triggerSendSnapshotToScAllergen() {
  snapshotsTaken++;
  
  // Tắt toàn bộ cảnh báo cũ khi bấm nút mới
  isAllergenAlertActive = false;
  alertTurnOffTime = 0;
  digitalWrite(LED_ALERT_RED_PIN, LOW);
  noTone(BUZZER_PIN);
  safeLedTurnOffTime = 0;
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);

  Serial.println("\n=======================================================");
  Serial.printf("[TRIGGER] >>> BUTTON PRESSED! TRIGGERING ALLERGY SCAN #%lu <<<\n", snapshotsTaken);

  bool success = client.publish(TOPIC_TRIGGER_CAPTURE.c_str(), "CAPTURE_NOW");
  espClient.flush();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.printf("SNAP #%lu SENT!", snapshotsTaken);
  lcd.setCursor(0, 1);
  lcd.print("AI Analyzing...");

  if (success) {
    Serial.println("[ESP32-CAM] -> SUCCESS: Scan trigger sent to ScAllergen Web!");
  } else {
    Serial.println("[ESP32-CAM] -> ERROR: Failed to publish trigger to MQTT!");
  }
  Serial.println("=======================================================\n");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String json = "";
  for (unsigned int i = 0; i < length; i++) {
    json += (char)payload[i];
  }

  Serial.printf("[MQTT RX] Nhận gói tin từ topic: %s (len: %u)\n", topic, length);

  if (topicStr.indexOf("config") >= 0 || json.indexOf("\"type\":\"hardware_config\"") >= 0 || json.indexOf("\"type\": \"hardware_config\"") >= 0) {
    handleHardwareConfig(json);
  } else if (topicStr.indexOf("allergen_feedback") >= 0 || topicStr.indexOf("feedback") >= 0) {
    handleAllergenFeedback(payload, length);
  }
}

void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting to Broker (broker.emqx.io)...");
    String clientId = "wokwi_esp32cam_" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      client.subscribe(TOPIC_ALLERGEN_FEEDBACK.c_str());
      client.subscribe(TOPIC_CONFIG.c_str());
      Serial.printf("[MQTT] Subscribed to %s & %s\n", TOPIC_ALLERGEN_FEEDBACK.c_str(), TOPIC_CONFIG.c_str());

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SCALLERGEN READY");
      lcd.setCursor(0, 1);
      lcd.print("Press BTN to SCAN");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 2s");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_TOUCH_PIN, INPUT_PULLUP);
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
  lcd.print("ScAllergen Guard");
  lcd.setCursor(0, 1);
  lcd.print("Booting WiFi...");

  setupWifi();

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  client.setBufferSize(4096);

  Serial.println("\n>>> SẴN SÀNG: Chạm ngón tay vào cảm biến (GPIO 4) hoặc bấm nút để chụp & quét dị ứng! <<<\n");
}

void loop() {
  if (!client.connected()) {
    reconnectMqtt();
  }
  client.loop();

  // 1. Kiểm tra sự kiện Chạm Cảm Ứng Điện Dung (Touch) hoặc Bấm Nút trên GPIO 4
  if (isTriggerActive()) {
    delay(40); // Lọc nhiễu và chống dội tín hiệu
    if (isTriggerActive()) {
      Serial.printf("[TOUCH/BUTTON] >>> Đã nhận tín hiệu kích hoạt (Touch Val: %d) <<<\n", touchRead(TRIGGER_TOUCH_PIN));
      triggerSendSnapshotToScAllergen();
      
      // Chờ người dùng nhấc ngón tay ra khỏi cảm biến / nhả nút
      while (isTriggerActive()) {
        client.loop();
        delay(15);
      }
    }
  }

  // 2. Lệnh Serial
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("snap") || cmd.equalsIgnoreCase("send") || 
        cmd.equalsIgnoreCase("scan") || cmd.equalsIgnoreCase("capture")) {
      triggerSendSnapshotToScAllergen();
    } else if (cmd.equalsIgnoreCase("safe") || cmd.equalsIgnoreCase("antoan")) {
      byte dummy[] = "{\"is_safe\":true,\"warning_text\":\"SAN PHAM AN TOAN\"}";
      handleAllergenFeedback(dummy, strlen((char*)dummy));
    } else if (cmd.equalsIgnoreCase("alert") || cmd.equalsIgnoreCase("diung") || cmd.equalsIgnoreCase("danger")) {
      byte dummy[] = "{\"is_safe\":false,\"warning_text\":\"SUA BO / TOM\"}";
      handleAllergenFeedback(dummy, strlen((char*)dummy));
    }
  }

  // 3. Xử lý hiệu ứng nhấp nháy ĐÈN ĐỎ & KÊU CÒI khi có cảnh báo dị ứng
  if (isAllergenAlertActive) {
    if (millis() < alertTurnOffTime) {
      unsigned long now = millis();
      if (now - lastBlinkTime >= configBlinkPeriodMs) { // Nháy theo thông số tùy chỉnh
        lastBlinkTime = now;
        ledRedState = !ledRedState;
        digitalWrite(LED_ALERT_RED_PIN, ledRedState ? HIGH : LOW);
        if (ledRedState) tone(BUZZER_PIN, configBuzzerFreq); // Kêu còi theo tần số tùy chỉnh
        else noTone(BUZZER_PIN);
      }
    } else {
      // HẾT THỜI GIAN CẢNH BÁO -> TẮT CÒI & ĐÈN ĐỎ, RESET TRẠNG THÁI SẴN SÀNG CHỤP TIẾP
      isAllergenAlertActive = false;
      alertTurnOffTime = 0;
      digitalWrite(LED_ALERT_RED_PIN, LOW);
      noTone(BUZZER_PIN);

      Serial.println("\n[RESET] >>> Hết thời gian cảnh báo. Hệ thống sẵn sàng cho lần quét tiếp theo! <<<\n");

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SCALLERGEN READY");
      lcd.setCursor(0, 1);
      lcd.print("Press BTN to SCAN");
    }
  }

  // 4. Tự động tắt LED xanh sau thời gian configSafeDurationMs và reset về trạng thái sẵn sàng
  if (safeLedTurnOffTime > 0 && millis() > safeLedTurnOffTime) {
    digitalWrite(LED_SAFE_GREEN_PIN, LOW);
    safeLedTurnOffTime = 0;

    Serial.println("\n[RESET] >>> Hết thời gian an toàn. Hệ thống sẵn sàng cho lần quét tiếp theo! <<<\n");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SCALLERGEN READY");
    lcd.setCursor(0, 1);
    lcd.print("Press BTN to SCAN");
  }
}
