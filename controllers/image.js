module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

    let storageHlp = require('../helpers/storage');

    class ImageController extends ControllerCore {
        constructor() {
            super();
            this.uploadFile = this.uploadFile.bind(this);
            this.moveFile = this.moveFile.bind(this);
        }

        uploadFile(req, res) {
            let file = req.body.file;
            let fileName = req.body.fileName;
            let ext = fileName.split('.').pop();
            let originalFilePath = '/temp/' + Date.now() + '.' + ext;

            return Promise.resolve().then(() => {
                if (!(file && fileName)) {
                    return Promise.reject(ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                }
                return storageHlp.filesUpload(originalFilePath, file);
            }).then(() => {
                return storageHlp.sharingCreateSharedLink(originalFilePath);
            }).then((url) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: { url, originalFilePath } // TO DO ， BAD FORMAT
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        moveFile(req, res) {
            let fromPath = req.query.frompath;
            let toPath = req.query.topath;

            return storageHlp.filesMoveV2(fromPath, toPath).catch((err) => {
                if (409 === err.status) {
                    return Promise.resolve();
                }
                return Promise.reject(err);
            }).then(() => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new ImageController();
})();
