import numpy as np


def create_image_sequences(data, labels, time_steps):
    num_samples = len(data) - time_steps  # Số lượng mẫu (tổng số ngày trừ đi time_steps)
    input_sequences = np.zeros((num_samples, time_steps, data.shape[1]))  # Chuỗi dữ liệu đầu vào
    output_labels = np.zeros((num_samples,))  # Nhãn là mực nước hồ (m)
    
    # Lấy mốc thời gian từ chỉ số của DataFrame
    time_labels = data.index[time_steps:num_samples + time_steps].to_numpy()

    for i in range(num_samples):
        input_sequences[i] = data.iloc[i:i+time_steps].values  # Lấy 4 ngày liên tiếp từ dữ liệu
        output_labels[i] = labels[i + time_steps]  # Nhãn là ngày thứ 5 (mực nước hồ)

    return input_sequences, output_labels, time_labels