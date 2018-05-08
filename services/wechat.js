module.exports = (function() {
    const stream = require('stream');
    const request = require('request');
    const mimeTypes = require('mime-types');
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const ffmpeg = require('fluent-ffmpeg');

    const API_ENDPOINT = 'https://api.weixin.qq.com';

    class WechatService {
        _sendRequest(options) {
            return new Promise((resolve, reject) => {
                request(options, (error, res, body) => {
                    if (error || res.statusCode >= 300) {
                        return reject(body);
                    }

                    let canParseJSON =
                        (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                        (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) ||
                        ('string' === typeof body && body.length > 0 &&
                        (('{' === body[0] && '}' === body[body.length - 1]) || ('[' === body[0] && ']' === body[body.length - 1])));
                    resolve(canParseJSON && 'string' === typeof body ? JSON.parse(body) : body);
                });
            });
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
            return this._sendRequest(options);
        }

        /**
         * @param {Buffer} amrBuffer
         * @returns {Promise<Buffer>}
         */
        amrToMp3(amrBuffer) {
            let inputStream = new stream.PassThrough();
            inputStream.end(amrBuffer);
            let outputStream = new stream.PassThrough();

            return new Promise((resolve, reject) => {
                let bufferArray = [];
                outputStream.on('data', (chunk) => bufferArray.push(chunk));
                outputStream.once('end', () => resolve(Buffer.concat(bufferArray)));
                outputStream.once('error', reject);

                ffmpeg(inputStream)
                    .setFfmpegPath(ffmpegInstaller.path)
                    .inputFormat('amr')
                    .toFormat('mp3')
                    .output(outputStream)
                    .run();
            }).then((mp3Buffer) => {
                inputStream.destroy();
                outputStream.destroy();
                return mp3Buffer;
            });
        }
    }

    return new WechatService();
})();
