module.exports = (function() {
    const fs = require('fs');
    const path = require('path');
    const request = require('request');
    const mimeTypes = require('mime-types');
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const ffmpeg = require('fluent-ffmpeg');

    const API_ENDPOINT = 'https://api.weixin.qq.com';

    const sendRequest = (options) => {
        return new Promise((resolve, reject) => {
            request(options, (error, res, body) => {
                if (error || res.statusCode >= 300) {
                    return reject(body);
                }

                /**
                 * 由於部分 wechat api 回傳的 response header 沒有包含 Content-Type: application/json
                 * 會導致底層 http 協定沒辦法解析內容自動轉成 JSON
                 */
                let canParseJSON =
                    (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                    (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) ||
                    ('string' === typeof body && body.length > 0 &&
                    (('{' === body[0] && '}' === body[body.length - 1]) || ('[' === body[0] && ']' === body[body.length - 1])));
                resolve(canParseJSON && 'string' === typeof body ? JSON.parse(body) : body);
            });
        });
    };

    class WechatHelper {
        constructor() {
            this.cwd = process.cwd();
        }

        /**
         * 由於 Wechat-API 插件的 uploadMedia 與 uploadMediaStream 的實作方法
         * 無法透過 buffer 正常傳送，因此開出此方法來實作上傳 media
         *
         * @param {"image"|"voice"|"video"} type
         * @param {Buffer} srcBuffer
         * @param {string} filename
         * @param {string} accessToken
         */
        uploadMedia(type, srcBuffer, filename, accessToken) {
            let mimeType = mimeTypes.lookup(filename) || '';

            let options = {
                method: 'POST',
                url: API_ENDPOINT + '/cgi-bin/media/upload?access_token=' + accessToken + '&type=' + type,
                formData: {
                    media: {
                        value: srcBuffer,
                        options: {
                            filename: filename,
                            contentType: mimeType
                        }
                    }
                }
            };
            return sendRequest(options);
        }

        /**
         * @param {string} inputFile
         * @param {string} outputFile
         * @returns {Promise<Buffer>}
         */
        amrToMp3(amrBuffer, inputFile, outputFile) {
            inputFile = path.join(this.cwd, inputFile);
            fs.writeFileSync(inputFile, amrBuffer);
            outputFile = path.join(this.cwd, outputFile);
            let inputStream = fs.createReadStream(inputFile);
            let outputStream = fs.createWriteStream(outputFile);

            let dispose = () => {
                inputStream.close();
                outputStream.close();
                fs.unlinkSync(inputFile);
                fs.unlinkSync(outputFile);
            };

            return new Promise((resolve, reject) => {
                ffmpeg(inputStream)
                    .setFfmpegPath(ffmpegInstaller.path)
                    .inputFormat('amr')
                    .toFormat('mp3')
                    .on('error', (err) => {
                        dispose();
                        reject(new Error(err.message));
                    })
                    .on('end', () => {
                        let outputBuffer = fs.readFileSync(outputFile);
                        dispose();
                        resolve(outputBuffer);
                    })
                    .pipe(outputStream);
            });
        }
    }

    return new WechatHelper();
})();
