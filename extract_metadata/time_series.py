import pandas as pd


def number_time_series(df):
    # Feature engineering
    df['thoi_gian'] = pd.to_datetime(df['thoi_gian'])
    df.set_index('thoi_gian', inplace=True)

    # Giữ lại các cột dữ liệu cần thiết
    df = df[['Mực nước hồ (m)', 'Tổng lưu lượng xả (m³/s)[Thực tế]', 'Lưu lượng đến hồ (m³/s)']].resample('D').mean()

    # Tạo cột 'month_year' để nhóm dữ liệu theo từng tháng
    df['month_year'] = df.index.to_period('D')

    return df