const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const mergeFiles = require("./merge");
require("dotenv").config();
const app = express();
const router = express.Router();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/res", express.static("upload"));
app.use((req, res, next) => {
  if (req.method === "options") {
    next();
    return;
  }
  next();
});
const handlerAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
// 配置文件上传
const storage = {
  // 官方文档：https://github.com/expressjs/multer/blob/main/doc/README-zh-cn.md
  // 定制存储引擎：https://github.com/expressjs/multer/blob/main/StorageEngine.md
  _handleFile(req, file, cb) {
    // 只能拿文件字段之前的body信息和query
    // console.log(file); // 文件信息
    const { hash, chunkName } = req.body; // ⚠️改成 query 或 headers 避免 req.body 还未处理
    const chunkDir = path.resolve(__dirname, `upload/chunks//${hash}`);
    fse
      .ensureDir(chunkDir)
      .then(() => {
        const filePath = path.resolve(chunkDir, chunkName);
        const outStream = fs.createWriteStream(filePath);
        req._writeStream = outStream;
        req._filePath = filePath;
        file.stream.pipe(outStream);
        outStream.on("error", cb);
        outStream.on("finish", () => {
          cb(null, {
            path: filePath,
            size: outStream.bytesWritten,
          });
        });
      })
      .catch(cb);
  },
  _removeFile(req, file, cb) {
    fs.unlink(file.path, cb);
  },
};

// 限制切片文件大小和类型
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 + 1, // 限制切片小于10MB
  },
  fileFilter(req, file, cb) {
    // 文件名为blob，说明是切片文件【不是切片，该值表示文件原名例如 播放.mp3】
    const ext = path.extname(file.originalname);
    if (file.originalname === "blob") {
      cb(null, true);
    } else {
      cb(new Error(`不支持${ext}文件类型`));
    }
  },
}).single("chunk");

// 上传切片文件
router.post("/upload", (req, res, next) => {
  // 💡提前监听中止
  req.on("aborted", () => {
    const filePath = req._filePath;
    const writeStream = req._writeStream;

    if (writeStream) {
      writeStream.destroy();
      // 等待 close 确认文件句柄释放
      writeStream.on("close", () => {
        if (filePath) {
          fse
            .remove(filePath)
            .then(() => console.log("✅ 成功删除中止上传文件:", filePath))
            .catch((err) => console.error("❌ 删除失败:", err));
        }
      });
    }
  });
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      res.send({ code: false, msg: err.message, data: null });
      return;
    } else if (err) {
      next(err);
      return;
    }
    res.send({ code: true, msg: null, data: "上传成功" });
  });
});

// 配置完整文件上传
const storageComplete = multer.diskStorage({
  destination: function (req, file, cb) {
    const file_Path = path.resolve(__dirname, `upload`);
    cb(null, file_Path);
  },
  filename: function (req, file, cb) {
    // const originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    const ext = path.extname(file.originalname);
    cb(null, req.body.hash + ext);
  },
});
// 限制文件大小和类型
const extArray = [".mp3", ".mp4", ".jpg", ".jpeg", ".png"];
const uploadComplete = multer({
  storage: storageComplete,
  limits: {
    fileSize: 1024 * 1024 * 10 + 1, //限制完整文件小于等于10MB
  },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname);
    if (extArray.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持${ext}文件类型`));
    }
  },
}).single("file");
// 上传完整文件
router.post("/upload/complete", (req, res, next) => {
  uploadComplete(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      res.send({ code: false, msg: err.message, data: null });
      return;
    } else if (err) {
      next(err);
      return;
    }
    // 错误捕捉不到，适用try catch解决
    // 获取不到file，适用req.file解决
    try {
      const hash = req.body.hash;
      const file = req.file;
      const ext = path.extname(file.originalname);
      res.send({ code: true, msg: null, url: "/res/" + hash + ext });
    } catch (e) {
      next(e);
    }
  });
});

// 检查文件是否上传完成
router.get(
  "/verify",
  handlerAsync(async (req, res, next) => {
    const hash = req.query.hash;
    const fileName = req.query.fileName;
    const ext = path.extname(fileName); //.mp3
    const isExist = await fse.pathExists(
      path.resolve(__dirname, `upload/${hash}${ext}`)
    );
    if (isExist) {
      res.send({ code: true, msg: null, data: "文件已存在" });
      return;
    } else {
      // 文件不存在，查看已上传的切片文件
      const chunk_Path = path.resolve(__dirname, `upload/chunks/${hash}`);
      const chunk_isExist = await fse.pathExists(chunk_Path);
      if (chunk_isExist) {
        // 返回已上传切片的列表
        const chunkArray = await fse.readdir(chunk_Path);
        res.send({ code: false, msg: null, data: chunkArray });
      } else {
        res.send({ code: false, msg: null, data: [] });
      }
    }
  })
);

// 合并切片文件
router.get(
  "/merge",
  handlerAsync(async (req, res, next) => {
    const hash = req.query.hash;
    const fileName = req.query.fileName;
    const ext = path.extname(fileName);
    const chunk_Path = path.resolve(__dirname, `upload/chunks/${hash}`);
    const isExist = await fse.pathExists(chunk_Path);
    if (isExist) {
      await mergeFiles(
        chunk_Path,
        path.resolve(__dirname, `upload/${hash}${ext}`)
      );
      res.send({ code: true, msg: null, url: "/res/" + hash + ext });
    } else {
      next(new Error("合并失败，切片文件不存在"));
    }
  })
);

app.use(router);
// 错误捕获中间件
app.use((err, req, res, next) => {
  res.send({
    code: false,
    msg: err.message,
    data: null,
  });
});

app.listen(process.env.PORT, () => {
  console.log(`监听${process.env.PORT}端口`);
});
