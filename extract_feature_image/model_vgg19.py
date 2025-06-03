import numpy as np
from keras.applications import VGG19
from keras.models import Model
from keras.layers import GlobalAveragePooling2D
from keras.layers import Dense

# === Tạo mô hình feature extractor dựa trên VGG19 ===
def create_feature_extractor():
    # 1) Khởi tạo VGG19 (không gồm fully-connected layers ở top), input_shape=(320,320,3)
    base = VGG19(include_top=False, weights='imagenet', input_shape=(320, 320, 3))
    
    # 2) Lấy output của base, apply GlobalAveragePooling2D
    x = GlobalAveragePooling2D()(base.output)  # shape (None, 512)
    
    # 3) Bồi thêm 1 lớp Dense để ra output 1024 chiều
    fc1 = Dense(4096, activation='relu')(x)
    fc2 = Dense(4096, activation='relu')(fc1)
    output = Dense(1024, activation='relu')(fc2)
    
    # 4) Đóng gói thành Model input→output
    feat_model = Model(inputs=base.input, outputs=output)
    
    # 5) Freeze toàn bộ các layer của base (chỉ train được Dense mới)
    for layer in base.layers:
        layer.trainable = False

    return feat_model
