module.exports = (function() {

    let line = require('@line/bot-sdk');
    let bodyParser = require('body-parser');
    let facebook = require('facebook-bot-messenger'); // facebook串接

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

    let lineBot;
    let facebookBot;
    function BotService() {
        this.bot = {};
    };

    BotService.prototype.init = function(app) {
        return new Promise((resolve, reject) => {
            switch (app.type) {
                case LINE:
                    let lineConfig = {
                        channelSecret: app.secret,
                        channelAccessToken: app.token1
                    };
                    lineBot = new line.Client(lineConfig);
                    this.bot = lineBot;
                    resolve(lineBot);
                    break;
                case FACEBOOK:
                    let facebookConfig = {
                        pageID: app.id1,
                        appID: app.id2 || '',
                        appSecret: app.secret,
                        validationToken: app.token1,
                        pageToken: app.token2 || ''
                    };
                    // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                    facebookBot = facebook.create(facebookConfig);
                    this.bot = facebookBot;
                    resolve(facebookBot);
                    break;
            }
        });
    };
    BotService.prototype.parser = function(req, res, server, app) {
        return new Promise((resolve, reject) => {
            switch (app.type) {
                case LINE:
                    let lineConfig = {
                        channelSecret: app.secret,
                        channelAccessToken: app.token1
                    };
                    line.middleware(lineConfig)(req, res, () => {
                        lineBot = new line.Client(lineConfig);
                        this.bot = lineBot;
                        resolve(lineBot);
                    });
                    break;
                case FACEBOOK:
                    bodyParser.json()(req, res, () => {
                        let facebookConfig = {
                            pageID: app.id1,
                            appID: app.id2 || '',
                            appSecret: app.secret,
                            validationToken: app.token1,
                            pageToken: app.token2 || ''
                        };
                        // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                        facebookBot = facebook.create(facebookConfig, server);
                        this.bot = facebookBot;

                        resolve(facebookBot);
                    });
                    break;
            }
        });
    };
    /**
     * 多型處理， 取得 LINE 或 FACEBOOK 來的 customer 用戶端資料
     * @param {*} senderId 
     * @param {*} app 
     */
    BotService.prototype.getProfile = function(senderId, app) {
        return this.bot.getProfile(senderId).then((_profile) => {
            let profile = {};
            switch (app.type) {
                case LINE:
                    profile.name = _profile ? _profile.displayName : '';
                    profile.photo = _profile ? _profile.pictureUrl : '';
                    break;
                case FACEBOOK:
                    profile.name = _profile ? _profile.first_name + ' ' + _profile.last_name : '';
                    profile.photo = _profile ? _profile.profile_pic : '';
                    break;
            };
            return Promise.resolve(profile);
        });
    };

    BotService.prototype.replyMessage = function(senderId, replyToken, messages, app) {
        return Promise.resolve().then(() => {
            switch (app.type) {
                case LINE:
                    return this.bot.replyMessage(replyToken, messages);
                case FACEBOOK:
                    return Promise.all(messages.map((message) => {
                        switch (message.type) {
                            case 'image':
                                return this.bot.sendImageMessage(senderId, message.src);
                            case 'audio':
                                return this.bot.sendAudioMessage(senderId, message.src);
                            case 'video':
                                return this.bot.sendVideoMessage(senderId, message.src);
                            case 'text':
                            default:
                                return this.bot.sendTextMessage(senderId, message.text);
                        }
                    }));
            };
        });
    };

    BotService.prototype.pushMessage = function(senderId, replyToken, messages, app) {
        return Promise.resolve().then(() => {
            switch (app.type) {
                case LINE:
                    let lineConfig = {
                        channelSecret: app.secret,
                        channelAccessToken: app.token1
                    };
                    this.bot = new line.Client(lineConfig);
                    return this.bot.replyMessage(replyToken, messages);
                case FACEBOOK:
                    return Promise.all(messages.map((message) => {
                        switch (message.type) {
                            case 'image':
                                return this.bot.sendImageMessage(senderId, message.src);
                            case 'audio':
                                return this.bot.sendAudioMessage(senderId, message.src);
                            case 'video':
                                return this.bot.sendVideoMessage(senderId, message.src);
                            case 'text':
                            default:
                                return this.bot.sendTextMessage(senderId, message.text);
                        }
                    }));
            };
        });
    };

    return new BotService();
})();