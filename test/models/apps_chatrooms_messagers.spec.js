const chai = require('chai');
const expect = chai.expect;

const appsChatroomsMessagersMdl = require('../../models/apps_chatrooms_messagers.js');

const appsPreTest = require('./pre_test/apps');
const appsChatroomsPreTest = require('./pre_test/apps_chatrooms');
const appsPostTest = require('./post_test/apps');

describe('Test AppsChatroomsMessagers Model', () => {
    beforeEach(() => {
        return appsPreTest.run().then(() => {
            return appsChatroomsPreTest.run();
        });
    });

    afterEach(() => {
        return appsPostTest.run();
    });

    const checkAndRetrieve = (appsChatroomsMessagers, platformUid) => {
        expect(appsChatroomsMessagers).to.not.be.null;
        expect(appsChatroomsMessagers).to.be.an('object');
        let appIds = Object.keys(appsChatroomsMessagers);
        expect(appIds.length).eq(1);
        let appId = appIds.shift();
        expect(appId).eq(appsPreTest.appId);
        let app = appsChatroomsMessagers[appId];
        expect(app).to.be.an('object');

        let chatrooms = app.chatrooms;
        expect(chatrooms).to.be.an('object');
        let chatroomIds = Object.keys(chatrooms);
        expect(chatroomIds.length).eq(1);
        let chatroomId = chatroomIds.shift();
        expect(chatroomId).eq(appsChatroomsPreTest.chatroomId);
        let chatroom = chatrooms[chatroomId];
        expect(chatroom).to.be.an('object');

        let messagers = chatroom.messagers;
        expect(messagers).to.be.an('object');
        let messagerId = chatroomIds.shift();
        expect(messagerId).to.be.string;
        let messager = messagers[platformUid];
        expect(messager).to.be.an('object');
        return messager;
    };

    const insert = (platformUid, newMessager) => {
        let appId = appsPreTest.appId;
        let chatroomId = appsChatroomsPreTest.chatroomId;

        return appsChatroomsMessagersMdl.insert(appId, chatroomId, platformUid, newMessager).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(messager.platformUid).eq(platformUid);
            expect(messager.type).eq(newMessager.type);
            expect(messager.unRead).eq(0);
            return appsChatroomsMessagers;
        });
    };

    it('Insert a messager', () => {
        let platformUid = 'U54345CDABEF2323245778B';
        let newMessager = {
            type: 'LINE'
        };

        return insert(platformUid, newMessager);
    });

    it('Increase messager unRead count', () => {
        let appId = appsPreTest.appId;
        let chatroomId = appsChatroomsPreTest.chatroomId;

        let platformUid = '1234567890';
        let newMessager = {
            type: 'FACEBOOK'
        };
        let unReadCount = 0;

        return insert(platformUid, newMessager).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            unReadCount = messager.unRead + 5;
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid, unReadCount);
        }).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(messager.unRead).eq(unReadCount);
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid);
        }).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(messager.unRead).eq(unReadCount + 1);
        });
    });

    it('Reset messager unRead count', () => {
        let appId = appsPreTest.appId;
        let chatroomId = appsChatroomsPreTest.chatroomId;

        let platformUid = '1234567890';
        let newMessager = {
            type: 'FACEBOOK'
        };
        let unReadCount = 0;

        return insert(platformUid, newMessager).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            unReadCount = messager.unRead + 3;
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid, unReadCount);
        }).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(messager.unRead).eq(unReadCount);
            return appsChatroomsMessagersMdl.resetUnReadByPlatformUid(appId, chatroomId, platformUid);
        }).then((appsChatroomsMessagers) => {
            let messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(messager.unRead).eq(0);
        });
    });
});
