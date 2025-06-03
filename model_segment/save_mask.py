import os
import shutil
import cv2

def process_image(date, image, output_folder):
    # 1. Tạo (hoặc làm mới) thư mục đầu ra
    if os.path.exists(output_folder):
        shutil.rmtree(output_folder)
    os.makedirs(output_folder)

    # 2. Lấy năm và tháng từ biến date để đặt tên file
    #    Ví dụ: nếu date = datetime(2023, 4, 15), thì sẽ tạo "2023_04_mask.jpg"
    yy_mm = date.strftime('%Y_%m')
    base_filename = f"{yy_mm}_mask.jpg"

    # 3. Kết hợp đường dẫn và lưu file
    output_path = os.path.join(output_folder, base_filename)
    cv2.imwrite(output_path, image)
