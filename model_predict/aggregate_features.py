import numpy as np

# Hàm tổng hợp đặc trưng theo chiều thời gian
def aggregate_features(X):
    # Tổng hợp theo thời gian, ví dụ: tính trung bình (hoặc có thể chọn max, min,...)
    return np.mean(X, axis=1)  # output shape will be (n_samples, n_features)