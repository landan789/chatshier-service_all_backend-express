var admin = require('firebase-admin'); // firebase admin SDK
var templates = {};

templates.findByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/templates').once('value', snap => {
        var info = snap.val();
        callback(info);
    });
}

templates.findMessagesByAppIdAndTemplateIds = (appId, templateIds, callback) => {
    let templatereplies = [];
    templateIds.map((templateId, index) => {
        let address = 'apps/' + appId + '/templatereplies/' + templateId;
        admin.database().ref(address).once('value', (snap) => {
            let replyMessage = snap.val().format;
            templatereplies.push(replyMessage);
            if (index === (templateIds.length - 1)) {
                callback(templatereplies);
            }
        });
    });
}

templates.insertByAppId = (appId, obj, callback) => {
    let templatesId = admin.database().ref('apps/' + appId + '/templates').push().key;
    admin.database().ref('apps/' + appId + '/templates/' + templatesId).update(obj);
    callback();
}

templates.updateByAppIdByTemplateId = function(appId, templateId, obj, callback) {
    admin.database().ref('apps/' + appId + '/templates/' + templateId).update(obj);
}

templates.removeByAppIdByTemplateId = function(appId, templateId, callback) {
    admin.database().ref('apps/' + appId + '/templates/' + templateId).remove();
    callback();
}

module.exports = templates;