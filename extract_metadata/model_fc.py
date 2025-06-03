from keras import layers, models

# Sử dụng lớp Dense để chiếu dữ liệu số về không gian đặc trưng phù hợp
def build_FC_model(input_shape=(2, )):
    input = layers.Input(shape=input_shape)
    
    fc = layers.Dense(128, activation='relu')(input)
    fc = layers.Dense(256, activation='relu')(fc)
    fc = layers.Dense(512, activation='relu')(fc)
    output = layers.Dense(1024, activation='relu')(fc)

    model = models.Model(inputs=input, outputs=output)

    return model