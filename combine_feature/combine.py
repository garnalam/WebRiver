import pandas as pd


def combine_features(img_features_df, numeric_data_df):
    # Kết hợp hai DataFrame dựa trên chỉ số (ngày)
    # combined_df = pd.merge(img_features_df, numeric_data_df, left_index=True, right_index=True, how='inner')
    combined_df = pd.concat([img_features_df, numeric_data_df], axis=1)

    return combined_df