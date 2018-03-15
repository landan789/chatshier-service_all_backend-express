module.exports = (function() {
    require('isomorphic-fetch'); // or another library of choice.
    const fs = require('fs');
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');
    const dbx = new (require('dropbox').Dropbox)({ accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN });

    function StorageHelper() {};

    /**
     * @param {string} url 下載檔案的 url
     * @param {string} dest
     */
    StorageHelper.prototype.downloadFile = function(url, dest) {
        var file = fs.createWriteStream(dest);
        var reqGet = request.get(url);
        // verify response code
        reqGet.on('response', function(response) {
            if (response.statusCode !== 200) {
                return Promise.reject(response.statusCode);
            }
        });
        // check for request errors
        reqGet.on('error', function (err) {
            fs.unlink(dest);
            return Promise.reject(err.message);
        });
        reqGet.pipe(file);
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
     * @returns {any}
     */
    StorageHelper.prototype.filesUpload = function(path, contents) {
        return dbx.filesUpload({path: path, contents: contents}).then(function(response) {
            return Promise.resolve();
        });
    };

    /**
     * @param {string} fromPath
     * @param {string} toPath
     * @returns {any}
     */
    StorageHelper.prototype.filesMoveV2 = function(fromPath, toPath) {
        return dbx.filesMoveV2({from_path: fromPath, to_path: toPath}).then(function(response) {
            return Promise.resolve();
        });
    };

    /**
     * @param {string} path
     * @returns {any}
     */
    StorageHelper.prototype.sharingCreateSharedLink = function(path) {
        return dbx.sharingCreateSharedLink({path: path}).then(function(response) {
            return Promise.resolve(response);
        });
    };

    return new StorageHelper();
})();
