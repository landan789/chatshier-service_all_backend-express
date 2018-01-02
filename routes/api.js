var API_ERROR = require('../config/apiError');
var express = require('express');
var admin = require('firebase-admin');
var users = require('../models/users');
var apps = require('../models/apps');
var router = express.Router();

router.get('/apps/appid/:appid', (req, res, next) => {


});

router.get('/apps/users/:userid', (req, res, next) => {

    var p = new Promise((resolve, reject) => {
        resolve();
    });

    p.then(() => {
        return new Promise((resolve, reject) => {
            var userId = req.params.userid;
            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.getUser(userId, (data) => {
                if (null === data) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                    return;
                }

                resolve(data);
            });
        });
    }).then((data) => {
        var appIds = data.app_ids;

        return new Promise((resolve, reject) => {
            apps.getAppsByAppIds(appIds, (data) => {
                var apps = data;
                if (null === apps || '' === apps || undefined === apps) {
                    reject();
                }

                resolve(apps);
            });
        });

    }).then((apps) => {
        var json = {
            "status": 1,
            "data": apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            "status": 0,
            "msg": ERROR.MSG,
            "code": ERROR.CODE
        };
        res.status(403).json(json);
    });
});


module.exports = router;