"""
Wokwi ESP32-CAM Receiver for Python & OpenCV
---------------------------------------------
Nhận luồng hình ảnh chất lượng cao truyền từ Wokwi ESP32-CAM
và hiển thị trực tiếp lên cửa sổ OpenCV hoặc nạp vào các mô hình AI (YOLO, Face Detection,...).

Yêu cầu cài đặt:
  pip install paho-mqtt opencv-python numpy
"""

import base64
import time
import cv2
import numpy as np
import paho.mqtt.client as mqtt

# --- Cấu hình ---
BROKER_HOST = "broker.emqx.io"
BROKER_PORT = 1883
CHANNEL_ID = "esp32cam_studio"
TOPIC_OUTPUT = f"wokwi/esp32cam/{CHANNEL_ID}/output_jpeg"

fps_counter = 0
last_time = time.time()
current_fps = 0.0

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Kết nối thành công tới {BROKER_HOST}!")
        print(f"[MQTT] Đang lắng nghe kênh hình ảnh: {TOPIC_OUTPUT}")
        client.subscribe(TOPIC_OUTPUT)
    else:
        print(f"[MQTT] Lỗi kết nối, mã lỗi: {rc}")

def on_message(client, userdata, msg):
    global fps_counter, last_time, current_fps

    try:
        payload = msg.payload
        frame_bytes = None

        # Kiểm tra xem payload là nhị phân JPEG thuần (0xFF, 0xD8) hay Base64 string
        if len(payload) >= 2 and payload[0] == 0xFF and payload[1] == 0xD8:
            frame_bytes = payload
        else:
            frame_bytes = base64.b64decode(payload)

        # Giải mã JPEG thành mảng hình ảnh OpenCV (BGR)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is not None:
            fps_counter += 1
            now = time.time()
            if now - last_time >= 1.0:
                current_fps = fps_counter / (now - last_time)
                fps_counter = 0
                last_time = now

            # Thêm thông số lên ảnh
            h, w, _ = img.shape
            info_text = f"Wokwi ESP32-CAM | {w}x{h} | FPS: {current_fps:.1f} | Size: {len(payload)/1024:.1f} KB"
            cv2.putText(img, info_text, (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 0), 2)

            # Hiển thị cửa sổ hình ảnh
            cv2.imshow("Wokwi ESP32-CAM — 3rd-Party Python OpenCV Receiver", img)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                client.disconnect()
                cv2.destroyAllWindows()
                exit(0)
    except Exception as e:
        print(f"[ERROR] Lỗi xử lý frame: {e}")

def main():
    print("=" * 60)
    print(" 🚀 WOKWI ESP32-CAM PYTHON OPENCV 3RD-PARTY RECEIVER ")
    print("=" * 60)

    client = mqtt.Client(client_id=f"python_opencv_{int(time.time())}")
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"Đang kết nối tới MQTT Broker: {BROKER_HOST}:{BROKER_PORT}...")
    client.connect(BROKER_HOST, BROKER_PORT, 60)

    # Chạy vòng lặp nhận tin nhắn
    client.loop_forever()

if __name__ == "__main__":
    main()
