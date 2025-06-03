from statsmodels.tsa.statespace.sarimax import SARIMAXResults

def model_test_general(X_test, model_path):
    # Tải mô hình đã lưu
    loaded_results = SARIMAXResults.load(model_path)

    # Dự đoán trên tập test hoặc dữ liệu mới
    y_pred = loaded_results.forecast(steps=len(X_test), exog=X_test)

    return y_pred