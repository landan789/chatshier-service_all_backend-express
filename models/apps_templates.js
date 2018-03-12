var admin = require('firebase-admin'); // firebase admin SDK
var appstemplates = {};

appstemplates.findByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/templates').once('value', snap => {
        var info = snap.val();
        callback(info);
    });
}

appstemplates.findTemplates = (appId, callback) => {
    return admin.database().ref('apps/' + appId + '/templates/').once('value').then((snap) => {
        let templates = snap.val();
        if (!templates) {
            return Promise.resolve({});
        };

        return Promise.resolve(templates);
    }).then((templates) => {
        callback(templates);
    }).catch(() => {
        callback(null);
    });
};

appstemplates.insertByAppId = (appId, obj, callback) => {
    let templatesId = admin.database().ref('apps/' + appId + '/templates').push().key;
    admin.database().ref('apps/' + appId + '/templates/' + templatesId).update(obj);
    callback();
};

appstemplates.updateByAppIdByTemplateId = function(appId, templateId, obj, callback) {
    admin.database().ref('apps/' + appId + '/templates/' + templateId).update(obj);
};

appstemplates.removeByAppIdByTemplateId = function(appId, templateId, callback) {
    admin.database().ref('apps/' + appId + '/templates/' + templateId).remove();
    callback();
};

module.exports = appstemplates;