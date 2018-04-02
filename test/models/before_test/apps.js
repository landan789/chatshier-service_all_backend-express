const chai = require('chai');
const expect = chai.expect;

const appsMdl = require('../../../models/apps.js');
const usersMdl = require('../../../models/users.js');
const groupsMdl = require('../../../models/groups.js');
const ciperHlp = require('../../../helpers/cipher');

class AppsBeforeTest {
    constructor() {
        this._userId = '';
        this._groupId = '';
        this._appId = '';
        this._testError = void 0;
    }

    get userId() { return this._userId; }
    get groupId() { return this._groupId; }
    get appId() { return this._appId; }

    get testError() { return this._testError; }
    set testError(err) { this._testError = err; }

    clean() {
        this._userId = this._groupId = this._appId = '';
        this._testError = void 0;
    }

    /**
     * @returns {Promise<void>}
     */
    run() {
        this.clean();

        let testUser = {
            name: 'test',
            email: 'test@example.com',
            password: ciperHlp.encode('test')
        };

        return usersMdl.insert(testUser).then((users) => {
            expect(users).to.not.be.null;
            expect(users).to.be.an('object');
            let userIds = Object.keys(users);
            expect(userIds.length).eq(1);
            this._userId = userIds.shift();
            expect(this._userId).to.be.string;
            expect(users[this._userId]).to.be.an('object');

            let testGroup = {
                name: 'testGroup'
            };
            return groupsMdl.insert(this._userId, testGroup);
        }).then((groups) => {
            expect(groups).to.not.be.null;
            expect(groups).to.be.an('object');
            let groupIds = Object.keys(groups);
            expect(groupIds.length).eq(1);
            this._groupId = groupIds.shift();
            expect(this._groupId).to.be.string;
            expect(groups[this._groupId]).to.be.an('object');

            let testApp = {
                id1: 'I_am_id1',
                id2: 'I_am_id2',
                name: 'testApp',
                secret: 'I_am_secret',
                token1: 'I_am_token1',
                token2: 'I_am_token2',
                type: 'CHATSHIER',
                group_id: this._groupId
            };

            return appsMdl.insert(this._userId, testApp).then((apps) => {
                expect(apps).to.not.be.null;
                expect(apps).to.be.an('object');
                let appIds = Object.keys(apps);
                expect(appIds.length).eq(1);
                this._appId = appIds.shift();
                expect(this._appId).to.be.string;
                expect(apps[this._appId]).to.be.an('object');

                let app = apps[this._appId];
                expect(app.id1).to.eq(testApp.id1);
                expect(app.id2).to.eq(testApp.id2);
                expect(app.name).to.eq(testApp.name);
                expect(app.secret).to.eq(testApp.secret);
                expect(app.token1).to.eq(testApp.token1);
                expect(app.token2).to.eq(testApp.token2);
                expect(app.type).to.eq(testApp.type);
                expect(app.group_id).to.eq(testApp.group_id);
            });
        }).catch((err) => {
            this._testError = err;
            return Promise.reject(err);
        });
    }
}

module.exports = new AppsBeforeTest();
