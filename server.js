const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { compressVideo, generateThumbnail, createPreviewClip, createHLS } = require('./ffmpeg');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const app = express();

const checkDirOrCreate = (path) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
};

checkDirOrCreate('./uploads');
checkDirOrCreate('./output/hls');

app.post('/profile', upload.single('avatar'), function (req, res, next) {
  compressVideo(req.file.path);
  generateThumbnail(req.file.path, '00:00:05');
  createPreviewClip(req.file.path, '00:00:10', '3');
  createHLS(req.file.path);

  res.end();
});

app.listen(3004, () => {
  console.log('Listening ...');
});
