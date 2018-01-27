var admin = require("firebase-admin"); //firebase admin SDK
var webhooks = {};

webhooks.findByWebhookId = (webhookId, callback) => {
    admin.database().ref('webhooks/' + webhookId).once('value', snap => {
        var webhook = snap.val();
        var webhookId = Object.keys(webhook)[0];
        if (null === webhook || '' === webhook || undefined === webhook) {
            callback(false);
            return;
        }
        var webhooks = {};
        webhooks[webhookId] = webhook;
        callback(webhooks);
    });
}

webhooks.findAppIdByWebhookId = (webhookId, callback) => {
    var procced = Promise.resolve();

    procced.then(() => {
        return admin.database().ref('webhooks/' + webhookId).once('value');
    }).then((snap) => {
        var webhook = snap.val();
        var appId = webhook.app_id;
        callback(appId);
    }).catch(() => {
        callback(null);
    });
};

module.exports = webhooks;