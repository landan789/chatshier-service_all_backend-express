const mongoose = require('mongoose');
const appsMdl = require('../models/apps');
const appsImagemapsMdl = require('../models/apps_imagemaps');

console.log('[START] start checking baseUrl of apps imagemaps');
appsMdl.find().then((apps) => {
    if (!apps) {
        return Promise.resolve();
    }

    let appIds = Object.keys(apps);
    let nextApps = (i) => {
        if (i >= appIds.length) {
            return Promise.resolve();
        }

        return Promise.resolve().then(() => {
            let appId = appIds[i];
            return appsImagemapsMdl.find(appId).then((appsImagemaps) => {
                if (!(appsImagemaps && appsImagemaps[appId])) {
                    return [];
                }

                let imagemaps = appsImagemaps[appId].imagemaps;
                return Promise.all(Object.keys(imagemaps).map((imagemapId) => {
                    let imagemap = imagemaps[imagemapId];
                    if (imagemap && imagemap.baseUri && !imagemap.baseUrl) {
                        let putImagemap = {
                            baseUrl: imagemap.baseUri
                        };

                        console.log('[INFO] imagemapId: "' + imagemapId + '" replace "baseUri" to "baseUrl"');
                        return appsImagemapsMdl.update(appId, imagemapId, putImagemap);
                    }
                    return Promise.resolve(null);
                }));
            });
        }).then(() => {
            return nextApps(i + 1);
        });
    };
    return nextApps(0);
}).catch((err) => {
    console.error(err);
}).then(() => {
    console.log('[END] finish checking');
    return mongoose.disconnect();
});