const consumersMdl = require('../models/consumers');
const storageHlp = require('../helpers/storage');
const mongoose = require('mongoose');
const request = require('request');

/** @returns {Promise<boolean>} */
let checkingPhotoIsAlive = (photoUrl) => {
    return new Promise((resolve) => {
        let options = {
            method: 'GET',
            url: photoUrl
        };

        request(options, (error, res, body) => {
            if (error || res.statusCode >= 300) {
                return resolve(false);
            }
            resolve(true);
        });
    });
};

console.log('[START] start checking photo of consumers');
consumersMdl.find().then((consumers) => {
    if (!consumers) {
        return Promise.resolve();
    }

    let platformUids = Object.keys(consumers);
    let nextConsumer = (i) => {
        if (i >= platformUids.length) {
            return Promise.resolve();
        }

        return Promise.resolve().then(() => {
            let platformUid = platformUids[i];
            let consumer = consumers[platformUid];
            if (!(consumer && 'string' === typeof consumer.photo)) {
                return Promise.resolve(null);
            }

            let shouldUpload = consumer.photo.startsWith('http://');
            if (shouldUpload) {
                let putConsumer = {
                    photo: '',
                    photoOriginal: consumer.photo
                };

                let fileName = `${platformUid}_${Date.now()}.jpg`;
                let photoPath = `/consumers/${platformUid}/photo/${fileName}`;
                console.log('[INFO] platformUid: "' + platformUid + '"');
                console.log('[INFO] uploading "' + consumer.photo + '" photo to storage path: ' + photoPath);

                return checkingPhotoIsAlive(consumer.photo).then((isAlive) => {
                    if (!isAlive) {
                        console.log('[INFO] photo url was dead, save photo to \'\'');
                        console.log('');
                        return Promise.resolve(null);
                    }

                    return storageHlp.filesSaveUrl(photoPath, consumer.photo).catch((err) => {
                        console.log(err);
                        console.log('[ERR] failed to upload photo');
                        return '';
                    }).then((url) => {
                        console.log('[INFO] photo replace to url: ' + url);
                        console.log('');
                        putConsumer.photo = url;
                        return consumersMdl.replace(platformUid, putConsumer);
                    });
                }).then(() => {
                    return consumersMdl.replace(platformUid, putConsumer);
                });
            }
            return Promise.resolve(null);
        }).then(() => {
            return nextConsumer(i + 1);
        });
    };
    return nextConsumer(0);
}).catch((err) => {
    console.error(err);
}).then(() => {
    console.log('[END] finish checking');
    return mongoose.disconnect();
});
