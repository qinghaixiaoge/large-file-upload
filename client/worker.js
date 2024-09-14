import "./spark-md5.js"
function createHash(index, file, CHUNK_SIZE) {
    return new Promise((resolve)=>{
        const spark = new SparkMD5.ArrayBuffer()
        const start = index * CHUNK_SIZE
        const end = (index + 1) * CHUNK_SIZE > file.size ? file.size : (index + 1) * CHUNK_SIZE
        const blob = file.slice(start, end)
        const fileReader = new FileReader()
        fileReader.onload = function (e) {
            spark.append(e.target.result)
            resolve({
                start,
                end,
                hash: spark.end(),
                index,
                blob
            })
        }
        fileReader.readAsArrayBuffer(blob)
    })
}



onmessage = async function (e) {
    const { start, end, CHUNK_SIZE, file } = e.data
    const result = []
    for (let i = start; i < end; i++) {
        const chunk = await createHash(i, file, CHUNK_SIZE)
        result.push(chunk)
    }
    
    postMessage(result)
};