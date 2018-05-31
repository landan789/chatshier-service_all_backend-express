module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

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
            let originalFilePath = `/temp/${Date.now()}.${ext}`;

            return this.appsRequestVerify(req).then(() => {
                if (!(file && fileName)) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                }
                return storageHlp.filesUpload(originalFilePath, file);
            }).then((response) => {
                return storageHlp.sharingCreateSharedLink(originalFilePath);
            }).then((response) => {
                let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                let url = wwwurl.replace('?dl=0', '');
                return url;
            }).then((url) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: {url, originalFilePath} // TO DO ， BAD FORMAT
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        };

        moveFile(req, res) {
            let appId = req.query.appid;
            let richMenuId = req.query.richmenuid;
            let fromPath = req.query.path;
            let fileName = fromPath.slice(fromPath.indexOf('temp/') + 4);
            let toPath = `/apps/${appId}/richmenus/${richMenuId}/src${fileName}`;

            return storageHlp.filesMoveV2(fromPath, toPath).catch((err) => {
                if (409 === err.status) {
                    return Promise.resolve();
                }
                return Promise.reject(err);
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }
    }
    return new ImageController();
})();
