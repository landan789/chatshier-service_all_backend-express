module.exports = (function() {
    const chatshierCfg = require('../config/chatshier');

    const Dropbox = require('dropbox').Dropbox;
    const dbx = new Dropbox({
        accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN
    });

    class StorageHelper {
        /**
         * @param {string} path
         * @param {Buffer} contents
         */
        filesUpload(path, contents) {
            return dbx.filesUpload({ path: path, contents: contents });
        }

        /**
         * @param {string} fromPath
         * @param {string} toPath
         */
        filesMoveV2(fromPath, toPath) {
            return dbx.filesMoveV2({ from_path: fromPath, to_path: toPath });
        }

        /**
         * @param {string} path
         */
        sharingCreateSharedLink(path) {
            return dbx.sharingCreateSharedLink({ path: path });
        }

        /**
         * @param {string} path
         */
        filesDownload(path) {
            return dbx.filesDownload({ path: path });
        }
    }

    return new StorageHelper();
})();
