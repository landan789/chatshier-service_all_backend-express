const consumersMdl = require('../models/consumers');
const storageHlp = require('../helpers/storage');
const mongoose = require('mongoose');

console.log('[START] start checking photo of consumers');
consumersMdl.find().then((consumers) => {
    return Promise.all(Object.keys(consumers).map((platformUid) => {
        let consumer = consumers[platformUid];
        if (!(consumer && 'string' !== typeof consumer.photo)) {
            return Promise.resolve();
        }

        let shouldUpload = consumer.photo.startsWith('http://');
        if (shouldUpload) {
            let fileName = `${platformUid}_${Date.now()}.jpg`;
            let photoPath = `/consumers/${platformUid}/photo/${fileName}`;
            console.log('[INFO] uploading "' + platformUid + '" photo to storage path: ' + photoPath);

            return storageHlp.filesSaveUrl(photoPath, consumer.photo).catch(() => {
                console.log('[ERR] failed to upload of "' + platformUid + '" photo');
                return '';
            }).then((url) => {
                if (!url) {
                    return;
                }

                let putConsumer = { photo: url };
                console.log('[INFO] saved "' + platformUid + '" photo with url: ' + url);
                return consumersMdl.replace(platformUid, putConsumer);
            });
        }
        return Promise.resolve();
    }));
}).catch((err) => {
    console.error(err);
}).then(() => {
    console.log('[END] finish checking');
    return mongoose.disconnect();
});
