/// <reference path='../../../typings/client/index.d.ts' />

// 由於目前沒有引用任何翻譯模組
// 此檔案只是暫時實作簡單的操作
window.translate = (function() {
    var translateJson = {};
    var readyPromiseReslove;
    var readyPromise = new Promise(function(resolve) {
        readyPromiseReslove = resolve;
    });

    var destUrl = window.location.origin + '/json/translate/zh-tw.json';
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    var reqInit = {
        method: 'GET',
        headers: reqHeaders
    };

    window.fetch(destUrl, reqInit).then(function(response) {
        destUrl = reqHeaders = reqInit = void 0;
        return response.json();
    }).then((resJson) => {
        translateJson = Object.assign(translateJson, resJson);
        readyPromiseReslove(translateJson);
        readyPromiseReslove = void 0;
    });

    var getTranslate = function(key) {
        return readyPromise.then(function(json) {
            return json[key] ? json[key] : key;
        });
    };

    return {
        ready: readyPromise,
        get: getTranslate,
        json: function() { return translateJson; }
    };
})();
