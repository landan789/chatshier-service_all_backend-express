module.exports = (function() {

    let line = require('@line/bot-sdk');
    let bodyParser = require('body-parser');
    let facebook = require('facebook-bot-messenger'); // facebook串接

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

    let lineBot;
    let fbBot;
    function BotService() {
        this.bot;
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
                        fbBot = facebook.create(facebookConfig, server);
                        this.bot = fbBot;

                        resolve(fbBot);
                    });
                    break;
            }
        });
    };

    BotService.prototype.getProfile = function() {
        return Promise.resolve().then(() => {
            
        });
    };

    BotService.prototype.replyMessage = function(senderId, replyToken, messages, app) {
        return Promise.resolve().then(() => {
            switch (app.type) {
                case LINE:
                    return this.bot.replyMessage(replyToken, messages);
                case FACEBOOK:
                    return Promise.all(messages.map((message) => {
                        return this.bot.sendTextMessage(senderId, message);
                    }));
            };
        });
    }

    return new BotService();
})();