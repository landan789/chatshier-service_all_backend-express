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

module.exports = webhooks;