const fse = require('fs-extra')
const fs = require('fs')
const path = require('path')

function readFileStream(file) {
    return new Promise((resolve, reject) => {
        const inputStream = fs.createReadStream(file);
        let data = [];
        inputStream.on('data', (chunk) => {
            data.push(chunk);
        });
        inputStream.on('end', () => {
            resolve(Buffer.concat(data));
            fse.unlinkSync(file);   //删除文件
        });
        inputStream.on('error', reject);
    });
}

module.exports = async function mergeFiles(chunkDir, outputFile) {
    const outputStream = fs.createWriteStream(outputFile);
    let inputFiles = await fse.readdir(chunkDir);
    inputFiles = inputFiles.sort((a, b) => {
       return parseInt(a.split('-')[0]) - parseInt(b.split('-')[0])
    })
    for (let i = 0; i < inputFiles.length; i++) {
        const file = inputFiles[i];
        // console.log(file)
        const fileData = await readFileStream(path.resolve(chunkDir, file));
        outputStream.write(fileData);

        // 如果是最后一个文件，结束输出流
        if (i === inputFiles.length - 1) {
            outputStream.end();
        }
    }

    outputStream.on('finish', () => {
        fse.rmdirSync(chunkDir); //删除目录
    });

    outputStream.on('error', (err) => {
        console.error('合并过程中出现错误:', err);
    });

    outputStream.on('close', () => {
        // console.log('文件输出流关闭');
    });
}

