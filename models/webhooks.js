var admin = require("firebase-admin"); //firebase admin SDK
var webhooks = {};

webhooks.getById = (webhookId, callback) => {
    admin.database().ref('webhooks/' + webhookId).once('value', snap => {
        var webhook = snap.val();

        if (null === webhook) {
            callback(false);
            return;
        }
        callback(webhook);
    });
}

module.exports = webhooks;