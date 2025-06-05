import cv2
import numpy as np
import json
import sys
import os
from ultralytics import YOLO
from model_segment.model_yolo import model_segment

# Đảm bảo stdout là UTF-8
sys.stdout.reconfigure(encoding='utf-8')
import locale
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
os.environ['PYTHONIOENCODING'] = 'utf-8'

def check_river(image_path, output_path):
    try:
        print(f"Đang đọc ảnh tại: {image_path}")
        # Đọc ảnh
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Không thể đọc file ảnh tại {image_path}")

        print("Đang tải mô hình YOLO...")
        # Tạo mask bằng YOLO
        model_path = './weight_yolo/best.pt'
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Không tìm thấy file mô hình tại {model_path}")
        model = YOLO(model_path)

        print("Đang tạo mask bằng YOLO...")
        mask = model_segment(model, image)

        print("Đang kiểm tra mask...")
        # Kiểm tra mask có toàn 0 hay không, chuyển đổi numpy.bool_ thành bool
        has_river = bool(np.any(mask))

        # Nếu có mask, kiểm tra diện tích vùng phát hiện
        if has_river:
            # Tính diện tích vùng phát hiện (tổng số pixel > 0)
            area = np.sum(mask > 0)
            total_pixels = mask.size
            area_ratio = area / total_pixels
            print(f"Tỷ lệ diện tích vùng phát hiện: {area_ratio}")

            # Nếu diện tích vùng phát hiện quá nhỏ (dưới 5% diện tích ảnh), coi như không hợp lệ
            if area_ratio < 0.05:
                has_river = False
                print("Vùng phát hiện quá nhỏ, coi như không hợp lệ.")

        # Lưu kết quả
        result = {
            "has_river": has_river,
            "error": "Ảnh không hợp lệ: Không phát hiện được con sông hoặc vùng phát hiện quá nhỏ." if not has_river else None
        }
        print(f"Kết quả kiểm tra: {result}")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f)

    except Exception as e:
        print(f"Lỗi trong check_river.py: {str(e)}", file=sys.stderr)
        result = {
            "has_river": False,
            "error": f"Lỗi khi kiểm tra ảnh: {str(e)}"
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python check_river.py <image_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]
    output_path = sys.argv[2]
    print(f"Bắt đầu kiểm tra ảnh: {image_path}")
    check_river(image_path, output_path)