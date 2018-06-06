module.exports = (function() {
    require('isomorphic-fetch'); // polyfill fetch method for Dropbox SDK
    const PassThrough = require('stream').PassThrough;
    const chatshierCfg = require('../config/chatshier');

    const Dropbox = require('dropbox').Dropbox;
    const dbx = new Dropbox({
        accessToken: chatshierCfg.STORAGE.DROPBOX_ACCESS_TOKEN
    });
    const POLL_INTERVAL = 250; // 每秒詢問 4 次

    class StorageHelper {
        constructor() {
            this.tempPath = '/temp';
            this.sharedLinkPrefix = 'dl.dropboxusercontent';
            this.sharingCreateSharedLink = this.sharingCreateSharedLink.bind(this);
        }

        /**
         * @param {string} path
         * @param {Buffer} contents
         */
        filesUpload(path, contents) {
            /** @type {DropboxTypes.files.CommitInfo} */
            let args = {
                path: path,
                contents: contents
            };
            return dbx.filesUpload(args);
        }

        /**
         * @param {string} fromPath
         * @param {string} toPath
         */
        filesMoveV2(fromPath, toPath) {
            /** @type {DropboxTypes.files.RelocationArg} */
            let args = {
                from_path: fromPath,
                to_path: toPath
            };
            return dbx.filesMoveV2(args);
        }

        /**
         * @param {string} path
         * @param {string} url
         * @returns {Promise<string>}
         */
        filesSaveUrl(path, url) {
            /** @type {DropboxTypes.files.SaveUrlArg} */
            let args = {
                path: path,
                url: url
            };

            return new Promise((resolve, reject) => {
                return dbx.filesSaveUrl(args).then((res) => {
                    if ('async_job_id' in res) {
                        let jobId = res.async_job_id;
                        let pollingJobStatus = () => {
                            return new Promise((resolve) => {
                                setTimeout(resolve, POLL_INTERVAL);
                            }).then(() => {
                                return dbx.filesSaveUrlCheckJobStatus({ async_job_id: jobId });
                            }).then((jobRes) => {
                                if ('complete' === jobRes['.tag'] && 'path_display' in jobRes && jobRes.path_display) {
                                    return this.sharingCreateSharedLink(jobRes.path_display).then(resolve);
                                }
                                return pollingJobStatus();
                            }).catch(reject);
                        };
                        return pollingJobStatus();
                    }
                    return this.sharingCreateSharedLink(path).then(resolve);
                }).catch(reject);
            });
        }

        /**
         * @param {string} path
         * @returns {Promise<string>}
         */
        sharingCreateSharedLink(path) {
            return dbx.sharingCreateSharedLink({ path: path }).then((response) => {
                if (!response) {
                    return '';
                }
                return response.url.replace('www.dropbox', this.sharedLinkPrefix).replace('?dl=0', '');
            });
        }

        /**
         * @param {string} path
         */
        filesDownload(path) {
            return dbx.filesDownload({ path: path });
        }

        /**
         * @param {any} stream
         * @param {boolean} [shouldDestroyAfter]
         * @returns {Promise<Buffer>}
         */
        streamToBuffer(stream, shouldDestroyAfter) {
            shouldDestroyAfter = !!shouldDestroyAfter;

            return new Promise((resolve, reject) => {
                let passThrough = new PassThrough();
                let bufferArray = [];

                passThrough.on('data', (chunk) => bufferArray.push(chunk));
                passThrough.once('error', reject);
                passThrough.once('end', () => {
                    let buffer = Buffer.concat(bufferArray);
                    bufferArray.length = 0;

                    passThrough.destroy();
                    shouldDestroyAfter && stream.destroy();
                    resolve(buffer);
                });
                stream.pipe(passThrough, { end: true });
            });
        }
    }

    return new StorageHelper();
})();
