import cv2
import numpy as np
import pandas as pd
from ultralytics import YOLO
import json
import sys
import base64
from datetime import datetime
import os
import time

# Đảm bảo stdout là UTF-8
sys.stdout.reconfigure(encoding='utf-8')
import locale
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
os.environ['PYTHONIOENCODING'] = 'utf-8'

from extract_feature_image.processing_img import images_time_series
from extract_feature_image.model_vgg19 import create_feature_extractor
from model_segment.model_yolo import model_segment
from model_segment.save_mask import process_image
from extract_metadata.model_fc import build_FC_model
from extract_metadata.extract_feature import number_feature
from extract_metadata.time_series import number_time_series
from combine_feature.expand_image_features import expand_image_features
from combine_feature.combine import combine_features
from model_predict.create_data import create_image_sequences
from model_predict.aggregate_features import aggregate_features
from model_predict.model_SARIMAX import model_test_general

def to_three_channel(mask):
    if mask.ndim == 3 and mask.shape[2] == 1:
        mask = mask.squeeze(axis=-1)
    mask = mask.astype('uint8')
    mask_rgb = np.stack([mask, mask, mask], axis=-1)
    return mask_rgb

def run_prediction(image_path, metadata_path, output_path):
    try:
        # Đo thời gian tổng thể
        start_total = time.time()

        # Đọc ảnh
        start_time = time.time()
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Unable to read image file")
        print(f"Thời gian đọc ảnh: {time.time() - start_time:.2f} giây")

        # Resize ảnh để tối ưu hiệu suất
        max_size = 1024
        if image.shape[0] > max_size or image.shape[1] > max_size:
            scale = min(max_size / image.shape[0], max_size / image.shape[1])
            image = cv2.resize(image, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

        # Đọc metadata
        start_time = time.time()
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata_input = json.load(f)
        metadata_records = metadata_input['metadata']
        prediction_dates = metadata_input['prediction_dates']
        mmyy = metadata_input.get('mmyy')
        if not mmyy:
            raise ValueError("Missing mmyy in metadata")
        print(f"Thời gian đọc metadata: {time.time() - start_time:.2f} giây")

        # Chuyển mmyy (MM/YY) sang YYYY_MM
        mm, yy = mmyy.split('/')
        img_date_str = f"20{yy}_{mm}"

        # Xử lý ảnh và trích xuất datetime
        start_time = time.time()
        processed_images, date = images_time_series(image_path, img_date_str=img_date_str)
        print(f"Thời gian xử lý ảnh: {time.time() - start_time:.2f} giây")

        # Tạo mask bằng YOLO
        start_time = time.time()
        model_path = './weight_yolo/best.pt'
        model = YOLO(model_path)
        mask = model_segment(model, image)
        mask = to_three_channel(mask)
        print(f"Thời gian phân đoạn YOLO: {time.time() - start_time:.2f} giây")

        # Lưu mask vào buffer
        start_time = time.time()
        _, mask_buffer = cv2.imencode('.jpg', mask)
        mask_buffer = mask_buffer.tobytes()
        print(f"Thời gian lưu mask: {time.time() - start_time:.2f} giây")

        # Trích xuất đặc trưng ảnh
        start_time = time.time()
        model = create_feature_extractor()
        mask_batch = np.expand_dims(mask, axis=0)
        img_feature = model.predict(mask_batch)
        image_features_df = pd.DataFrame(img_feature, index=[date])
        image_features_df.columns = [f'img_feat_{i}' for i in range(img_feature.shape[1])]
        image_features_df = expand_image_features(image_features_df)
        print(f"Thời gian trích xuất đặc trưng VGG19: {time.time() - start_time:.2f} giây")

        # Xử lý metadata
        start_time = time.time()
        data = []
        for record in metadata_records:
            date_str = f"20{record['mm/yy'].split('/')[1]}-{record['mm/yy'].split('/')[0]}-{record['dd']}"
            values = {item['name']: float(item['value']) for item in record['list_value']}
            values['thoi_gian'] = date_str
            data.append(values)
        df = pd.DataFrame(data)

        if 'thoi_gian' not in df.columns:
            raise ValueError("Column 'thoi_gian' missing in DataFrame")

        df = df.rename(columns={
            'Muc_nuoc_ho': 'Mực nước hồ (m)',
            'Luu_luong_den_ho': 'Lưu lượng đến hồ (m³/s)',
            'Tong_luu_luong_xa_thuc_te': 'Tổng lưu lượng xả (m³/s)[Thực tế]'
        })

        required_cols = ['thoi_gian', 'Mực nước hồ (m)', 'Lưu lượng đến hồ (m³/s)', 'Tổng lưu lượng xả (m³/s)[Thực tế]']
        if not all(col in df.columns for col in required_cols):
            missing_cols = [col for col in required_cols if col not in df.columns]
            raise ValueError(f"Missing required columns in metadata: {missing_cols}")

        data_df = number_time_series(df)
        print(f"Thời gian xử lý metadata: {time.time() - start_time:.2f} giây")

        # Trích xuất đặc trưng số
        start_time = time.time()
        fc_model = build_FC_model()
        numeric_features_array = number_feature(fc_model, data_df)
        numeric_features_df = pd.DataFrame(
            numeric_features_array,
            index=data_df.index,
            columns=[f'num_feat_{i}' for i in range(numeric_features_array.shape[1])]
        )
        print(f"Thời gian trích xuất đặc trưng FCNN: {time.time() - start_time:.2f} giây")

        # Kết hợp đặc trưng
        start_time = time.time()
        combined_df = combine_features(image_features_df, numeric_features_df)
        print(f"Thời gian kết hợp đặc trưng: {time.time() - start_time:.2f} giây")

        # Lấy labels từ data_df với chỉ số khớp với combined_df
        labels = data_df['Mực nước hồ (m)'].reindex(combined_df.index)
        if labels.isna().any():
            raise ValueError(
                f"Labels chứa giá trị NaN sau khi reindex với combined_df. "
                f"Chỉ số của combined_df: {combined_df.index.tolist()}\n"
                f"Chỉ số của data_df: {data_df.index.tolist()}"
            )

        if len(combined_df) != len(labels):
            raise ValueError(
                f"Kích thước của combined_df ({len(combined_df)}) không khớp với labels ({len(labels)}). "
                f"Chỉ số của combined_df: {combined_df.index.tolist()}\n"
                f"Chỉ số của labels: {labels.index.tolist()}"
            )

        # Tạo chuỗi
        time_steps = 4
        num_predictions = len(prediction_dates)
        start_time = time.time()
        X_data, y_data, thoi_gian_data = create_image_sequences(
            combined_df,
            labels,
            time_steps,
            num_predictions
        )
        print(f"Thời gian tạo chuỗi: {time.time() - start_time:.2f} giây")

        # Tổng hợp đặc trưng
        start_time = time.time()
        X_train_aggregated = aggregate_features(X_data)
        print(f"Thời gian tổng hợp đặc trưng: {time.time() - start_time:.2f} giây")

        # Dự đoán
        start_time = time.time()
        model_path_sarima = './sarimax_model.pkl'
        y_pred = model_test_general(X_train_aggregated, model_path_sarima)
        print(f"Thời gian dự đoán SARIMAX: {time.time() - start_time:.2f} giây")

        # Định dạng dự đoán
        predictions = []
        for i, date_str in enumerate(prediction_dates):
            if i < len(y_pred):
                water_estimate = float(y_pred[i])
                predictions.append([date_str, water_estimate])
            else:
                break

        # Lưu output vào file
        output = {
            "predictions": predictions,
            "mask_buffer": base64.b64encode(mask_buffer).decode('utf-8')
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f)

        print(f"Tổng thời gian dự đoán: {time.time() - start_total:.2f} giây")
        return output

    except Exception as e:
        raise Exception(f"Prediction error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python test.py <image_path> <metadata_path> <output_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    metadata_path = sys.argv[2]
    output_path = sys.argv[3]
    result = run_prediction(image_path, metadata_path, output_path)