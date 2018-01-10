var linebot = require('linebot'); // line串接
var MessengerPlatform = require('facebook-bot-messenger'); // facebook串接
var utility = require('../helpers/utility');

var apps = require('../models/apps');

var LINE = 'line';
var FACEBOOK = 'facebook';
var bot = {};

bot.lineParse = function(app,callback) {
    var line = {
        channelId: app.id1,
        channelSecret: app.secret,
        channelAccessToken: app.token1
    };

    var linebot = linebot(line);
    linebot.on('message', bot_on_message);
    bolinebott.on('follow', bot_on_follow);
    callback(linebot);
}

bot.fbParse = function(app,callback) {
    var facebook = {
        pageID: app.id1,
        appID: app.id2,
        appSecret: app.secret,
        validationToken: app.token1,
        pageToken: app.token2
    };

    var fbbot = MessengerPlatform.create(facebook);
}

bot.parse = function(req, res, next) {
    var webhookId = req.params.webhookId;
    var body = req.body;

    if ('' === webhookId) {
        req.noWebhookId = true;
        next();
        return;
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                webhooks.getById(webhookId, (webhook) => {
                    var appId = webhook.app_id;
                    if (false === webhook || null === webhook) {
                        reject();
                        return;
                    }
                    if (!webhook.hasOwnProperty('app_id')) {
                        reject();
                        return;
                    }
                    resolve(webhook);
                });
            });
        })
        .then((data) => {
            var appId = data.app_id;
            return new Promise((resolve, reject) => {
                apps.findByAppId(appId, (app) => {
                    if (null === app) {
                        reject();
                        return;
                    }
                    resolve(app);
                });
            });
        })
        .then((data) => {
            var app = data;
            switch(app.type) {
                case LINE:
                    bot.lineParse(app,(data) => {
                        req.parser = data.parser();
                        if (REPLY_TOKEN_0 === body.events[0].replyToken && REPLY_TOKEN_F === body.events[1].replyToken) {
                            req.verify = true;
                        }
                        res.sendStatus(200);
                    });
                    break;
                case FACEBOOK:
                    bot.fbParse(app,(data) => {
                        res.sendStatus(200);
                    });
                    break;
            }
        })
        .catch(() => {
            res.sendStatus(404);
        });
}

function bot_on_message(event) { // 客戶傳訊息後的動作
    let channelId = this.options.channelId; // line群組ID
    let message_type = event.message.type; // line訊息類別 text, location, image, video...
    let receiverId = event.source.userId; // line客戶ID
    let nowTime = Date.now(); // 現在時間
    event.source.profile().then(function(profile) {
        let receiver_name = profile.displayName; // 客戶姓名
        let pictureUrl = profile.pictureUrl; // 客戶的profile pic
        if (receiver_name === undefined) receiver_name = "userName_undefined";
        let msgObj = {
            owner: "user",
            name: receiver_name,
            time: nowTime,
            message: "undefined_message"
        };
        let replyMsgObj = {
            owner: "agent",
            name: "undefined name",
            time: nowTime,
            message: "undefined message"
        };
        //  ===================  訊息類別 ==================== //
        utility.lineMsgType(event, message_type, (msgData) => {
            msgObj.message = msgData;
        });
    });
} // end of bot_on_message

function bot_on_follow(event) { // 客戶加好友後的動作
    let follow_message = [];
    let currentChannel = bot.options.channelId;
    globalLineMessageArray.map(item => {
        if (currentChannel === item.chanId) {
            follow_message = item.msg;
        }
    });
    event.reply(follow_message);
} // end of bot_on_follow

module.exports = bot;
