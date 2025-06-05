import pandas as pd

def number_time_series(df):

    # Chuyển cột thoi_gian thành datetime
    df['thoi_gian'] = pd.to_datetime(df['thoi_gian'])
    
    # Sắp xếp theo thời gian
    df = df.sort_values('thoi_gian')
    
    # Đặt thoi_gian làm chỉ số
    df = df.set_index('thoi_gian')

    # Tạo cột month_year từ chỉ số
    df['month_year'] = df.index.map(lambda x: x.strftime('%Y-%m'))

    required_cols = ['Mực nước hồ (m)', 'Lưu lượng đến hồ (m³/s)', 'Tổng lưu lượng xả (m³/s)[Thực tế]']
    df[required_cols] = df[required_cols].ffill()

    return df