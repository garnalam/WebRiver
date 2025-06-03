# Khởi tạo danh sách để lưu đặc trưng từ dữ liệu số
import numpy as np


def number_feature(fc_model, df):
    numeric_features_list = []
    for month, group in df.groupby('month_year'):
        # Lấy dữ liệu số của tháng hiện tại
        numeric_data = group[['Tổng lưu lượng xả (m³/s)[Thực tế]', 'Lưu lượng đến hồ (m³/s)']].values
        
        # Tính giá trị trung bình cho từng tháng
        numeric_features = fc_model.predict(numeric_data.mean(axis=0).reshape(1, -1))
        numeric_features_list.append(numeric_features)

    # Chuyển danh sách đặc trưng thành mảng numpy
    numeric_features_array = np.vstack(numeric_features_list)

    return numeric_features_array