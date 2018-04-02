const chai = require('chai');
const expect = chai.expect;

const appsChatroomsMessagersMdl = require('../../models/apps_chatrooms_messagers.js');

const appsBeforeTest = require('./before_test/apps');
const appsChatroomsBeforeTest = require('./before_test/apps_chatrooms');
const appsAfterTest = require('./after_test/apps');

describe('Test AppsChatroomsMessagers Model', () => {
    beforeEach(() => {
        return appsBeforeTest.run().then(() => {
            return appsChatroomsBeforeTest.run();
        });
    });

    afterEach(() => {
        return appsAfterTest.run();
    });

    const checkAndRetrieve = (appsChatroomsMessagers, platformUid) => {
        expect(appsChatroomsMessagers).to.not.be.null;
        expect(appsChatroomsMessagers).to.be.an('object');
        let appIds = Object.keys(appsChatroomsMessagers);
        expect(appIds.length).eq(1);
        let appId = appIds.shift();
        expect(appId).eq(appsBeforeTest.appId);
        let app = appsChatroomsMessagers[appId];
        expect(app).to.be.an('object');

        let chatrooms = app.chatrooms;
        expect(chatrooms).to.be.an('object');
        let chatroomIds = Object.keys(chatrooms);
        expect(chatroomIds.length).eq(1);
        let chatroomId = chatroomIds.shift();
        expect(chatroomId).eq(appsChatroomsBeforeTest.chatroomId);
        let chatroom = chatrooms[chatroomId];
        expect(chatroom).to.be.an('object');

        let messagers = chatroom.messagers;
        expect(messagers).to.be.an('object');
        let messagerId = chatroomIds.shift();
        expect(messagerId).to.be.string;
        let messager = messagers[platformUid];
        expect(messager).to.be.an('object');
        expect(messager._id).to.be.string;
        expect(messager.assigned_ids).to.be.an('array');
        return messager;
    };

    const replace = (messager) => {
        let appId = appsBeforeTest.appId;
        let chatroomId = appsChatroomsBeforeTest.chatroomId;
        let platformUid = messager.platformUid;

        return appsChatroomsMessagersMdl.replace(appId, chatroomId, messager).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(_messager.platformUid).eq(platformUid);
            expect(_messager.type).eq(messager.type);
            expect(_messager.unRead).eq(0);
            return appsChatroomsMessagers;
        });
    };

    it('Replace a messager', () => {
        let platformUid = 'U54345CDABEF2323245778B';
        let messager = {
            type: 'LINE',
            platformUid: platformUid
        };
        return replace(messager);
    });

    it('Increase messager unRead count', () => {
        let appId = appsBeforeTest.appId;
        let chatroomId = appsChatroomsBeforeTest.chatroomId;

        let platformUid = '1234567890';
        let messager = {
            type: 'FACEBOOK',
            platformUid: platformUid
        };
        let unReadCount = 0;

        return replace(messager).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            unReadCount = _messager.unRead + 5;
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid, unReadCount);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(_messager.unRead).eq(unReadCount);
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(_messager.unRead).eq(unReadCount + 1);
        });
    });

    it('Reset messager unRead count', () => {
        let appId = appsBeforeTest.appId;
        let chatroomId = appsChatroomsBeforeTest.chatroomId;

        let platformUid = '1234567890';
        let messager = {
            type: 'FACEBOOK',
            platformUid: platformUid
        };
        let unReadCount = 0;

        return replace(messager).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            unReadCount = _messager.unRead + 3;
            return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, platformUid, unReadCount);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(_messager.unRead).eq(unReadCount);
            return appsChatroomsMessagersMdl.resetUnReadByPlatformUid(appId, chatroomId, platformUid);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            expect(_messager.unRead).eq(0);
        });
    });

    it('Update messager assigned_ids', () => {
        let userId = appsBeforeTest.userId;
        let appId = appsBeforeTest.appId;
        let chatroomId = appsChatroomsBeforeTest.chatroomId;

        let platformUid = '1234567890';
        let messager = {
            type: 'FACEBOOK',
            platformUid: platformUid
        };
        let messagerId;

        return replace(messager).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            messagerId = _messager._id;

            messager = {
                assigned_ids: [userId]
            };

            return appsChatroomsMessagersMdl.update(appId, chatroomId, messagerId, messager);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, messagerId);
            messagerId = _messager._id;
            let _assignedIds = _messager.assigned_ids;
            expect(_assignedIds).to.be.an('array').that.does.include(userId);

            messager = {
                assigned_ids: []
            };
            return appsChatroomsMessagersMdl.update(appId, chatroomId, messagerId, messager);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, messagerId);
            messagerId = _messager._id;
            let _assignedIds = _messager.assigned_ids;
            expect(_assignedIds).to.be.an('array').that.does.empty;

            messager = {
                assigned_ids: [userId]
            };
            return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, platformUid, messager);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            let _assignedIds = _messager.assigned_ids;
            expect(_assignedIds).to.be.an('array').that.does.include(userId);
        });
    });

    it('Remove a messager', () => {
        let appId = appsBeforeTest.appId;
        let chatroomId = appsChatroomsBeforeTest.chatroomId;

        let platformUid = '1234567890';
        let messager = {
            type: 'FACEBOOK',
            platformUid: platformUid
        };

        return replace(messager).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            let isDeleted = _messager.isDeleted;
            expect(isDeleted).to.be.false;
            return appsChatroomsMessagersMdl.remove(appId, chatroomId, platformUid);
        }).then((appsChatroomsMessagers) => {
            let _messager = checkAndRetrieve(appsChatroomsMessagers, platformUid);
            let isDeleted = _messager.isDeleted;
            expect(isDeleted).to.be.true;
        });
    });
});
