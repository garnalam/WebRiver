import numpy as np

def create_image_sequences(data, labels, time_steps, num_predictions):
    """
    Tạo chuỗi dữ liệu từ các ngày cuối cùng của dữ liệu lịch sử, đủ để dự đoán num_predictions ngày.

    Parameters:
    - data (pd.DataFrame): DataFrame chứa đặc trưng dữ liệu (combined_df).
    - labels (pd.Series): Series chứa nhãn (mực nước hồ).
    - time_steps (int): Số ngày liên tiếp để tạo một chuỗi (ví dụ: 4).
    - num_predictions (int): Số ngày cần dự đoán (len(prediction_dates)).

    Returns:
    - input_sequences (np.ndarray): Chuỗi dữ liệu đầu vào.
    - output_labels (np.ndarray): Nhãn (mực nước hồ).
    - time_labels (np.ndarray): Mốc thời gian tương ứng.
    """
    # Kiểm tra kích thước data và labels
    if len(data) != len(labels):
        raise ValueError(
            f"Kích thước của data ({len(data)}) không khớp với labels ({len(labels)})"
        )

    num_samples = len(data) - time_steps  # Số lượng chuỗi tối đa có thể tạo từ dữ liệu lịch sử
    if num_samples < 0:
        raise ValueError(
            f"Dữ liệu lịch sử ({len(data)} ngày) không đủ để tạo chuỗi với time_steps = {time_steps}"
        )

    if num_samples < num_predictions:
        raise ValueError(
            f"Dữ liệu lịch sử không đủ để dự đoán {num_predictions} ngày. "
            f"Số lượng chuỗi tối đa có thể tạo: {num_samples} (yêu cầu ít nhất {num_predictions}). "
            f"Vui lòng tăng số lượng dữ liệu lịch sử hoặc giảm số ngày dự đoán."
        )

    # Chỉ lấy các chuỗi cuối cùng để dự đoán num_predictions ngày
    start_idx = max(0, num_samples - num_predictions)  # Bắt đầu từ chuỗi cuối cùng
    num_sequences = num_predictions  # Số chuỗi cần tạo

    input_sequences = np.zeros((num_sequences, time_steps, data.shape[1]))  # Chuỗi dữ liệu đầu vào
    output_labels = np.zeros((num_sequences,))  # Nhãn là mực nước hồ (m)
    
    # Lấy mốc thời gian từ chỉ số của DataFrame
    time_labels = data.index[start_idx + time_steps:start_idx + time_steps + num_sequences].to_numpy()

    for i in range(num_sequences):
        idx = start_idx + i
        input_sequences[i] = data.iloc[idx:idx + time_steps].values  # Lấy time_steps ngày liên tiếp
        # Kiểm tra giới hạn trước khi truy cập labels
        if idx + time_steps >= len(labels):
            raise ValueError(
                f"Truy cập ngoài giới hạn: idx + time_steps = {idx + time_steps}, "
                f"nhưng labels chỉ có {len(labels)} phần tử"
            )
        output_labels[i] = labels.iloc[idx + time_steps]  # Nhãn là ngày tiếp theo

    return input_sequences, output_labels, time_labels