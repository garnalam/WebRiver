document.addEventListener('DOMContentLoaded', () => {
  // Element DOM
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const predictionSection = document.getElementById('prediction-section');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginMessages = document.getElementById('login-messages');
  const registerMessages = document.getElementById('register-messages');
  const changePasswordMessages = document.getElementById('change-password-messages');
  const historyMessages = document.getElementById('history-messages');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');
  const csvInput = document.getElementById('csv-input');
  const mmyyInput = document.getElementById('mmyy-input');
  const predictBtn = document.getElementById('predict-btn');
  const logOverlay = document.getElementById('log-overlay');
  const logMessages = document.getElementById('log-messages');
  const logCloseBtn = document.getElementById('log-close');
  const calendarOverlay = document.getElementById('calendar-overlay');
  const calendarGrid = document.getElementById('calendar-grid');
  const calendarCloseBtn = document.getElementById('calendar-close');
  const confirmDatesBtn = document.getElementById('confirm-dates-btn');
  const progressOverlay = document.getElementById('progress-overlay');
  const progressBar = document.getElementById('progress-bar');
  const resultOverlay = document.getElementById('result-overlay');
  const calendarGridResult = document.getElementById('calendar-grid-result');
  const resultDetails = document.getElementById('result-details');
  const downloadResultBtn = document.getElementById('download-result-btn');
  const resultCloseBtn = document.getElementById('result-close');
  const downloadSampleCsvBtn = document.getElementById('download-sample-csv');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const historyTableBody = document.getElementById('history-table-body');
  const tabs = document.querySelectorAll('.tab');

  let csvData = [];
  let lastDate = null;
  let selectedStartDate = null;
  let selectedEndDate = null;
  let predictionDates = [];
  let predictionResults = [];
  let metadataIds = [];
  let imageId = null;
  let mmyyValue = null;

  // Hàm quản lý overlay
  function openOverlay(overlay) {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Khóa cuộn khi mở overlay
    document.body.style.height = '100vh';
  }

  function closeOverlay(overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto'; // Gỡ khóa cuộn khi đóng
    document.body.style.height = 'auto';
  }

  // Hàm đóng và xóa log
  function resetLogOverlay() {
    closeOverlay(logOverlay);
    logMessages.innerHTML = ''; // Xóa nội dung log
  }

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

  // Xử lý ảnh preview
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.classList.add('hidden');
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
  logMessages.innerHTML = ''; // Xóa log cũ
  closeOverlay(calendarOverlay);
  closeOverlay(progressOverlay);
  closeOverlay(resultOverlay);
  csvData = [];
  lastDate = null;
  selectedStartDate = null;
  selectedEndDate = null;
  predictionDates = [];
  predictionResults = [];
  metadataIds = [];
  imageId = null;
  mmyyValue = null;

  openOverlay(logOverlay);

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
  logMessage('Ảnh hợp lệ.', 'success');

  if (!csvInput.files || csvInput.files.length === 0) {
    logMessage('Lỗi: Vui lòng chọn một file CSV!', 'error');
    return;
  }
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

  // Kiểm tra sự tồn tại của dd/mm/yy, bỏ kiểm tra hh
  if (!csvData.every(record => record['dd/mm/yy'])) {
    logMessage('Lỗi: Mỗi bản ghi phải có trường dd/mm/yy!', 'error');
    return;
  }
  logMessage('Tất cả bản ghi có trường dd/mm/yy.', 'success');

  if (!csvData.every(record => record.value && Array.isArray(record.value) && record.value.length === 3)) {
    logMessage('Lỗi: Mỗi bản ghi phải có trường value chứa đúng 3 cặp name-value!', 'error');
    return;
  }
  logMessage('Tất cả bản ghi có trường value hợp lệ.', 'success');

  const mmyy = mmyyInput.value;
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

  // Bỏ kiểm tra thời gian liên tiếp theo giờ vì đã gộp theo ngày
  // const dates = csvData.map(record => moment(`${record['dd/mm/yy']} ${record['hh']}`, 'DD/MM/YY HH:mm:ss'));
  // for (let i = 1; i < dates.length; i++) {
  //   if (!dates[i].isSame(dates[i - 1].clone().add(1, 'hour'))) {
  //     logMessage('Lỗi: Các thời điểm trong CSV không liên tiếp theo giờ!', 'error');
  //     return;
  //   }
  // }
  // logMessage('Các thời điểm trong CSV liên tiếp.', 'success');

  // Kiểm tra các ngày có liên tiếp không (tùy chọn, nếu cần)
  const dates = csvData.map(record => moment(record['dd/mm/yy'], 'DD/MM/YY'));
  for (let i = 1; i < dates.length; i++) {
    if (!dates[i].isSame(dates[i - 1].clone().add(1, 'day'))) {
      logMessage('Lỗi: Các ngày trong CSV không liên tiếp!', 'error');
      return;
    }
  }
  logMessage('Các ngày trong CSV liên tiếp.', 'success');

  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('mmyy', mmyy);
    formData.append('metadata', JSON.stringify(csvData.map(record => ({
      dd: record['dd'],
      'mm/yy': record['mm/yy'],
      list_value: record['value']
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

  closeOverlay(logOverlay);
  openOverlay(calendarOverlay);
  lastDate = dates[dates.length - 1];
  displayCalendar(lastDate);
});

  // Xử lý lịch
  calendarGrid.addEventListener('click', (e) => {
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
  });

  confirmDatesBtn.addEventListener('click', async () => {
    if (!selectedStartDate || !selectedEndDate) {
      logMessage('Lỗi: Vui lòng chọn khoảng ngày dự đoán!', 'error');
      return;
    }

    const daysDiff = selectedEndDate.diff(selectedStartDate, 'days') + 1;
    if (daysDiff > 30) {
      logMessage('Lỗi: Số ngày dự đoán không vượt quá 30!', 'error');
      return;
    }

    predictionDates = [];
    let currentDate = selectedStartDate.clone();
    while (currentDate.isSameOrBefore(selectedEndDate)) {
      predictionDates.push(currentDate.format('DD/MM/YY'));
      currentDate.add(1, 'day');
    }

    closeOverlay(calendarOverlay);
    openOverlay(progressOverlay);
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
        logMessage('Hoàn tất dự đoán!', 'success');

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
          logMessage('Lưu kết quả dự đoán thành công.', 'success');
        } catch (error) {
          logMessage(`Lỗi khi lưu kết quả: ${error.message}`, 'error');
        }

        closeOverlay(progressOverlay);
        resetLogOverlay(); // Xóa log sau khi dự đoán xong
        openOverlay(resultOverlay);
        displayResults();
      } catch (error) {
        logMessage(`Lỗi khi dự đoán: ${error.message}`, 'error');
        closeOverlay(progressOverlay);
        resetLogOverlay(); // Xóa log nếu dự đoán lỗi
      }
    }
  });

  // Hiển thị kết quả
  function displayResults() {
    calendarGridResult.innerHTML = '';
    resultDetails.innerHTML = '';

    predictionDates.forEach(date => {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      dayDiv.dataset.date = date;
      dayDiv.textContent = date;
      calendarGridResult.appendChild(dayDiv);
    });

    const days = document.querySelectorAll('#calendar-grid-result .calendar-day');
    days.forEach(day => {
      const dayDate = day.dataset.date;
      const result = predictionResults.find(r => r[0] === dayDate);
      if (result) {
        day.addEventListener('click', () => {
          resultDetails.innerHTML = `Ngày ${dayDate}: Mực nước dự đoán: ${result[1]} m`;
        });
      }
    });
  }

  // Tải kết quả
  downloadResultBtn.addEventListener('click', () => {
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

  // Hiển thị lịch
  function displayCalendar(lastDate) {
    calendarGrid.innerHTML = '';
    const startDate = lastDate.clone().add(1, 'day');
    for (let i = 0; i < 30; i++) {
      const date = startDate.clone().add(i, 'day');
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      dayDiv.dataset.date = date.format('DD/MM/YY');
      dayDiv.textContent = date.format('DD/MM/YY');
      calendarGrid.appendChild(dayDiv);
    }
  }

  // Parse CSV
  // Trong index.js
// Trong index.js
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

        // Parse dữ liệu thành mảng các bản ghi
        const rawData = rows.slice(1).map(row => {
          const values = row.split(',').map(val => val.trim());
          const record = {};
          headers.forEach((header, index) => {
            if (header === 'thoi_gian') {
              // Hỗ trợ nhiều định dạng thời gian
              const timeMoment = moment(values[index], [
                'M/D/YYYY H:mm',      // 7/1/2023 0:00
                'DD/MM/YYYY HH:mm:ss', // 01/07/2023 00:00:00
                'D/M/YYYY H:mm',      // 7/1/2023 0:00
                'YYYY-MM-DD HH:mm:ss' // 2023-07-01 00:00:00
              ]);
              if (!timeMoment.isValid()) {
                throw new Error(`Định dạng thời gian không hợp lệ: ${values[index]}`);
              }
              record['dd/mm/yy'] = timeMoment.format('DD/MM/YY');
              record['dd'] = timeMoment.format('DD');
              record['mm/yy'] = timeMoment.format('MM/YY');
            } else if (requiredHeaders.includes(header)) {
              const numericValue = parseFloat(values[index]);
              if (isNaN(numericValue)) {
                throw new Error(`Giá trị không hợp lệ cho ${header}: ${values[index]}`);
              }
              record[header] = numericValue;
            }
          });
          return record;
        });

        // Nhóm dữ liệu theo ngày (dd/mm/yy) và tính trung bình
        const groupedData = {};
        rawData.forEach(record => {
          const key = record['dd/mm/yy'];
          if (!groupedData[key]) {
            groupedData[key] = {
              'dd/mm/yy': record['dd/mm/yy'],
              'dd': record['dd'],
              'mm/yy': record['mm/yy'],
              values: []
            };
          }
          groupedData[key].values.push({
            muc_nuoc_ho: record['muc_nuoc_ho'],
            luu_luong_den_ho: record['luu_luong_den_ho'],
            tong_luu_luong_xa_thuc_te: record['tong_luu_luong_xa_thuc_te']
          });
        });

        // Tính trung bình cho từng ngày
        const data = Object.values(groupedData).map(group => {
          const meanValues = group.values.reduce((acc, val) => {
            acc.muc_nuoc_ho = (acc.muc_nuoc_ho || 0) + val.muc_nuoc_ho;
            acc.luu_luong_den_ho = (acc.luu_luong_den_ho || 0) + val.luu_luong_den_ho;
            acc.tong_luu_luong_xa_thuc_te = (acc.tong_luu_luong_xa_thuc_te || 0) + val.tong_luu_luong_xa_thuc_te;
            return acc;
          }, {});
          const count = group.values.length;
          return {
            'dd/mm/yy': group['dd/mm/yy'],
            'dd': group['dd'],
            'mm/yy': group['mm/yy'],
            value: [
              { name: 'Muc_nuoc_ho', value: (meanValues.muc_nuoc_ho / count).toFixed(2) },
              { name: 'Luu_luong_den_ho', value: (meanValues.luu_luong_den_ho / count).toFixed(2) },
              { name: 'Tong_luu_luong_xa_thuc_te', value: (meanValues.tong_luu_luong_xa_thuc_te / count).toFixed(2) }
            ]
          };
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
    messageDiv.className = `message p-2 rounded-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Đóng overlay
  logCloseBtn.addEventListener('click', () => {
    resetLogOverlay();
  });

  calendarCloseBtn.addEventListener('click', () => {
    closeOverlay(calendarOverlay);
    resetLogOverlay(); // Xóa log khi hủy
    selectedStartDate = null;
    selectedEndDate = null;
    const days = document.querySelectorAll('.calendar-day');
    days.forEach(day => day.classList.remove('selected'));
  });

  resultCloseBtn.addEventListener('click', () => {
    closeOverlay(resultOverlay);
    resetLogOverlay(); // Xóa log khi đóng kết quả
  });
});