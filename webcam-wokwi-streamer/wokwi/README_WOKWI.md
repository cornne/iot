# Hướng dẫn chạy Virtual ESP32-CAM trên Wokwi

Module này biến **ESP32 trên Wokwi** thành một bộ vi điều khiển **ESP32-CAM thực thụ**:
- Nhận luồng hình ảnh **Full Color JPEG độ nét cao (VGA 640x480 / QVGA 320x240 / HD)** từ Webcam máy tính.
- Nạp vào cấu trúc chuẩn `camera_fb_t` (tương tự thư viện `esp_camera.h`).
- Chuyển tiếp (Relay) hình ảnh nguyên vẹn 100% chất lượng sang **Web thứ 3**, **Python AI (OpenCV/YOLO)** hoặc **Hệ thống IoT** bất kỳ.

---

## ⚡ Các bước thiết lập trên Wokwi (Chỉ 1 phút)

1. **Mở dự án ESP32 mới trên Wokwi:**
   - Truy cập: [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)

2. **Dán tab `diagram.json`:**
   - Chọn tab `diagram.json` và dán toàn bộ nội dung từ tệp [`diagram.json`](./diagram.json).

3. **Cập nhật tab `libraries.txt`:**
   - Thêm 2 dòng sau vào tab `Libraries`:
     ```text
     PubSubClient
     LiquidCrystal I2C
     ```

4. **Dán tab `sketch.ino`:**
   - Copy nội dung từ [`sketch.ino`](./sketch.ino) dán vào tab Code chính.
   - Đảm bảo dòng `CHANNEL_ID` khớp với Channel ID trên Web Studio của bạn (mặc định là `esp32cam_studio`).

5. **Nhấn nút Play ▶️ trên Wokwi:**
   - Màn hình LCD trên Wokwi sẽ hiển thị:
     - `Virtual ESP32CAM`
     - `WiFi Connected!`
     - `ESP32-CAM READY - Waiting Web Cam`

---

## 🚀 Kết nối Web thứ 3 để nhận ảnh từ Wokwi

1. Mở trang Web Studio: **[http://localhost:3000](http://localhost:3000)**.
2. Nhấn **Bật Webcam** ➔ Nhấn **Stream to Wokwi**.
3. Mở file [`third-party-client-example.html`](../third-party-client-example.html) (Web thứ 3) hoặc chạy [`third_party_python_opencv.py`](../third_party_python_opencv.py).
4. Bạn sẽ thấy hình ảnh màu sắc nét truyền từ Wokwi ESP32 sang Web thứ 3 theo thời gian thực!
