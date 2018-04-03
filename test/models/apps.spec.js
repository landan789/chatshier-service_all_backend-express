const chai = require('chai');
const expect = chai.expect;

const appsMdl = require('../../models/apps.js');
const appsBeforeTest = require('./before_test/apps');
const appsAfterTest = require('./after_test/apps');

describe('Test Apps Model', () => {
    beforeEach(() => {
        return appsBeforeTest.run();
    });

    afterEach(() => {
        return appsAfterTest.run();
    });

    const checkAndRetrieve = (apps) => {
        expect(apps).to.not.be.null;
        expect(apps).to.be.an('object');
        let appIds = Object.keys(apps);
        expect(appIds.length).eq(1);
        let appId = appIds.shift();
        expect(appId).to.be.string;
        let app = apps[appId];
        expect(app).to.be.an('object');
        return app;
    };

    it('Update an app', () => {
        let updateApp = {
            id1: 'I_am_id1123',
            id2: 'I_am_id2456',
            name: 'updateApp',
            secret: 'I_am_secret12345'
        };
        return appsMdl.update(appsBeforeTest.appId, updateApp).then((apps) => {
            let app = checkAndRetrieve(apps);
            expect(app.id1).to.eq(updateApp.id1);
            expect(app.id2).to.eq(updateApp.id2);
            expect(app.name).to.eq(updateApp.name);
            expect(app.secret).to.eq(updateApp.secret);
        }).catch((err) => {
            appsBeforeTest.testError = err;
        });
    });

    it('Remove an app', () => {
        return appsMdl.remove(appsBeforeTest.appId).then((apps) => {
            let app = checkAndRetrieve(apps);
            expect(app.isDeleted).to.be.true;
        }).catch((err) => {
            appsBeforeTest.testError = err;
        });
    });
});
