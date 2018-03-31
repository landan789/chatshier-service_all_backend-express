const appsPreTest = require('../pre_test/apps');

const appsMdl = require('../../../models/apps.js');
const usersMdl = require('../../../models/users.js');
const groupsMdl = require('../../../models/groups.js');

class AppsPostTest {
    /**
     * @returns {Promise<void>}
     */
    run() {
        let deleteUserPromise = appsPreTest.userId ? usersMdl.Model.deleteOne({ _id: appsPreTest.userId }) : Promise.resolve();
        let deleteGroupPromise = appsPreTest.groupId ? groupsMdl.Model.deleteOne({ _id: appsPreTest.groupId }) : Promise.resolve();
        let deleteAppPromise = appsPreTest.appId ? appsMdl.AppsModel.deleteOne({ _id: appsPreTest.appId }) : Promise.resolve();

        return Promise.all([
            deleteUserPromise,
            deleteGroupPromise,
            deleteAppPromise
        ]).then(() => {
            return appsPreTest.testError && Promise.reject(appsPreTest.testError);
        });
    }
}

module.exports = new AppsPostTest();
