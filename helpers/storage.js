module.exports = (function() {
    require('isomorphic-fetch'); // polyfill fetch method for Dropbox SDK
    const request = require('request');
    const PassThrough = require('stream').PassThrough;
    const CHATSHIER_CFG = require('../config/chatshier');

    const Dropbox = require('dropbox').Dropbox;
    const dbx = new Dropbox({
        accessToken: CHATSHIER_CFG.STORAGE.DROPBOX_ACCESS_TOKEN
    });
    const POLL_INTERVAL = 250; // 每秒詢問 4 次

    const FDL_API_ENDPOINT = 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks';
    const FDL_REFERER = 'https://service.chatshier.com';

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
            return dbx.filesUpload(args).catch((err) => {
                return this._handleTooMenyRequests(err).then(() => {
                    return this.filesUpload(path, contents);
                });
            });
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
            return dbx.filesMoveV2(args).catch((err) => {
                return this._handleTooMenyRequests(err).then(() => {
                    return this.filesMoveV2(fromPath, toPath);
                });
            });
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
            }).catch((err) => {
                return this._handleTooMenyRequests(err).then(() => {
                    return this.filesSaveUrl(path, url);
                });
            });
        }

        /**
         * @param {string} path
         * @param {boolean} [useShortUrl=false]
         * @returns {Promise<string>}
         */
        sharingCreateSharedLink(path, useShortUrl = false) {
            return dbx.sharingCreateSharedLink({ path: path }).then((response) => {
                if (!response) {
                    return '';
                }
                return response.url.replace('www.dropbox', this.sharedLinkPrefix).replace('?dl=0', '');
            }).then((url) => {
                if (useShortUrl) {
                    return this.FDLcreate(url).then((res) => {
                        return res.shortLink;
                    }).catch(() => {
                        return url;
                    });
                }
                return url;
            }).catch((err) => {
                return this._handleTooMenyRequests(err).then(() => {
                    return this.sharingCreateSharedLink(path);
                });
            });
        }

        /**
         * @param {string} path
         */
        filesDownload(path) {
            return dbx.filesDownload({ path: path }).catch((err) => {
                return this._handleTooMenyRequests(err).then(() => {
                    return this.filesDownload(path);
                });
            });
        }

        /**
         * @param {string} url
         */
        downloadUrlToBuffer(url) {
            return new Promise((resolve, reject) => {
                let options = {
                    url: url,
                    encoding: null
                };

                request(options, (err, res, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(buffer);
                });
            });
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

        /**
         * https://firebase.google.com/docs/reference/dynamic-links/link-shortener
         * Firebase Dynamic Links create
         *
         * @param {string} url
         * @returns {Promise<{ shortLink: string, previewLink: string }>}
         */
        FDLcreate(url) {
            let apiEndpoint = FDL_API_ENDPOINT + '?key=' + CHATSHIER_CFG.GOOGLE.SERVER_API_KEY;
            let reqHeaders = new Headers({
                'Content-Type': 'application/json',
                'referer': FDL_REFERER
            });

            let args = {
                dynamicLinkInfo: {
                    dynamicLinkDomain: CHATSHIER_CFG.GOOGLE.FDL_DOMAIN,
                    link: url
                },
                suffix: {
                    option: 'UNGUESSABLE' // SHORT or UNGUESSABLE
                }
            };

            let reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(args)
            };
            return fetch(apiEndpoint, reqInit).then((res) => res.json());
        }

        _handleTooMenyRequests(err) {
            if (429 === err.status) {
                return new Promise((resolve) => setTimeout(resolve, err.error.error.retry_after));
            }
            return Promise.reject(err);
        }
    }

    return new StorageHelper();
})();
