import cv2
import numpy as np

def resize_mask(mask, target_size):
    """
    Resize một mask nhị phân (2D) về kích thước target_size (h, w).
    cv2.resize nhận dsize=(width, height), nên cần đảo target_size.
    """
    h, w = target_size
    return cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)


def model_segment(model, image, size_img=(320, 320)):
    """
    - model: một model segmentation trả về .masks.data (Tensor trên CPU hoặc GPU)
    - image: ảnh đầu vào đã được resize/phù hợp với kích thước mà model yêu cầu
    - size_img: tuple (h, w) mong muốn cho mask đầu ra

    Trả về:
    - combined_mask: mảng nhị phân uint8 shape (h, w, 1), pixel = 0 hoặc 255.
    """
    # 1. Dự đoán bằng model
    prediction_results = model.predict(image, show=False, save=False)

    # 2. Lấy kết quả cho ảnh đầu tiên
    result = prediction_results[0]

    h, w = size_img
    combined_mask = np.zeros((h, w), dtype=np.uint8)

    # 3. Nếu không có masks (None hoặc rỗng), trả về mask toàn 0
    if not hasattr(result, 'masks') or result.masks is None:
        return combined_mask.reshape(h, w, 1)

    # 4. Nếu có masks, lấy data và kết hợp
    masks_tensor = result.masks.data  # có thể là Tensor hoặc None
    if masks_tensor is None:
        return combined_mask.reshape(h, w, 1)

    masks_data = masks_tensor.cpu().numpy()  # (N_instances, H_orig, W_orig)
    for i in range(masks_data.shape[0]):
        single_mask = masks_data[i]
        binary_mask = (single_mask > 0.85).astype(np.uint8) * 255
        resized = resize_mask(binary_mask, size_img)
        combined_mask = np.maximum(combined_mask, resized)

    return combined_mask.reshape(h, w, 1)