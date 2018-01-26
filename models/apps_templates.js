var admin = require('firebase-admin'); // firebase admin SDK
var templates = {};

templates.findByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/templates').once('value', snap => {
        var info = snap.val();
        callback(info);
    });
}

templates.findTemplatesByAppIdByTemplateIds = (appId, templateIds, callback) => {

    Promise.all(templateIds.map((templateId) => {
        return admin.database().ref('apps/' + appId + '/keywordreplies/' + templateId).once('value');
    })).then((result) => {
        callback(result);
    }).catch(() => {
        callback(false);
    });
};

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