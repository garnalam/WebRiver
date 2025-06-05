import numpy as np

def number_feature(model, df):

    if 'month_year' not in df.columns:
        raise ValueError("DataFrame không có cột 'month_year'. Đảm bảo number_time_series đã tạo cột này.")

    # Kiểm tra các cột cần thiết
    required_cols = ['Mực nước hồ (m)', 'Lưu lượng đến hồ (m³/s)']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"DataFrame không có các cột cần thiết: {missing_cols}")

    features = []
    # Nhóm dữ liệu theo tháng/năm
    for month, group in df.groupby('month_year'):
        if len(group) == 0:
            continue
        # Trích xuất đặc trưng cho từng nhóm, chỉ lấy 2 cột
        input_data = group[['Mực nước hồ (m)', 'Lưu lượng đến hồ (m³/s)']].values
        # Kiểm tra shape đầu vào
        if input_data.shape[1] != 2:
            raise ValueError(
                f"Shape của input_data không khớp với mô hình: kỳ vọng (None, 2), thực tế {input_data.shape}"
            )
        group_features = model.predict(input_data)
        features.append(group_features)
    if not features:
        raise ValueError("Không có dữ liệu nào để trích xuất đặc trưng sau khi nhóm theo month_year.")
    return np.concatenate(features, axis=0)