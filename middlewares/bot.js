var appMdl = require('../models/apps');
var webhookMdl = require('../models/webhooks');

var bot = {};

bot.parse = function(webhookId, body, callback) {

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
                webhookMdl.findByWebhookId(webhookId, (webhook) => {
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
            var appId = data.app_id.app_id;
            return new Promise((resolve, reject) => {
                appMdl.findByAppId(appId, (app) => {
                    if (null === app) {
                        reject();
                        return;
                    }
                    resolve(app);
                });
            });
        })
        .then((data) => {
            let appObj = data;
            return new Promise((resolve, reject) => {
                let appInfo = Object.values(appObj)[0];
                resolve(appInfo);
            });
        })
        .then((data) => {
            var app = data;
            callback(app);
        })
        .catch(() => {
            res.sendStatus(404);
        });
}

module.exports = bot;
