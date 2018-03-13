module.exports = (function() {
    require('isomorphic-fetch'); // or another library of choice.
    const fs = require('fs');
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');
    const Dropbox = require('dropbox').Dropbox;
    const dbx = new Dropbox({ accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN });

    function StorageHelp() {};

    /**
     * @param {string} url
     * @param {string} dest
     * @param {function} callback
     */
    StorageHelp.prototype.downloadFileFromUrl = function(url, dest, callback) {
        var file = fs.createWriteStream(dest);
        var sendReq = request.get(url);
        // verify response code
        sendReq.on('response', function(response) {
            if (response.statusCode !== 200) {
                return callback('Response status was ' + response.statusCode);
            }
        });
        // check for request errors
        sendReq.on('error', function (err) {
            fs.unlink(dest);
            returncallbackcb(err.message);
        });
        sendReq.pipe(file);
        file.on('finish', function() {
            file.close();
            return callback(file);
        });
        file.on('error', function(err) {
            fs.unlink(dest);
            return callback(err.message);
        });
    };

    /**
     * @param {*} path
     * @param {*} contents
     * @param {*} callback
     */
    StorageHelp.prototype.uploadDropboxFile = function(path, contents, callback) {
        dbx.filesUpload({path: path, contents: contents}).then((response) => {
            callback();
        });
    };

    return new StorageHelp();
})();
