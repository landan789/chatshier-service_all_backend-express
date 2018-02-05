module.exports = (function() {
    function Bot() {};

    /**
     * 回覆訊息
     *
     * @param {Object} fbBot
     * @param {string} psid
     * @param {string} msgStr
     * @param {Function} callback
     */
    Bot.prototype.replyMessages = function(fbBot, psid, msgStr, callback) {
        sendMessage(0, callback);

        function sendMessage(index, cb) {
            let proceed = Promise.resolve();

            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (index >= msgStr.length) {
                        reject();
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    fbBot.sendTextMessage(psid, msgStr[index].text);
                    resolve();
                });
            }).then(() => {
                sendMessage(index + 1, cb);
            }).catch(() => {
                cb();
            });
        }
    };

    /**
     * 發送FACEBOOK訊息
     *
     * @param {Object} bot
     * @param {string} receiverId
     * @param {Object} apps
     * @param {Function} callback
     */
    Bot.prototype.sendMessage = function(bot, receiverId, apps, callback) {
        switch (apps.textType) {
            case 'image':
                bot.sendImageMessage(receiverId, apps.url, true);
                callback();
                break;
            case 'audio':
                bot.sendAudioMessage(receiverId, apps.url, true);
                callback();
                break;
            case 'video':
                bot.sendVideoMessage(receiverId, apps.url, true);
                callback();
                break;
            default:
                bot.sendTextMessage(receiverId, apps.msg);
                callback();
        }
    };

    Bot.prototype.lineFileBinaryConvert = function(linebot, event, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            return linebot.getMessageContent(event.message.id);
        }).then((stream) => {
            let bufs = [];
            stream.on('data', (chunk) => {
                bufs.push(chunk);
            }).on('end', () => {
                let buf = Buffer.concat(bufs);
                let data = buf.toString('base64');
                let url;
                switch (event.message.type) {
                    case 'image':
                        url = 'data:image/png;base64, ' + data;
                        break;
                    case 'audio':
                        url = 'data:audio/m4a;base64, ' + data;
                        break;
                    case 'video':
                        url = 'data:video/mp4;base64, ' + data;
                        break;
                    case 'location':
                        let latitude = event.message.latitude;
                        let longitude = event.message.longitude;
                        url = 'https://www.google.com.tw/maps/place/' + url + '/@' + latitude + ',' + longitude + ',15z/data=!4m5!3m4!1s0x0:0x496596e7748a5757!8m2!3d' + latitude + '!4d' + longitude;
                        break;
                    case 'sticker':
                        let stickerId = event.message.stickerId;
                        url = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                }
                callback(url);
            });
            stream.on('error', (err) => {
                console.log(err);
            });
        }).catch(() => {
            callback(null);
        });
    };

    return new Bot();
})();
