import pandas as pd

def expand_image_features(image_features_df):

    # Kiểm tra shape ban đầu
    if image_features_df.shape[0] != 1:
        raise ValueError(
            f"image_features_df phải có đúng 1 hàng, nhưng thực tế có {image_features_df.shape[0]} hàng"
        )

    return image_features_df