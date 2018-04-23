module.exports = (function() {
    require('isomorphic-fetch'); // or another library of choice.
    const fs = require('fs');
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');
    const dbx = new (require('dropbox').Dropbox)({ accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN });

    function StorageHelper() {};

    /**
     * @param {string} path
     * @param {Buffer} contents
     * @returns {any}
     */
    StorageHelper.prototype.filesUpload = function(path, contents) {
        return dbx.filesUpload({path: path, contents: contents});
    };

    /**
     * @param {string} fromPath
     * @param {string} toPath
     * @returns {any}
     */
    StorageHelper.prototype.filesMoveV2 = function(fromPath, toPath) {
        return dbx.filesMoveV2({from_path: fromPath, to_path: toPath});
    };

    /**
     * @param {string} path
     * @returns {any}
     */
    StorageHelper.prototype.sharingCreateSharedLink = function(path) {
        return dbx.sharingCreateSharedLink({path: path});
    };

    /**
     * @param {string} path
     * @returns {any}
     */
    StorageHelper.prototype.filesDownload = function(path) {
        return dbx.filesDownload({path: path});
    };

    return new StorageHelper();
})();
