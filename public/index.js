document.addEventListener('DOMContentLoaded', () => {
  // Element DOM
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const predictionSection = document.getElementById('prediction-section');
  const instructionsContent = document.getElementById('instructions-content');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginMessages = document.getElementById('login-messages');
  const registerMessages = document.getElementById('register-messages');
  const changePasswordMessages = document.getElementById('change-password-messages');
  const historyMessages = document.getElementById('history-messages');
  const imageInput = document.getElementById('image-input');
  const csvInput = document.getElementById('csv-input');
  const mmyyInput = document.getElementById('mmyy-input');
  const predictBtn = document.getElementById('predict-btn');
  const logOverlay = document.getElementById('log-overlay');
  const logMessages = document.getElementById('log-messages');
  const logCloseBtn = document.getElementById('log-close');
  const progressOverlay = document.getElementById('progress-overlay');
  const progressBar = document.getElementById('progress-bar');
  const downloadSampleCsvBtn = document.getElementById('download-sample-csv');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const historyTableBody = document.getElementById('history-table-body');
  const tabs = document.querySelectorAll('.tab');
  const originalImage = document.getElementById('original-image');
  const calendarOrResult = document.getElementById('calendar-or-result');

  let csvData = [];
  let lastDate = null;
  let selectedStartDate = null;
  let selectedEndDate = null;
  let predictionDates = [];
  let predictionResults = [];
  let metadataIds = [];
  let imageId = null;
  let mmyyValue = null;

  // Hướng dẫn cho từng tab
  const instructionsMap = {
    predict: `
      <h4 class="text-lg font-semibold text-yellow-400 mb-2">Các bước sử dụng:</h4>
      <ol class="list-decimal list-inside space-y-2">
        <li>Chọn một ảnh (định dạng RGB).</li>
        <li>Chọn file CSV chứa metadata (xem file mẫu).</li>
        <li>Nhập tháng/năm của ảnh (mm/yy).</li>
        <li>Nhấn "Dự Đoán" để kiểm tra dữ liệu.</li>
        <li>Chọn khoảng ngày dự đoán trên lịch.</li>
        <li>Nhấn "Xác Nhận" để chạy dự đoán.</li>
        <li>Xem kết quả trên lịch, nhấn vào ngày để xem chi tiết.</li>
      </ol>
    `,
    'change-password': `
      <h4 class="text-lg font-semibold text-yellow-400 mb-2">Hướng dẫn đổi mật khẩu:</h4>
      <ol class="list-decimal list-inside space-y-2">
        <li>Nhập mật khẩu cũ.</li>
        <li>Nhập mật khẩu mới và xác nhận.</li>
        <li>Nhấn "Đổi Mật Khẩu" để lưu.</li>
      </ol>
    `,
    history: `
      <h4 class="text-lg font-semibold text-yellow-400 mb-2">Hướng dẫn xem lịch sử:</h4>
      <ol class="list-decimal list-inside space-y-2">
        <li>Xem danh sách các dự đoán đã thực hiện.</li>
        <li>Nhấn "Tải CSV" để tải kết quả dự đoán.</li>
      </ol>
    `,
    logout: `
      <h4 class="text-lg font-semibold text-yellow-400 mb-2">Hướng dẫn đăng xuất:</h4>
      <ol class="list-decimal list-inside space-y-2">
        <li>Nhấn "Đăng Xuất" để thoát tài khoản.</li>
        <li>Sau đó bạn có thể đăng nhập lại.</li>
      </ol>
    `
  };

  // Kiểm tra trạng thái đăng nhập
  async function checkAuth() {
    try {
      const response = await fetch('http://localhost:5000/check-auth');
      const data = await response.json();
      if (data.isAuthenticated) {
        loginSection.classList.add('hidden');
        registerSection.classList.add('hidden');
        predictionSection.classList.remove('hidden');
        showTab('predict');
      } else {
        loginSection.classList.remove('hidden');
        registerSection.classList.add('hidden');
        predictionSection.classList.add('hidden');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      logMessage(`Lỗi kiểm tra đăng nhập: ${error.message}`, 'error', loginMessages);
    }
  }
  checkAuth();

  // Xử lý tab
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      showTab(tabId);
      if (tabId === 'history') {
        loadHistory();
      }
      if (tabId !== 'predict') {
        resetCalendarOrResult();
      }
    });
  });

  function showTab(tabId) {
    tabs.forEach(t => t.classList.remove('active'));
    ['predict-tab', 'change-password-tab', 'history-tab', 'logout-tab'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add('hidden');
    });
    const selectedTab = document.getElementById(`${tabId}-tab`);
    if (selectedTab) selectedTab.classList.remove('hidden');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    // Cập nhật nội dung hướng dẫn
    instructionsContent.innerHTML = instructionsMap[tabId] || instructionsMap.predict;
  }

  // Đăng nhập
  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      logMessage('Đăng nhập thành công.', 'success', loginMessages);
      loginSection.classList.add('hidden');
      predictionSection.classList.remove('hidden');
      showTab('predict');
    } catch (error) {
      logMessage(`Lỗi: ${error.message}`, 'error', loginMessages);
    }
  });

  // Đăng ký
  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    if (password !== confirmPassword) {
      logMessage('Mật khẩu xác nhận không khớp.', 'error', registerMessages);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      logMessage('Đăng ký thành công. Vui lòng đăng nhập.', 'success', registerMessages);
      registerSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
    } catch (error) {
      logMessage(`Lỗi: ${error.message}`, 'error', registerMessages);
    }
  });

  // Chuyển giữa đăng nhập và đăng ký
  showRegister.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
  });

  showLogin.addEventListener('click', () => {
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  // Đổi mật khẩu
  changePasswordBtn.addEventListener('click', async () => {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
      logMessage('Mật khẩu mới và xác nhận không khớp.', 'error', changePasswordMessages);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      logMessage('Đổi mật khẩu thành công.', 'success', changePasswordMessages);
    } catch (error) {
      logMessage(`Lỗi: ${error.message}`, 'error', changePasswordMessages);
    }
  });

  // Đăng xuất
  logoutBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('http://localhost:5000/logout', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      predictionSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      await checkAuth();
    } catch (error) {
      logMessage(`Lỗi khi đăng xuất: ${error.message}`, 'error', logMessages);
      console.error('Error logging out:', error);
    }
  });

  // Tải lịch sử dự đoán
  async function loadHistory() {
    try {
      const response = await fetch('http://localhost:5000/history', {
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      historyTableBody.innerHTML = '';
      data.history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="p-2">${moment(item.created_at).format('DD/MM/YYYY HH:mm:ss')}</td>
          <td class="p-2">${item.image_id}</td>
          <td class="p-2"><span class="prediction-box">${item.prediction_count}</span></td>
          <td class="p-2"><a href="/download-prediction/${item._id}" class="inline-block px-4 py-1 bg-yellow-500 text-gray-900 rounded-full hover:bg-yellow-400 transition-all duration-300">Tải CSV</a></td>
        `;
        historyTableBody.appendChild(row);
      });
    } catch (error) {
      logMessage(`Lỗi: ${error.message}`, 'error', historyMessages);
    }
  }

  // Xử lý ảnh
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        originalImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Tải file mẫu
  downloadSampleCsvBtn.addEventListener('click', () => {
    const sampleCsvContent = `thoi_gian,muc_nuoc_ho,luu_luong_den_ho,tong_luu_luong_xa_thuc_te
2023-07-01 00:00:00,428.85,52.0,35.84
2023-07-01 01:00:00,428.84,52.0,33.52
2023-07-01 02:00:00,428.84,52.0,35.76
2023-07-01 03:00:00,428.84,52.0,36.62`;
    const csvFile = new Blob([sampleCsvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(csvFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_metadata.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  });

  // Xử lý nút Predict
  predictBtn.addEventListener('click', async () => {
    logMessages.innerHTML = '';
    progressOverlay.style.display = 'none';
    csvData = [];
    lastDate = null;
    selectedStartDate = null;
    selectedEndDate = null;
    predictionDates = [];
    predictionResults = [];
    metadataIds = [];
    imageId = null;
    mmyyValue = null;

    logOverlay.style.display = 'flex';

    try {
      // Kiểm tra ảnh đầu vào
      if (!imageInput.files || imageInput.files.length === 0) {
        logMessage('Lỗi: Vui lòng chọn một ảnh!', 'error');
        return;
      }
      const imageFile = imageInput.files[0];
      const imageMimeType = imageFile.type;
      if (!imageMimeType || !imageMimeType.startsWith('image/')) {
        logMessage('Lỗi: File không phải là ảnh hợp lệ!', 'error');
        return;
      }

      // Gọi API để kiểm tra ảnh có con sông hay không
      logMessage('Đang kiểm tra ảnh hợp lệ...', 'info');
      const formData = new FormData();
      formData.append('image', imageFile);
      const checkResponse = await fetch('http://localhost:5000/check-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const checkResult = await checkResponse.json();
      if (!checkResponse.ok) {
        throw new Error(checkResult.message || 'Lỗi khi kiểm tra ảnh');
      }

      // Nếu không phát hiện được con sông, báo lỗi và dừng
      if (!checkResult.has_river) {
        logMessage(checkResult.error || 'Ảnh không hợp lệ: Không phát hiện được con sông.', 'error');
        return;
      }

      // Nếu phát hiện được con sông, hiển thị thông báo xanh
      logMessage('Ảnh hợp lệ.', 'success');

      // Tiếp tục các kiểm tra khác trong Check Log
      if (!csvInput.files || csvInput.files.length === 0) {
        logMessage('Lỗi: Vui lòng chọn một file CSV!', 'error');
        return;
      }
      logMessage('Đang kiểm tra file CSV...', 'info');
      const csvFile = csvInput.files[0];
      try {
        csvData = await parseCSV(csvFile);
        logMessage(`Đã đọc file CSV: ${csvData.length} bản ghi.`, 'success');
        console.log('Dữ liệu CSV:', JSON.stringify(csvData, null, 2));
      } catch (error) {
        logMessage(`Lỗi khi đọc file CSV: ${error.message}`, 'error');
        return;
      }

      if (csvData.length < 4) {
        logMessage('Lỗi: File CSV phải có ít nhất 4 bản ghi!', 'error');
        return;
      }
      logMessage('Số lượng bản ghi đủ (>= 4).', 'success');

      if (!csvData.every(record => record['dd/mm/yy'] && record['hh'])) {
        logMessage('Lỗi: Mỗi bản ghi phải có trường dd/mm/yy và hh!', 'error');
        return;
      }
      logMessage('Tất cả bản ghi có trường dd/mm/yy và hh.', 'success');

      if (!csvData.every(record => record.value && Array.isArray(record.value) && record.value.length === 3)) {
        logMessage('Lỗi: Mỗi bản ghi phải có trường value chứa đúng 3 cặp name-value!', 'error');
        return;
      }
      logMessage('Tất cả bản ghi có trường value hợp lệ.', 'success');

      const mmyy = mmyyInput.value;
      logMessage('Đang kiểm tra tháng/năm...', 'info');
      if (!mmyy.match(/^\d{2}\/\d{2}$/)) {
        logMessage('Lỗi: Định dạng tháng/năm không hợp lệ. Sử dụng mm/yy (ví dụ: 07/23)!', 'error');
        return;
      }
      logMessage('Tháng/năm của ảnh hợp lệ.', 'success');

      const csvMMYYs = csvData.map(record => record['mm/yy']);
      if (!csvMMYYs.every(csvMMYY => csvMMYY === mmyy)) {
        logMessage('Lỗi: Tháng/năm của ảnh không khớp với CSV!', 'error');
        return;
      }
      logMessage('Tháng/năm khớp với CSV.', 'success');

      const dates = csvData.map(record => moment(`${record['dd/mm/yy']} ${record['hh']}`, 'DD/MM/YY HH:mm:ss'));
      logMessage('Đang kiểm tra thời điểm trong CSV...', 'info');
      for (let i = 1; i < dates.length; i++) {
        if (!dates[i].isSame(dates[i - 1].clone().add(1, 'hour'))) {
          logMessage('Lỗi: Các thời điểm trong CSV không liên tiếp theo giờ!', 'error');
          return;
        }
      }
      logMessage('Các thời điểm trong CSV liên tiếp.', 'success');

      logMessage('Đang lưu dữ liệu vào database...', 'info');
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('mmyy', mmyy);
        formData.append('metadata', JSON.stringify(csvData.map(record => ({
          hh: record['hh'],
          dd: record['dd'],
          'mm/yy': record['mm/yy'],
          list_value: record.value
        }))));
        const response = await fetch('http://localhost:5000/save-data', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Lỗi không biết');
        imageId = data.image_id;
        metadataIds = data.metadata_ids;
        mmyyValue = data.mmyy;
        logMessage('Đã lưu ảnh và metadata vào database.', 'success');
      } catch (error) {
        logMessage(`Lỗi khi lưu dữ liệu: ${error.message}`, 'error');
        return;
      }

      // Tự động đóng log overlay sau 1 giây và hiển thị lịch
      setTimeout(() => {
        logOverlay.style.display = 'none';
        lastDate = dates[dates.length - 1];
        displayCalendar(lastDate);
      }, 1000);
    } catch (error) {
      console.error('Lỗi trong Check Log:', error.message);
      logMessage(`Lỗi: ${error.message}`, 'error');
    }
  });

  // Xử lý lịch chọn ngày dự đoán
  function handleCalendarClick(e) {
    if (e.target.classList.contains('calendar-day')) {
      const selectedDate = e.target.dataset.date;
      const selectedMoment = moment(selectedDate, 'DD/MM/YY');

      if (!selectedStartDate) {
        selectedStartDate = selectedMoment;
        e.target.classList.add('selected');
      } else if (!selectedEndDate && (selectedMoment.isSame(selectedStartDate) || selectedMoment.isAfter(selectedStartDate))) {
        selectedEndDate = selectedMoment;
        const days = document.querySelectorAll('.calendar-day');
        days.forEach(day => {
          const dayMoment = moment(day.dataset.date, 'DD/MM/YY');
          if (dayMoment.isSameOrAfter(selectedStartDate) && dayMoment.isSameOrBefore(selectedEndDate)) {
            day.classList.add('selected');
          }
        });
      } else {
        selectedStartDate = selectedMoment;
        selectedEndDate = null;
        const days = document.querySelectorAll('.calendar-day');
        days.forEach(day => day.classList.remove('selected'));
        e.target.classList.add('selected');
      }
    }
  }

  // Hiển thị lịch 30 ngày để chọn ngày dự đoán
  function displayCalendar(lastDate) {
      calendarOrResult.innerHTML = `
          <h3 class="text-lg font-bold mb-2 text-center text-gray-100">Chọn Ngày Dự Đoán</h3>
          <div id="calendar-grid" class="grid grid-cols-7 gap-2 mb-4"></div>
          <div class="text-center">
            <button id="confirm-dates-btn" class="bg-gradient-to-r from-yellow-500 to-blue-400 text-gray-900 px-6 py-2 rounded-lg hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300">Xác Nhận</button>
          </div>
        `;

      const calendarGrid = document.getElementById('calendar-grid');
      const confirmDatesBtn = document.getElementById('confirm-dates-btn');

      const startDate = lastDate.clone().add(1, 'day'); // Bắt đầu từ ngày sau ngày cuối cùng trong CSV
      for (let i = 0; i < 30; i++) {
        const date = startDate.clone().add(i, 'day');
        const dayDiv = document.createElement('div');
        // Cập nhật class để đảm bảo kích thước và tránh tràn chữ
        dayDiv.className = 'calendar-day w-16 h-12 flex items-center justify-center border border-yellow-500 border-opacity-30 text-center cursor-pointer hover:bg-gray-700 text-sm overflow-hidden';
        dayDiv.dataset.date = date.format('DD/MM/YY');
        dayDiv.textContent = date.format('DD/MM/YY');
        calendarGrid.appendChild(dayDiv);
      }

    calendarGrid.addEventListener('click', handleCalendarClick);

    confirmDatesBtn.addEventListener('click', async () => {
      if (!selectedStartDate || !selectedEndDate) {
        logMessage('Lỗi: Vui lòng chọn khoảng ngày dự đoán!', 'error');
        logOverlay.style.display = 'flex';
        return;
      }

      const daysDiff = selectedEndDate.diff(selectedStartDate, 'days') + 1;
      if (daysDiff > 30) {
        logMessage('Lỗi: Số ngày dự đoán không vượt quá 30!', 'error');
        logOverlay.style.display = 'flex';
        return;
      }

      predictionDates = [];
      let currentDate = selectedStartDate.clone();
      while (currentDate.isSameOrBefore(selectedEndDate)) {
        predictionDates.push(currentDate.format('DD/MM/YY'));
        currentDate.add(1, 'day');
      }

      progressOverlay.style.display = 'flex';
      progressBar.style.width = '0%';

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(progressInterval);
          performPrediction();
        }
      }, 300);

      async function performPrediction() {
        try {
          // Không hiển thị logOverlay trong quá trình dự đoán
          const response = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prediction_dates: predictionDates,
              image_id: imageId,
              metadata_ids: metadataIds,
              mmyy: mmyyValue
            }),
            credentials: 'include'
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Lỗi không biết');
          predictionResults = data.results;

          try {
            const response = await fetch('http://localhost:5000/save-prediction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metadata_ids: metadataIds,
                image_id: imageId,
                predictions: predictionResults
              }),
              credentials: 'include'
            });
            const saveData = await response.json();
            if (!response.ok) throw new Error(saveData.message || 'Lỗi không biết');
          } catch (error) {
            logMessage(`Lỗi khi lưu kết quả: ${error.message}`, 'error');
            logOverlay.style.display = 'flex';
          }

          progressOverlay.style.display = 'none';
          displayResults();
        } catch (error) {
          logMessage(`Lỗi khi dự đoán: ${error.message}`, 'error');
          progressOverlay.style.display = 'none';
          logOverlay.style.display = 'flex';
        }
      }
    });
  }

  // Hiển thị kết quả dưới dạng lịch
  function displayResults() {
    calendarOrResult.innerHTML = `
      <h3 class="text-lg font-bold mb-2 text-center text-gray-100">Kết Quả Dự Đoán</h3>
      <div id="result-calendar-grid" class="grid grid-cols-7 gap-2 mb-4"></div>
      <div id="prediction-detail" class="text-center text-gray-100 mb-4"></div>
      <div class="text-center mt-4">
        <button id="download-result-btn" class="bg-gradient-to-r from-yellow-500 to-blue-400 text-gray-900 px-6 py-2 rounded-lg hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 mr-2">Tải Về (.csv)</button>
        <button id="refresh-btn" class="bg-gradient-to-r from-gray-500 to-gray-400 text-gray-900 px-6 py-2 rounded-lg hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300">Làm Mới</button>
      </div>
    `;

    const resultCalendarGrid = document.getElementById('result-calendar-grid');
    const predictionDetail = document.getElementById('prediction-detail');

    // Hiển thị lịch với các ngày đã dự đoán
    const startDate = moment(predictionDates[0], 'DD/MM/YY');
    const endDate = moment(predictionDates[predictionDates.length - 1], 'DD/MM/YY');
    const totalDays = endDate.diff(startDate, 'days') + 1;

    for (let i = 0; i < totalDays; i++) {
      const date = startDate.clone().add(i, 'day');
      const dateStr = date.format('DD/MM/YY');
      const dayDiv = document.createElement('div');
      // Cập nhật class để đảm bảo kích thước và tránh tràn chữ
      dayDiv.className = 'calendar-day w-16 h-12 flex items-center justify-center border border-yellow-500 border-opacity-30 text-center cursor-pointer hover:bg-gray-700 text-sm overflow-hidden';
      dayDiv.dataset.date = dateStr;
      dayDiv.textContent = dateStr;

      // Nếu ngày này nằm trong predictionDates, tô màu để phân biệt
      if (predictionDates.includes(dateStr)) {
        dayDiv.classList.add('bg-gray-700');
      }

      resultCalendarGrid.appendChild(dayDiv);
    }

    // Logic sự kiện giữ nguyên
    resultCalendarGrid.addEventListener('click', (e) => {
      if (e.target.classList.contains('calendar-day')) {
        const selectedDate = e.target.dataset.date;
        const result = predictionResults.find(r => r[0] === selectedDate);
        if (result) {
          predictionDetail.innerHTML = `Mực nước dự đoán ngày ${selectedDate}: ${result[1]} m`;
        } else {
          predictionDetail.innerHTML = `Không có dữ liệu dự đoán cho ngày ${selectedDate}.`;
        }
      }
    });

    document.getElementById('download-result-btn').addEventListener('click', () => {
      const csvContent = predictionResults.map(r => `${r[0]},${r[1]}`).join('\n');
      const csvHeader = 'Date,WaterLevel\n';
      const csvFile = new Blob([csvHeader + csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(csvFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prediction_results.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      resetForm();
      resetCalendarOrResult();
    });
}

  // Reset form
  function resetForm() {
    imageInput.value = '';
    csvInput.value = '';
    mmyyInput.value = '';
    originalImage.src = '';
    csvData = [];
    lastDate = null;
    selectedStartDate = null;
    selectedEndDate = null;
    predictionDates = [];
    predictionResults = [];
    metadataIds = [];
    imageId = null;
    mmyyValue = null;
  }

  // Reset calendar or result section
  function resetCalendarOrResult() {
    calendarOrResult.innerHTML = '';
  }

  // Parse CSV
  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const rows = text.split('\n').filter(row => row.trim());
          const headers = rows[0].split(',').map(header => header.trim());
          
          const requiredHeaders = ['thoi_gian', 'muc_nuoc_ho', 'luu_luong_den_ho', 'tong_luu_luong_xa_thuc_te'];
          if (!requiredHeaders.every(h => headers.includes(h))) {
            throw new Error('File CSV phải chứa các cột: thoi_gian, muc_nuoc_ho, luu_luong_den_ho, tong_luu_luong_xa_thuc_te');
          }

          const data = rows.slice(1).map(row => {
            const values = row.split(',').map(val => val.trim());
            const record = { value: [] };
            headers.forEach((header, index) => {
              if (header === 'thoi_gian') {
                const timeMoment = moment(values[index], 'YYYY-MM-DD HH:mm:ss');
                if (!timeMoment.isValid()) {
                  throw new Error(`Định dạng thời gian không hợp lệ: ${values[index]}`);
                }
                record['dd/mm/yy'] = timeMoment.format('DD/MM/YY');
                record['hh'] = timeMoment.format('HH:mm:ss');
                record['dd'] = timeMoment.format('DD');
                record['mm/yy'] = timeMoment.format('MM/YY');
              } else if (requiredHeaders.includes(header)) {
                const numericValue = parseFloat(values[index]);
                if (isNaN(numericValue)) {
                  throw new Error(`Giá trị không hợp lệ cho ${header}: ${values[index]}`);
                }
                let name;
                switch (header) {
                  case 'muc_nuoc_ho':
                    name = 'Muc_nuoc_ho';
                    break;
                  case 'luu_luong_den_ho':
                    name = 'Luu_luong_den_ho';
                    break;
                  case 'tong_luu_luong_xa_thuc_te':
                    name = 'Tong_luu_luong_xa_thuc_te';
                    break;
                }
                record.value.push({
                  name,
                  value: numericValue
                });
              }
            });
            return record;
          });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file CSV'));
      reader.readAsText(file);
    });
  }

  // Log message
  function logMessage(message, type, container = logMessages) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message p-2 rounded-lg text-white ${
      type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500'
    }`;
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Đóng overlay
  logCloseBtn.addEventListener('click', () => {
    logOverlay.style.display = 'none';
  });
});