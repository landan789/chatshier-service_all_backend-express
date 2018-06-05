const consumersMdl = require('../models/consumers');
const storageHlp = require('../helpers/storage');

console.log('[START] start checking photo of consumers');
consumersMdl.find().then((consumers) => {
    return Promise.all(Object.keys(consumers).map((platformUid) => {
        let consumer = consumers[platformUid];
        let shouldUpload = consumer.photo.startsWith('http://');
        if (shouldUpload) {
            let fileName = `${platformUid}_${Date.now()}.jpg`;
            let photoPath = `/consumers/${platformUid}/photo/${fileName}`;
            console.log('[INFO] uploading "' + platformUid + '" photo to storage path: ' + photoPath);

            return storageHlp.filesSaveUrl(photoPath, consumer.photo).then((url) => {
                let putConsumer = { photo: url };
                console.log('[INFO] saved "' + platformUid + '" photo with url: ' + url);
                return consumersMdl.replace(platformUid, putConsumer);
            });
        }
        return Promise.resolve();
    })).then(() => {
        console.log('[END] finish checking');
    });
});
