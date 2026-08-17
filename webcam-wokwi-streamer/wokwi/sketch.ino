/**
 * Wokwi ESP32-CAM & ScAllergen AI Smart Allergen Detection Bridge
 * -----------------------------------------------------------------
 * 1. Nhận luồng video Full Color từ Webcam vào bộ nhớ tĩnh an toàn (Static Buffer 32KB).
 * 2. KHI BẤM NÚT XANH (GPIO 4): Chụp và gửi ảnh sang Web ScAllergen.
 * 3. LẮNG NGHE PHẢN HỒI TỪ SCALLERGEN (Topic: /allergen_feedback):
 *    - NẾU PHÁT HIỆN DỊ ỨNG (is_safe = false):
 *      + Nhấp nháy ĐÈN LED ĐỎ (GPIO 13) + Kêu còi cảnh báo (GPIO 14)!
 *      + Hiển thị dòng chữ cảnh báo & tên chất dị ứng lên màn hình LCD 1602!
 *    - NẾU AN TOÀN (is_safe = true):
 *      + Bật ĐÈN LED XANH (GPIO 2), tắt còi.
 *      + Hiển thị "ALLERGEN: SAFE! / NO ALLERGEN FOUND" trên LCD.
 *
 * Board: ESP32 DevKit-C v4
 * Button: GPIO 4 (Nút chụp ảnh)
 * LED Đỏ (Cảnh báo dị ứng): GPIO 13
 * LED Xanh (An toàn / Flash): GPIO 2
 * Còi Buzzer: GPIO 14
 * LCD 1602 I2C: SDA=21, SCL=22
 * Broker: broker.emqx.io (Port 1883 TCP)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Cấu hình chân phần cứng ---
#define BUTTON_CAPTURE_PIN 4  // Nút bấm chụp ảnh (GPIO 4)
#define LED_ALERT_RED_PIN 13  // Đèn LED Đỏ cảnh báo dị ứng (GPIO 13)
#define LED_SAFE_GREEN_PIN 2  // Đèn LED Xanh an toàn / Flash (GPIO 2)
#define BUZZER_PIN 14         // Còi Buzzer cảnh báo (GPIO 14)

LiquidCrystal_I2C lcd(0x27, 16, 2);

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Cloud MQTT Broker EMQX
const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;

// Channel Topic
const char* CHANNEL_ID = "esp32cam_studio";
const String TOPIC_TRIGGER_CAPTURE   = "wokwi/esp32cam/esp32cam_studio/trigger_capture";
const String TOPIC_ALLERGEN_FEEDBACK = "wokwi/esp32cam/esp32cam_studio/allergen_feedback";

WiFiClient espClient;
PubSubClient client(espClient);

// Biến trạng thái
unsigned long snapshotsTaken = 0;
bool isAllergenAlertActive = false;
unsigned long lastBlinkTime = 0;
bool ledRedState = false;
unsigned long alertTurnOffTime = 0;   // Thời điểm tự động tắt còi & đèn đỏ cảnh báo (5s)
unsigned long safeLedTurnOffTime = 0; // Thời điểm tự động tắt đèn xanh an toàn (5s)
String lastAllergenName = "";

void setupWifi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected! IP Address: ");
  Serial.println(WiFi.localIP());
}

/**
 * Xử lý kết quả phản hồi từ ScAllergen Web
 */
void handleAllergenFeedback(byte* payload, unsigned int length) {
  String json = "";
  for (unsigned int i = 0; i < length; i++) {
    json += (char)payload[i];
  }

  Serial.println("\n=======================================================");
  Serial.println("[SCALLERGEN FEEDBACK] Nhận kết quả phân tích dị ứng từ Web:");
  Serial.println(json);

  // Kiểm tra xem sản phẩm có an toàn hay chứa dị ứng
  if (json.indexOf("\"is_safe\":false") >= 0 || json.indexOf("\"is_safe\": false") >= 0 || json.indexOf("false") >= 0) {
    // === PHÁT HIỆN DỊ ỨNG -> KÍCH HOẠT CẢNH BÁO ĐỎ & CÒI TRONG 5 GIÂY ===
    isAllergenAlertActive = true;
    alertTurnOffTime = millis() + 5000; // Tự động tắt còi sau 5 giây
    safeLedTurnOffTime = 0;
    digitalWrite(LED_SAFE_GREEN_PIN, LOW);

    // Trích xuất tên dị ứng nếu có
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

    Serial.println("[CẢNH BÁO] !!! PHÁT HIỆN THÀNH PHẦN DỊ ỨNG (KÊU 5 GIÂY) !!!");
    Serial.println("[CẢNH BÁO] Chi tiết: " + warningMsg);

    // Hiển thị LCD cảnh báo
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
    // === AN TOÀN -> BẬT ĐÈN XANH 5 GIÂY ===
    isAllergenAlertActive = false;
    alertTurnOffTime = 0;
    digitalWrite(LED_ALERT_RED_PIN, LOW);
    noTone(BUZZER_PIN);

    // Bật LED Xanh sáng trong 5 giây
    digitalWrite(LED_SAFE_GREEN_PIN, HIGH);
    safeLedTurnOffTime = millis() + 5000;

    Serial.println("[AN TOÀN] ✓ Sản phẩm an toàn, không có thành phần dị ứng.");
    Serial.println("[AN TOÀN] >>> ĐÈN LED XANH ĐANG SÁNG (5s) <<<");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("[SAFE] NO HAZARD");
    lcd.setCursor(0, 1);
    lcd.print("LED GREEN (5s)");
  }
  Serial.println("=======================================================\n");
}

/**
 * Gửi lệnh kích hoạt phân tích ảnh sang ScAllergen khi bấm nút
 */
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

  // 1. Gửi lệnh Trigger Capture ngay lập tức tới ScAllergen Web qua MQTT
  bool success = client.publish(TOPIC_TRIGGER_CAPTURE.c_str(), "CAPTURE_NOW");
  espClient.flush();

  // Hiển thị LCD trạng thái đang phân tích
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

/**
 * Callback nhận MQTT gói tin
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  Serial.printf("[MQTT RX] Nhận gói tin từ topic: %s (len: %u)\n", topic, length);

  if (topicStr.indexOf("allergen_feedback") >= 0 || topicStr.indexOf("feedback") >= 0) {
    handleAllergenFeedback(payload, length);
  }
}

void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting to Broker (broker.emqx.io)...");
    String clientId = "wokwi_esp32cam_" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      
      // Lắng nghe luồng phản hồi kết quả dị ứng từ ScAllergen Web
      client.subscribe(TOPIC_ALLERGEN_FEEDBACK.c_str());

      Serial.printf("[MQTT] Subscribed to %s\n", TOPIC_ALLERGEN_FEEDBACK.c_str());

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
  Serial.println("\n=======================================================");
  Serial.println(" WOKWI ESP32-CAM & SCALLERGEN ALLERGEN DETECTOR SYSTEM ");
  Serial.println("=======================================================");

  // Cấu hình chân I/O
  pinMode(BUTTON_CAPTURE_PIN, INPUT_PULLUP);
  pinMode(LED_ALERT_RED_PIN, OUTPUT);
  pinMode(LED_SAFE_GREEN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_ALERT_RED_PIN, LOW);
  digitalWrite(LED_SAFE_GREEN_PIN, LOW);
  noTone(BUZZER_PIN);

  // Khởi tạo LCD I2C 16x2
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("ScAllergen Guard");
  lcd.setCursor(0, 1);
  lcd.print("Booting WiFi...");

  setupWifi();

  // Cấu hình MQTT nhẹ nhàng 4KB (không bị lag/nghẽn)
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  client.setBufferSize(4096);

  Serial.println("\n>>> SAN SANG: Bam nut mau xanh de chup va gui anh sang ScAllergen! <<<\n");
}

void loop() {
  if (!client.connected()) {
    reconnectMqtt();
  }
  client.loop();

  // 1. Kiểm tra sự kiện bấm nút phần cứng GPIO 4 (Chống rung chuẩn)
  if (digitalRead(BUTTON_CAPTURE_PIN) == LOW) {
    delay(40);
    if (digitalRead(BUTTON_CAPTURE_PIN) == LOW) {
      triggerSendSnapshotToScAllergen();
      
      // Chờ người dùng nhả nút
      while (digitalRead(BUTTON_CAPTURE_PIN) == LOW) {
        client.loop();
        delay(10);
      }
    }
  }

  // 2. Kiểm tra lệnh gõ từ Serial
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("snap") || cmd.equalsIgnoreCase("send") || 
        cmd.equalsIgnoreCase("scan") || cmd.equalsIgnoreCase("capture")) {
      triggerSendSnapshotToScAllergen();
    } else if (cmd.equalsIgnoreCase("safe")) {
      byte dummy[] = "{\"is_safe\":true,\"warning_text\":\"SAN PHAM AN TOAN\"}";
      handleAllergenFeedback(dummy, strlen((char*)dummy));
    } else if (cmd.equalsIgnoreCase("alert")) {
      byte dummy[] = "{\"is_safe\":false,\"warning_text\":\"SUA BO / TOM\"}";
      handleAllergenFeedback(dummy, strlen((char*)dummy));
    }
  }

  // 3. Xử lý hiệu ứng nhấp nháy ĐÈN ĐỎ & KÊU CÒI khi có cảnh báo dị ứng
  if (isAllergenAlertActive) {
    if (millis() < alertTurnOffTime) {
      unsigned long now = millis();
      if (now - lastBlinkTime >= 200) { // Nhấp nháy chu kỳ 200ms
        lastBlinkTime = now;
        ledRedState = !ledRedState;
        digitalWrite(LED_ALERT_RED_PIN, ledRedState ? HIGH : LOW);
        
        if (ledRedState) {
          tone(BUZZER_PIN, 1500); // Âm báo 1500Hz dồn dập
        } else {
          noTone(BUZZER_PIN);
        }
      }
    } else {
      // HẾT THỜI GIAN CẢNH BÁO (5 GIÂY) -> TẮT CÒI & ĐÈN ĐỎ, RESET TRẠNG THÁI SẴN SÀNG CHỤP TIẾP
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

  // 4. Tự động tắt LED xanh sau 5 giây và reset về trạng thái sẵn sàng
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
