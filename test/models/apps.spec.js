const chai = require('chai');
const expect = chai.expect;

const appsMdl = require('../../models/apps.js');
const usersMdl = require('../../models/users.js');
const groupsMdl = require('../../models/groups.js');
const ciperHlp = require('../../helpers/cipher');

let userId;
let groupId;
let appId;
let testError;

const preTest = () => {
    let testUser = {
        name: 'test',
        email: 'test@example.com',
        password: ciperHlp.encode('test')
    };

    return usersMdl.insert(testUser).then((users) => {
        expect(users).to.not.be.null;
        expect(users).to.be.an('object');
        let userIds = Object.keys(users);
        expect(userIds.length).gt(0);
        userId = userIds.shift();
        expect(userId).to.be.string;

        let testGroup = {
            name: 'testGroup'
        };
        return groupsMdl.insert(userId, testGroup);
    }).then((groups) => {
        expect(groups).to.not.be.null;
        expect(groups).to.be.an('object');
        let groupIds = Object.keys(groups);
        expect(groupIds.length).gt(0);
        groupId = groupIds.shift();
        expect(groupId).to.be.string;
    });
};

const postTest = (err) => {
    let deleteUserPromise = userId ? usersMdl.Model.deleteOne({ _id: userId }) : Promise.resolve();
    let deleteGroupPromise = groupId ? groupsMdl.Model.deleteOne({ _id: groupId }) : Promise.resolve();
    let deleteAppPromise = appId ? appsMdl.AppsModel.deleteOne({ _id: appId }) : Promise.resolve();

    return Promise.all([
        deleteUserPromise,
        deleteGroupPromise,
        deleteAppPromise
    ]).then(() => {
        return err && Promise.reject(err);
    });
};

describe('Test Apps Model', () => {
    beforeEach(() => {
        testError = void 0;
        return preTest();
    });

    afterEach(() => {
        return postTest(testError);
    });

    it('Insert an app', () => {
        let testApp = {
            id1: 'I_am_id1',
            id2: 'I_am_id2',
            name: 'testApp',
            secret: 'I_am_secret',
            token1: 'I_am_token1',
            token2: 'I_am_token2',
            type: 'CHATSHIER',
            group_id: groupId
        };

        return appsMdl.insert(userId, testApp).then((apps) => {
            expect(apps).to.not.be.null;
            expect(apps).to.be.an('object');
            let appIds = Object.keys(apps);
            expect(appIds.length).gt(0);
            appId = appIds.shift();
            expect(appId).to.be.string;
        }).catch((err) => {
            testError = err;
        });
    });

    it('Update an app', () => {
        let insertApp = {
            id1: 'I_am_id1',
            id2: 'I_am_id2',
            name: 'testApp',
            secret: 'I_am_secret',
            token1: 'I_am_token1',
            token2: 'I_am_token2',
            type: 'CHATSHIER',
            group_id: groupId
        };

        return appsMdl.insert(userId, insertApp).then((apps) => {
            expect(apps).to.not.be.null;
            expect(apps).to.be.an('object', 'apps should be Object');
            let appIds = Object.keys(apps);
            expect(appIds.length).gt(0, 'After insert, should return an app');
            appId = appIds.shift();
            expect(appId).to.be.string;

            let app = apps[appId];
            expect(app.id1).to.eq(insertApp.id1);
            expect(app.id2).to.eq(insertApp.id2);
            expect(app.name).to.eq(insertApp.name);
            expect(app.secret).to.eq(insertApp.secret);
            expect(app.token1).to.eq(insertApp.token1);
            expect(app.token2).to.eq(insertApp.token2);
            expect(app.type).to.eq(insertApp.type);
            expect(app.group_id).to.eq(insertApp.group_id);
        }).then(() => {
            let updateApp = {
                id1: 'I_am_id1123',
                id2: 'I_am_id2456',
                name: 'updateApp',
                secret: 'I_am_secret12345'
            };
            return appsMdl.update(appId, updateApp).then((apps) => {
                expect(apps).to.not.be.null;
                expect(apps).to.be.an('object', 'apps should be Object');
                let appIds = Object.keys(apps);
                expect(appIds.length).gt(0, 'After update, should return an app');
                appId = appIds.shift();
                expect(appId).to.be.string;

                let app = apps[appId];
                expect(app.id1).to.eq(updateApp.id1);
                expect(app.id2).to.eq(updateApp.id2);
                expect(app.name).to.eq(updateApp.name);
                expect(app.secret).to.eq(updateApp.secret);
            });
        }).catch((err) => {
            testError = err;
        });
    });

    it('Remove an app', () => {
        let insertApp = {
            id1: 'I_am_id1',
            id2: 'I_am_id2',
            name: 'testApp',
            secret: 'I_am_secret',
            token1: 'I_am_token1',
            token2: 'I_am_token2',
            type: 'CHATSHIER',
            group_id: groupId
        };
        return appsMdl.insert(userId, insertApp).then((apps) => {
            expect(apps).to.not.be.null;
            expect(apps).to.be.an('object');
            let appIds = Object.keys(apps);
            expect(appIds.length).gt(0);
            appId = appIds.shift();
            expect(appId).to.be.string;

            let app = apps[appId];
            expect(app.id1).to.eq(insertApp.id1);
            expect(app.id2).to.eq(insertApp.id2);
            expect(app.name).to.eq(insertApp.name);
            expect(app.secret).to.eq(insertApp.secret);
            expect(app.token1).to.eq(insertApp.token1);
            expect(app.token2).to.eq(insertApp.token2);
            expect(app.type).to.eq(insertApp.type);
            expect(app.group_id).to.eq(insertApp.group_id);
        }).then(() => {
            return appsMdl.remove(appId).then((apps) => {
                expect(apps).to.not.be.null;
                expect(apps).to.be.an('object');
                let appIds = Object.keys(apps);
                expect(appIds.length).gt(0);
                appId = appIds.shift();
                expect(appId).to.be.string;

                let app = apps[appId];
                expect(app.isDeleted).to.be.true;
            });
        }).catch((err) => {
            testError = err;
        });
    });
});
