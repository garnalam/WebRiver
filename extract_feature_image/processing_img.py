from datetime import datetime
import os
import cv2
from keras.preprocessing.image import img_to_array, load_img
import numpy as np

def read_image(img_input, target_size=(320, 320)):
    if isinstance(img_input, np.ndarray):
        resized = cv2.resize(img_input, (target_size[1], target_size[0]))

        if resized.ndim == 2:
            resized = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
        elif resized.ndim == 3 and resized.shape[2] == 4:
            resized = cv2.cvtColor(resized, cv2.COLOR_RGBA2RGB)

        resized = resized.astype('float32') / 255.0
        return resized

    else:
        img = load_img(img_input, target_size=target_size)  # PIL Image
        img_array = img_to_array(img)  # NumPy array (RGB)
        
        # Kiểm tra nếu có 4 kênh → chuyển sang RGB
        if img_array.shape[2] == 4:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

        # Đảm bảo ảnh là RGB 3 kênh
        elif img_array.shape[2] == 1:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)

        img_array = img_array.astype('float32') / 255.0
        return img_array

def images_time_series(img_path, img_date_str=None):
    """
    Process image and extract datetime.
    Args:
        img_path (str or ndarray): Path to image file or image array.
        img_date_str (str, optional): Date string in YYYY_MM format (e.g., 2023_07).
    Returns:
        tuple: (processed_images, date)
    """
    processed_images = []

    # --- 1. Trích xuất ngày ---
    if img_date_str:
        date = datetime.strptime(img_date_str, '%Y_%m')
    else:
        filename = os.path.basename(img_path) if isinstance(img_path, str) else 'unknown'
        img_date_str = os.path.splitext(filename)[0]
        date = datetime.strptime(img_date_str, '%Y_%m')

    # --- 2. Đọc và xử lý ảnh ---
    img_array = read_image(img_path, target_size=(320, 320))
    processed_images.append(img_array)

    processed_images = np.array(processed_images, dtype='float32')  # shape (1, 320, 320, 3)

    return processed_images, date