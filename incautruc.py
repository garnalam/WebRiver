import os

def print_directory_structure(path, indent=""):
    """
    In ra cấu trúc của thư mục theo dạng cây.
    path: đường dẫn đến thư mục
    indent: chuỗi thụt đầu dòng để hiển thị phân cấp
    """
    try:
        # Kiểm tra xem đường dẫn có tồn tại và là thư mục không
        if not os.path.exists(path):
            print("Đường dẫn không tồn tại!")
            return
        if not os.path.isdir(path):
            print("Đường dẫn không phải là thư mục!")
            return

        # Lấy danh sách các mục trong thư mục
        items = os.listdir(path)
        # Sắp xếp để hiển thị thư mục trước, sau đó là file
        items.sort(key=lambda x: (not os.path.isdir(os.path.join(path, x)), x))

        for item in items:
            item_path = os.path.join(path, item)
            # Nếu là thư mục
            if os.path.isdir(item_path):
                print(f"{indent}📁 {item}/")
                # Chỉ gọi đệ quy nếu không phải là "node_modules"
                if item != "node_modules":
                    print_directory_structure(item_path, indent + "  ")
            # Nếu là file
            else:
                print(f"{indent}📄 {item}")

    except PermissionError:
        print(f"{indent}Không có quyền truy cập vào {path}")
    except Exception as e:
        print(f"{indent}Đã xảy ra lỗi: {str(e)}")

def main():
    # Nhập đường dẫn từ người dùng
    folder_path = input("Nhập đường dẫn thư mục: ")
    print(f"\nCấu trúc thư mục của {folder_path}:\n")
    print_directory_structure(folder_path)

if __name__ == "__main__":
    main()