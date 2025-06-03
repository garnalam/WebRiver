import pandas as pd


def expand_image_features(image_features_df):
    # Tạo danh sách để lưu các đặc trưng đã lặp lại
    expanded_features = []

    # Lặp qua từng tháng trong DataFrame
    for month in image_features_df.index:
        # Tạo một dãy ngày cho tháng hiện tại
        month_days = pd.date_range(start=month, end=month + pd.offsets.MonthEnd(0))

        # Lặp lại các đặc trưng cho từng ngày trong tháng
        for day in month_days:
            expanded_features.append(image_features_df.loc[month].values)

    # Chuyển danh sách thành DataFrame
    expanded_features_df = pd.DataFrame(expanded_features, columns=image_features_df.columns)

    # Đặt chỉ số là các ngày đã lặp lại
    expanded_features_df.index = pd.date_range(start=image_features_df.index[0], periods=len(expanded_features), freq='D')

    return expanded_features_df