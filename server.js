const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const moment = require('moment');
const path = require('path');
const mime = require('mime-types');
const session = require('express-session');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

dotenv.config();

const app = express();

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  tls: true
})
.then(() => console.log('Kết nối MongoDB thành công'))
.catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Khởi tạo GridFSBucket
let gfsBucket;
const conn = mongoose.connection;
conn.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'fs'
  });
  console.log('GridFSBucket đã được khởi tạo');
});

// Định nghĩa schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'users', versionKey: false });

const User = mongoose.model('User', userSchema);

const imageSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  'mm/yy': { type: String, required: true, match: /^\d{2}\/\d{2}$/ },
  id_file: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'fs.files' },
  mask_image: {
    type: {
      id_mask: { type: mongoose.Schema.Types.ObjectId, default: null },
      id_file: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    default: null
  }
}, { collection: 'image', versionKey: false });

const Image = mongoose.model('Image', imageSchema);

const metadataSchema = new mongoose.Schema({
  id_image: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'image' },
  hh: { type: String, required: true, match: /^\d{2}:\d{2}:\d{2}$/ },
  dd: { type: String, required: true, match: /^\d{2}$/ },
  'mm/yy': { type: String, required: true, match: /^\d{2}\/\d{2}$/ },
  list_value: [{ name: { type: String, required: true }, value: { type: String, required: true } }]
}, { collection: 'metadata', versionKey: false });

const Metadata = mongoose.model('Metadata', metadataSchema);

const predictionSchema = new mongoose.Schema({
  id_metadata: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'metadata' }],
  id_image: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'image' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
  predictions: [[String, Number]],
  created_at: { type: Date, default: Date.now }
}, { collection: 'prediction', versionKey: false });

const Prediction = mongoose.model('Prediction', predictionSchema);

// Cấu hình Multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = mime.lookup(file.originalname) || file.mimetype;
    if (mimeType && mimeType.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File không phải là ảnh hợp lệ'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  console.log(`Nhận request: ${req.method} ${req.url}`);
  next();
});

// Hàm hash mật khẩu
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Route đăng ký user
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const user = new User({
      username,
      password_hash: hashPassword(password)
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Route đăng nhập user
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await User.findOne({ username });
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    req.session.user_id = user._id.toString();
    console.log(`User logged in: ${username}, session: ${req.session.user_id}`);
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Route đăng xuất user
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    console.log('User logged out');
    res.status(200).json({ message: 'Logout successful' });
  });
});

// Route kiểm tra đăng nhập user
app.get('/check-auth', (req, res) => {
  if (req.session.user_id) {
    res.status(200).json({ isAuthenticated: true });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

// Route đổi mật khẩu user
app.post('/change-password', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { old_password, new_password, confirm_password } = req.body;
    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }
    const user = await User.findById(req.session.user_id);
    if (!user || user.password_hash !== hashPassword(old_password)) {
      return res.status(401).json({ message: 'Invalid old password' });
    }
    user.password_hash = hashPassword(new_password);
    await user.save();
    console.log(`Password changed for user: ${user.username}`);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
});

// Mật khẩu admin
let adminPasswordHash = 'b8b4b727d6f5d1b61fff7be687f7970f';

// Route đăng nhập admin
app.post('/admin/login', (req, res) => {
  const { passwordHash } = req.body;
  console.log('Admin login attempt:', { passwordHash });
  if (passwordHash === adminPasswordHash) {
    req.session.isAdminAuthenticated = true;
    console.log('Admin logged in successfully');
    res.status(200).json({ message: 'Đăng nhập thành công' });
  } else {
    console.log('Admin login failed: Invalid password');
    res.status(401).json({ message: 'Mật khẩu không đúng' });
  }
});

// Route kiểm tra đăng nhập admin
app.get('/admin/check-auth', (req, res) => {
  if (req.session.isAdminAuthenticated) {
    res.status(200).json({ isAuthenticated: true });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

// Route đăng xuất admin
app.post('/admin/logout', (req, res) => {
  req.session.isAdminAuthenticated = false;
  console.log('Admin logged out');
  res.status(200).json({ message: 'Đăng xuất thành công' });
});

// Route đổi mật khẩu admin
app.post('/admin/change-password', (req, res) => {
  if (!req.session.isAdminAuthenticated) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  const { newPasswordHash } = req.body;
  adminPasswordHash = newPasswordHash;
  console.log('Admin password changed');
  res.status(200).json({ message: 'Đổi mật khẩu thành công' });
});

// Middleware kiểm tra đăng nhập admin
const requireAdminAuth = (req, res, next) => {
  if (!req.session.isAdminAuthenticated) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  next();
};

// Route lưu ảnh và metadata
app.post('/save-data', upload.single('image'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    console.log('Vào route /save-data');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
      throw new Error('Vui lòng cung cấp file ảnh');
    }
    if (!req.body.mmyy) {
      throw new Error('Vui lòng cung cấp tháng/năm (mm/yy)');
    }
    if (!req.body.metadata) {
      throw new Error('Vui lòng cung cấp metadata');
    }

    const mmyy = req.body.mmyy;
    if (!mmyy.match(/^\d{2}\/\d{2}$/)) {
      throw new Error('Định dạng mm/yy không hợp lệ (ví dụ: 07/23)');
    }

    let metadata;
    try {
      metadata = JSON.parse(req.body.metadata);
    } catch (error) {
      throw new Error('Metadata không phải JSON hợp lệ');
    }
    if (!Array.isArray(metadata) || metadata.length === 0) {
      throw new Error('Metadata phải là mảng không rỗng');
    }

    if (!gfsBucket) {
      throw new Error('GridFSBucket chưa được khởi tạo');
    }

    const year = parseInt(`20${mmyy.split('/')[1]}`);
    const month = parseInt(mmyy.split('/')[0]) - 1;
    const isoDate = moment({ year, month, day: 1 }).toDate();

    let mimeType = mime.lookup(req.file.originalname) || req.file.mimetype;
    if (mimeType === 'application/octet-stream') {
      const extension = path.extname(req.file.originalname).toLowerCase();
      mimeType = mime.lookup(extension) || 'image/png';
    }

    const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
      chunkSizeBytes: 261120,
      metadata: {
        mimeType: mimeType,
        type: 'image',
        datetime: isoDate
      },
      session
    });

    const writePromise = new Promise((resolve, reject) => {
      uploadStream.write(req.file.buffer, (error) => {
        if (error) {
          reject(new Error(`Lỗi khi ghi dữ liệu vào GridFS: ${error.message}`));
        } else {
          resolve(true);
        }
      });
    });

    await writePromise;
    uploadStream.end();

    const fileId = await new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id));
      uploadStream.on('error', reject);
    });

    const newImage = new Image({
      date: isoDate,
      'mm/yy': mmyy,
      id_file: fileId,
      mask_image: null
    });
    await newImage.save({ session });
    const imageId = newImage._id.toString();

    const metadataRecords = metadata.map(record => ({
      id_image: newImage._id,
      hh: record['hh'],
      dd: record['dd'],
      'mm/yy': record['mm/yy'],
      list_value: record['list_value']
    }));
    const savedRecords = await Metadata.insertMany(metadataRecords, { session });
    const metadataIds = savedRecords.map(record => record._id.toString());

    await session.commitTransaction();
    console.log(`Đã lưu ảnh (ID: ${imageId}) và ${metadataIds.length} bản ghi metadata`);

    res.status(201).json({
      message: 'Lưu dữ liệu thành công',
      image_id: imageId,
      metadata_ids: metadataIds,
      mmyy
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Lỗi khi lưu dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi khi lưu dữ liệu', error: error.message });
  } finally {
    session.endSession();
  }
});

// Route dự đoán
app.post('/predict', async (req, res) => {
  try {
    const { prediction_dates, image_id, metadata_ids, mmyy } = req.body;
    if (!Array.isArray(prediction_dates) || prediction_dates.length === 0) {
      return res.status(400).json({ message: 'Danh sách ngày dự đoán không hợp lệ' });
    }
    if (!image_id || !Array.isArray(metadata_ids) || metadata_ids.length === 0) {
      return res.status(400).json({ message: 'image_id hoặc metadata_ids không hợp lệ' });
    }
    if (!mmyy || !mmyy.match(/^\d{2}\/\d{2}$/)) {
      return res.status(400).json({ message: 'mmyy không hợp lệ (ví dụ: 07/23)' });
    }

    const image = await Image.findById(image_id);
    if (!image) {
      return res.status(404).json({ message: 'Không tìm thấy ảnh' });
    }
    const file = await conn.db.collection('fs.files').findOne({ _id: new mongoose.Types.ObjectId(image.id_file) });
    if (!file) {
      return res.status(404).json({ message: 'Không tìm thấy file ảnh' });
    }

    let image_buffer = Buffer.from('');
    const downloadStream = gfsBucket.openDownloadStream(file._id);
    downloadStream.on('data', (chunk) => {
      image_buffer = Buffer.concat([image_buffer, chunk]);
    });

    await new Promise((resolve, reject) => {
      downloadStream.on('end', resolve);
      downloadStream.on('error', reject);
    });

    const metadata_records = await Metadata.find({ _id: { $in: metadata_ids.map(id => new mongoose.Types.ObjectId(id)) } }).lean();
    if (metadata_records.length !== metadata_ids.length) {
      return res.status(404).json({ message: 'Không tìm thấy một số metadata' });
    }

    const tempDir = os.tmpdir();
    const tempImagePath = path.join(tempDir, `temp_image_${Date.now()}.jpg`);
    const tempMetadataPath = path.join(tempDir, `temp_metadata_${Date.now()}.json`);
    const tempOutputPath = path.join(tempDir, `temp_output_${Date.now()}.json`);

    try {
      await fs.writeFile(tempImagePath, image_buffer);
      await fs.writeFile(tempMetadataPath, JSON.stringify({
        metadata: metadata_records,
        prediction_dates,
        mmyy
      }));
      console.log(`Đã lưu file tạm: ${tempImagePath}, ${tempMetadataPath}`);
    } catch (error) {
      throw new Error(`Lỗi khi lưu file tạm: ${error.message}`);
    }

    const pythonScriptPath = path.join(__dirname, 'test.py');
    try {
      await fs.access(pythonScriptPath);
      console.log(`Tìm thấy test.py tại ${pythonScriptPath}`);
    } catch {
      throw new Error(`File test.py không tồn tại tại ${pythonScriptPath}`);
    }

    const pythonProcess = spawn('python', [
      pythonScriptPath,
      tempImagePath,
      tempMetadataPath,
      tempOutputPath
    ]);

    let stderrData = '';
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error('Python stderr:', stderrData);
          reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
        } else {
          resolve();
        }
      });
    });

    let result;
    try {
      const outputData = await fs.readFile(tempOutputPath, 'utf-8');
      result = JSON.parse(outputData);
      console.log('Python output:', result);
    } catch (error) {
      throw new Error(`Lỗi khi đọc output từ ${tempOutputPath}: ${error.message}`);
    }

    try {
      await fs.unlink(tempImagePath);
      await fs.unlink(tempMetadataPath);
      await fs.unlink(tempOutputPath);
      console.log('Đã xóa file tạm');
    } catch (error) {
      console.warn('Cảnh báo: Không xóa được file tạm:', error.message);
    }

    const predictions = result.predictions;
    const mask_buffer = Buffer.from(result.mask_buffer, 'base64');

    const mask_filename = `mask_${file.filename}`;
    const mask_uploadStream = gfsBucket.openUploadStream(mask_filename, {
      chunkSizeBytes: 261120,
      metadata: {
        mimeType: 'image/jpeg',
        type: 'mask',
        datetime: file.metadata.datetime
      }
    });

    mask_uploadStream.write(mask_buffer);
    mask_uploadStream.end();

    const mask_fileId = await new Promise((resolve, reject) => {
      mask_uploadStream.on('finish', () => resolve(mask_uploadStream.id));
      mask_uploadStream.on('error', reject);
    });

    const mask_id = new mongoose.Types.ObjectId();
    await Image.findByIdAndUpdate(image_id, {
      'mask_image': {
        id_mask: mask_id,
        id_file: mask_fileId
      }
    }, { new: true });
    console.log(`Đã cập nhật mask cho image ${image_id}`);

    res.status(200).json({ 
      message: 'Dự đoán thành công', 
      results: predictions,
      mask_buffer: result.mask_buffer
    });
  } catch (error) {
    console.error('Lỗi khi dự đoán:', error);
    try {
      await Promise.all([
        fs.unlink(tempImagePath).catch(() => {}),
        fs.unlink(tempMetadataPath).catch(() => {}),
        fs.unlink(tempOutputPath).catch(() => {})
      ]);
      console.log('Đã xóa file tạm trong trường hợp lỗi');
    } catch (cleanupError) {
      console.warn('Cảnh báo: Không xóa được file tạm:', cleanupError.message);
    }
    res.status(500).json({ message: 'Lỗi khi dự đoán', error: error.message });
  }
});

// Route lưu dự đoán
app.post('/save-prediction', async (req, res) => {
  try {
    const { metadata_ids, image_id, predictions } = req.body;
    if (!Array.isArray(metadata_ids) || metadata_ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách metadata_ids không hợp lệ' });
    }
    if (!image_id) {
      return res.status(400).json({ message: 'image_id không hợp lệ' });
    }
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.status(400).json({ message: 'Danh sách dự đoán không hợp lệ' });
    }

    const predictionRecord = {
      id_metadata: metadata_ids.map(id => new mongoose.Types.ObjectId(id)),
      id_image: new mongoose.Types.ObjectId(image_id),
      user_id: req.session.user_id ? new mongoose.Types.ObjectId(req.session.user_id) : null,
      predictions,
      created_at: new Date()
    };
    const savedPrediction = await Prediction.create(predictionRecord);
    console.log(`Đã lưu prediction: ${savedPrediction._id}`);

    res.status(201).json({ message: 'Lưu kết quả dự đoán thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu prediction:', error);
    res.status(500).json({ message: 'Lỗi khi lưu prediction', error: error.message });
  }
});

// Route xem lịch sử dự đoán
app.get('/history', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const predictions = await Prediction.find({ user_id: req.session.user_id })
      .sort({ created_at: -1 })
      .lean();
    const history = predictions.map(pred => ({
      _id: pred._id.toString(),
      image_id: pred.id_image.toString(),
      prediction_count: pred.predictions.length,
      created_at: pred.created_at
    }));
    res.status(200).json({ message: 'Lấy lịch sử dự đoán thành công', history });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử', error: error.message });
  }
});

// Route tải file CSV dự đoán
app.get('/download-prediction/:id', async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      user_id: req.session.user_id
    }).lean();
    if (!prediction) {
      return res.status(404).json({ message: 'Không tìm thấy dự đoán' });
    }
    const csvContent = prediction.predictions.map(r => `${r[0]},${r[1]}`).join('\n');
    const csvHeader = 'Date,WaterLevel\n';
    const csvFile = Buffer.from(csvHeader + csvContent);
    res.setHeader('Content-Disposition', `attachment; filename=prediction_${req.params.id}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvFile);
  } catch (error) {
    console.error('Lỗi khi tải CSV:', error);
    res.status(500).json({ message: 'Lỗi khi tải CSV', error: error.message });
  }
});

// Route xóa dữ liệu
app.post('/clean-all-data', requireAdminAuth, async (req, res) => {
  try {
    const imageResult = await Image.deleteMany({});
    console.log(`Xóa ${imageResult.deletedCount} bản ghi ảnh`);
    const metadataResult = await Metadata.deleteMany({});
    console.log(`Xóa ${metadataResult.deletedCount} bản ghi metadata`);
    const predictionResult = await Prediction.deleteMany({});
    console.log(`Xóa ${predictionResult.deletedCount} bản ghi dự đoán`);
    const filesResult = await conn.db.collection('fs.files').deleteMany({});
    console.log(`Xóa ${filesResult.deletedCount} bản ghi fs.files`);
    const chunksResult = await conn.db.collection('fs.chunks').deleteMany({});
    console.log(`Xóa ${chunksResult.deletedCount} bản ghi fs.chunks`);
    res.status(200).json({ message: 'Xóa dữ liệu thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi khi xóa dữ liệu', error: error.message });
  }
});

// Route lấy danh sách ảnh
app.get('/get-image-records', requireAdminAuth, async (req, res) => {
  try {
    const images = await Image.find().lean();
    console.log('Số bản ghi ảnh:', images.length);

    if (images.length === 0) {
      return res.status(200).json({ records: [] });
    }

    const fileIds = images.map(image => image.id_file);
    const files = await conn.db.collection('fs.files').find({ _id: { $in: fileIds } }).toArray();

    const fileMap = files.reduce((map, file) => {
      map[file._id.toString()] = file;
      return map;
    }, {});

    const records = images.map(image => {
      const file = fileMap[image.id_file.toString()];
      return {
        _id: image._id.toString(),
        filename: file ? file.filename : 'Không tìm thấy file',
        date: image.date,
        file_id: file ? file._id.toString() : null
      };
    });

    res.status(200).json({ message: 'Lấy danh sách ảnh thành công', records });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh:', error);
    res.status(500).json({ message: 'Lấy danh sách ảnh thành công', records });
  }
});

// Route lấy ảnh
app.get('/get-image/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const file = await conn.db.collection('fs.files').findOne({ _id: fileId });
    if (!file) {
      return res.status(404).json({ message: 'Không tìm thấy file' });
    }

    res.set('Content-Type', file.metadata.mimeType);
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Lỗi khi tải ảnh:', error);
      res.status(500).json({ message: 'Lỗi khi tải ảnh', error: error.message });
    });
  } catch (error) {
    console.error('Lỗi khi tải ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi tải ảnh', error: error.message });
  }
});

// Route admin
app.get('/admin/images', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalRecords = await Image.countDocuments();
    const images = await Image.find().skip(skip).limit(limit).lean();

    res.status(200).json({
      records: images,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách ảnh', error: error.message });
  }
});

app.get('/admin/metadata', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalRecords = await Metadata.countDocuments();
    const metadata = await Metadata.find().skip(skip).limit(limit).lean();

    res.status(200).json({
      records: metadata,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách metadata:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách metadata', error: error.message });
  }
});

app.get('/admin/predictions', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalRecords = await Prediction.countDocuments();
    const predictions = await Prediction.find().skip(skip).limit(limit).lean();

    res.status(200).json({
      records: predictions,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách dự đoán:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách dự đoán', error: error.message });
  }
});

app.put('/admin/image/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { mm_yy } = req.body;
    const updatedImage = await Image.findByIdAndUpdate(
      id,
      { 'mm/yy': mm_yy },
      { new: true }
    );
    if (!updatedImage) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }
    res.status(200).json({ message: 'Cập nhật thành công', record: updatedImage });
  } catch (error) {
    console.error('Lỗi khi cập nhật ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật ảnh', error: error.message });
  }
});

app.delete('/admin/image/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }

    await conn.db.collection('fs.files').deleteOne({ _id: image.id_file });
    await conn.db.collection('fs.chunks').deleteMany({ files_id: image.id_file });

    await Image.deleteOne({ _id: id });

    res.status(200).json({ message: 'Xóa bản ghi thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa ảnh:', error);
    res.status(500).json({ message: 'Lỗi khi xóa ảnh', error: error.message });
  }
});

app.put('/admin/metadata/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dd, mm_yy, list_value } = req.body;

    const metadata = await Metadata.findById(id);
    if (!metadata) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }

    metadata.dd = dd;
    metadata['mm/yy'] = mm_yy;

    if (Array.isArray(list_value)) {
      metadata.list_value = list_value.map(item => ({
        name: item[0],
        value: item[1]
      }));
    }

    await metadata.save();
    res.status(200).json({ message: 'Cập nhật thành công', record: metadata });
  } catch (error) {
    console.error('Lỗi khi cập nhật metadata:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật metadata', error: error.message });
  }
});

app.delete('/admin/metadata/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = await Metadata.findByIdAndDelete(id);
    if (!metadata) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }
    res.status(200).json({ message: 'Xóa bản ghi thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa metadata:', error);
    res.status(500).json({ message: 'Lỗi khi xóa metadata', error: error.message });
  }
});

app.put('/admin/prediction/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { predictions } = req.body;

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }

    if (Array.isArray(predictions)) {
      prediction.predictions = predictions;
    }

    await prediction.save();
    res.status(200).json({ message: 'Cập nhật thành công', record: prediction });
  } catch (error) {
    console.error('Lỗi khi cập nhật dự đoán:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật dự đoán', error: error.message });
  }
});

app.delete('/admin/prediction/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const prediction = await Prediction.findByIdAndDelete(id);
    if (!prediction) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }
    res.status(200).json({ message: 'Xóa bản ghi thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa dự đoán:', error);
    res.status(500).json({ message: 'Lỗi khi xóa dự đoán', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server chạy trên port ${PORT}`);
});