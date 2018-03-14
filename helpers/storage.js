module.exports = (function() {
    require('isomorphic-fetch'); // or another library of choice.
    const fs = require('fs');
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');
    const dbx = new (require('dropbox').Dropbox)({ accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN });

    function StorageHelp() {};

    /**
     * @param {string} url
     * @param {string} dest
     */
    StorageHelp.prototype.downloadFileFromUrl = function(url, dest) {
        var file = fs.createWriteStream(dest);
        var sendReq = request.get(url);
        // verify response code
        sendReq.on('response', function(response) {
            if (response.statusCode !== 200) {
                return Promise.reject(response.statusCode);
            }
        });
        // check for request errors
        sendReq.on('error', function (err) {
            fs.unlink(dest);
            return Promise.reject(err.message);
        });
        sendReq.pipe(file);
        file.on('finish', function() {
            file.close();
            return Promise.resolve(file);
        });
        file.on('error', function(err) {
            fs.unlink(dest);
            return Promise.reject(err.message);
        });
    };

    /**
     * @param {string} path
     * @param {Buffer} contents
     * @param {any} messages
     * @returns {any}
     */
    StorageHelp.prototype.filesUpload = function(path, contents, messages) {
        return dbx.filesUpload({path: path, contents: contents}).then(function(response) {
            let _messages = messages;
            return Promise.resolve(_messages);
        });
    };

    /**
     * @param {string} path
     * @returns {any}
     */
    StorageHelp.prototype.sharingCreateSharedLink = function(path) {
        return dbx.sharingCreateSharedLink({path: path}).then(function(response) {
            return Promise.resolve(response);
        });
    };

    return new StorageHelp();
})();
