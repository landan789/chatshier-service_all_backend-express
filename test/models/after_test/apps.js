const appsBeforeTest = require('../before_test/apps');

const appsMdl = require('../../../models/apps.js');
const usersMdl = require('../../../models/users.js');
const groupsMdl = require('../../../models/groups.js');

class AppsAfterTest {
    /**
     * @returns {Promise<void>}
     */
    run() {
        let deleteUserPromise = appsBeforeTest.userId ? usersMdl.Model.deleteOne({ _id: appsBeforeTest.userId }) : Promise.resolve();
        let deleteGroupPromise = appsBeforeTest.groupId ? groupsMdl.Model.deleteOne({ _id: appsBeforeTest.groupId }) : Promise.resolve();
        let deleteAppPromise = appsBeforeTest.appId ? appsMdl.AppsModel.deleteOne({ _id: appsBeforeTest.appId }) : Promise.resolve();

        return Promise.all([
            deleteUserPromise,
            deleteGroupPromise,
            deleteAppPromise
        ]).then(() => {
            return appsBeforeTest.testError && Promise.reject(appsBeforeTest.testError);
        });
    }
}

module.exports = new AppsAfterTest();
