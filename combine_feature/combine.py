import pandas as pd
import numpy as np

def combine_features(image_features_df, numeric_features_df):

    print(f"Shape của image_features_df: {image_features_df.shape}")
    print(f"Chỉ số của image_features_df: {image_features_df.index.tolist()}")
    print(f"Shape của numeric_features_df: {numeric_features_df.shape}")
    print(f"Chỉ số của numeric_features_df: {numeric_features_df.index.tolist()}")

    # Kiểm tra shape của image_features_df
    if image_features_df.shape[0] != 1:
        raise ValueError(
            f"image_features_df phải có đúng 1 hàng, nhưng thực tế có {image_features_df.shape[0]} hàng"
        )

    # Lặp lại toàn bộ hàng của image_features_df cho tất cả các ngày trong numeric_features_df
    image_features_repeated = pd.DataFrame(
        np.tile(image_features_df.values, (len(numeric_features_df), 1)),
        index=numeric_features_df.index,
        columns=image_features_df.columns
    )

    # Kiểm tra shape của image_features_repeated
    print(f"Shape của image_features_repeated: {image_features_repeated.shape}")

    # Kết hợp hai DataFrame
    combined_df = pd.concat([image_features_repeated, numeric_features_df], axis=1)
    
    # Kiểm tra kích thước
    if len(combined_df) != len(numeric_features_df):
        raise ValueError(
            f"Kích thước của combined_df ({len(combined_df)}) không khớp với numeric_features_df ({len(numeric_features_df)})"
        )

    print(f"Shape của combined_df: {combined_df.shape}")
    print(f"Chỉ số của combined_df: {combined_df.index.tolist()}")
    return combined_df