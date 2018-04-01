const chai = require('chai');
const expect = chai.expect;

const appsChatroomsMdl = require('../../../models/apps_chatrooms.js');
const appsBeforeTest = require('../before_test/apps');

class AppsChatroomsBeforeTest {
    constructor() {
        this._chatroomId = '';
        this._testError = void 0;
    }

    get chatroomId() { return this._chatroomId; }

    get testError() { return this._testError; }
    set testError(err) { this._testError = err; }

    clean() {
        this._chatroomId = '';
        this._testError = void 0;
    }

    /**
     * @returns {Promise<void>}
     */
    run() {
        this.clean();

        return appsChatroomsMdl.insert(appsBeforeTest.appId).then((appsChatrooms) => {
            expect(appsChatrooms).to.not.be.null;
            expect(appsChatrooms).to.be.an('object');
            let appsIds = Object.keys(appsChatrooms);
            expect(appsIds.length).eq(1);
            let appId = appsIds.shift();
            expect(appId).to.be.string;
            expect(appsChatrooms[appId]).to.be.an('object');
            let chatrooms = appsChatrooms[appId].chatrooms;
            expect(chatrooms).to.be.an('object');
            let chatroomIds = Object.keys(chatrooms);
            expect(chatroomIds.length).eq(1);
            this._chatroomId = chatroomIds.shift();
            expect(this._chatroomId).to.be.string;
            let chatroom = chatrooms[this._chatroomId];
            expect(chatroom).to.be.an('object');
        }).catch((err) => {
            this._testError = err;
            return Promise.reject(err);
        });
    }
}

module.exports = new AppsChatroomsBeforeTest();
