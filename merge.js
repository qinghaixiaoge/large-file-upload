const fse = require("fs-extra");
const fs = require("fs/promises");
const path = require("path");
const { createWriteStream } = require("fs");

module.exports = async function mergeFiles(chunkDir, outputFile) {
  let inputFiles = await fse.readdir(chunkDir);

  // 排序切片
  inputFiles.sort(
    (a, b) => parseInt(a.split("-")[0]) - parseInt(b.split("-")[0])
  );

  const outputStream = createWriteStream(outputFile);

  try {
    for (const file of inputFiles) {
      const filePath = path.resolve(chunkDir, file);
      const data = await fs.readFile(filePath); // 等待读取数据
      outputStream.write(data); // 写入输出流
      await fs.unlink(filePath); // 删除切片
    }

    // 结束输出流
    await new Promise((resolve) => outputStream.end(resolve));

    // 删除空目录
    const remaining = await fse.readdir(chunkDir);
    if (remaining.length === 0) {
      await fse.rmdir(chunkDir);
      console.log("✅ 合并完成并删除目录:", chunkDir);
    }
  } catch (err) {
    console.error("❌ 合并失败:", err);
    outputStream.destroy(); // 强制关闭流
  }
};
