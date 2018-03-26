module.exports = (function() {
    // const admin = require('firebase-admin'); // firebase admin SDK

    // function AppsRichmenusModel() {};

    // /**
    //  * 回傳預設的 Richmenu 資料結構
    //  */
    // AppsRichmenusModel._schema = function() {
    //     return {
    //         size: {
    //             height: '',
    //             width: ''
    //         },
    //         name: '',
    //         selected: '',
    //         chatBarText: '',
    //         areas: [
    //             {
    //                 bounds: {
    //                     height: '',
    //                     wigth: '',
    //                     x: '',
    //                     y: ''
    //                 },
    //                 action: {
    //                     data: '',
    //                     text: ''
    //                 }
    //             }
    //         ],
    //         isDeleted: 0,
    //         createdTime: Date.now(),
    //         updatedTime: Date.now()
    //     };
    // };

    // /**
    //  * 輸入 指定 appId 的陣列清單，取得該 App 所有圖文選單的資料
    //  *
    //  * @param {string|string[]} appIds
    //  * @param {string|null} richmenuId
    //  * @param {Function} callback
    //  */
    // AppsRichmenusModel.prototype.find = (appIds, richmenuId, callback) => {
    //     let appsRichmenus = {};

    //     Promise.resolve().then(() => {
    //         if (undefined === appIds) {
    //             return Promise.resolve({});
    //         };

    //         if ('string' === typeof appIds) {
    //             appIds = [appIds];
    //         }
    //         return Promise.all(appIds.map((appId) => {
    //             return admin.database().ref('apps/' + appId + '/richmenus').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
    //                 let richmenus = snap.val() || {};
    //                 if (!richmenuId) {
    //                     appsRichmenus[appId] = {
    //                         richmenus: richmenus
    //                     };
    
    //                     return Promise.resolve();
    //                 }

    //                 if (richmenuId && richmenus[richmenuId]) {
    //                     let richmenu = richmenus[richmenuId];
    //                     appsRichmenus[appId] = {
    //                         richmenus: {
    //                             [richmenuId]: richmenu
    //                         }
    //                     };
    
    //                     return Promise.resolve();
    //                 }
    //             });
    //         }));
    //     }).then((appsRichmenus) => {
    //         callback(appsRichmenus);
    //     }).catch(() => {
    //         callback(null);
    //     });
    // };
    // /**
    //  * 找到 圖文選單未刪除的資料包，不含 apps 結構
    //  *
    //  * @param {string} appId
    //  * @param {function({ type: string, text: string}[])} callback
    //  */

    // AppsRichmenusModel.prototype.findRichmenus = (appId, callback) => {
    //     admin.database().ref('apps/' + appId + '/richmenus/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
    //         let richmenus = snap.val() || {};
    //         return richmenus;
    //     }).then((richmenus) => {
    //         callback(richmenus);
    //     }).catch(() => {
    //         callback(null);
    //     });
    // };

    // /**
    //  * 輸入 指定 appId 的陣列清單，新增一筆圖文選單的資料
    //  *
    //  * @param {string} appId
    //  * @param {*} postRichmenu
    //  * @param {Function} callback
    //  */
    // AppsRichmenusModel.prototype.insert = (appId, postRichmenu, callback) => {
    //     let richmenu;

    //     Promise.resolve().then(() => {
    //         if (!appId || !postRichmenu) {
    //             return Promise.reject(new Error());
    //         };
    //         let initRichmenu = AppsRichmenusModel._schema();
    //         richmenu = Object.assign(initRichmenu, postRichmenu);
    //         return admin.database().ref('apps/' + appId + '/richmenus').push(richmenu);
    //     }).then((ref) => {
    //         let richmenusId = ref.key;
    //         let appsRichmenus = {
    //             [appId]: {
    //                 richmenus: {
    //                     [richmenusId]: richmenu
    //                 }
    //             }
    //         };
    //         return Promise.resolve(appsRichmenus);
    //     }).then((appsRichmenus) => {
    //         callback(appsRichmenus);
    //     }).catch(() => {
    //         callback(null);
    //     });
    // };

    // /**
    //  * 輸入 指定 appId 的陣列清單，修改一筆圖文選單的資料
    //  *
    //  * @param {string} appId
    //  * @param {string} richmenuId
    //  * @param {*} putRichmenu
    //  * @param {Function} callback
    //  */
    // AppsRichmenusModel.prototype.update = (appId, richmenuId, putRichmenu, callback) => {
    //     Promise.resolve().then(() => {
    //         if (!appId || !richmenuId) {
    //             return Promise.reject(new Error());
    //         };

    //         let _richmenu = {
    //             updatedTime: Date.now()
    //         };
    //         let richmenu = Object.assign(putRichmenu, _richmenu);
    //         return admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).update(richmenu);
    //     }).then(() => {
    //         return admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).once('value');
    //     }).then((snap) => {
    //         let richmenu = snap.val();
    //         let appsRichmenus = {};
    //         let _richmenus = {};
    //         _richmenus[richmenuId] = richmenu;
    //         appsRichmenus[appId] = {
    //             richmenus: _richmenus
    //         };
    //         callback(appsRichmenus);
    //     }).catch(() => {
    //         callback(null);
    //     });
    // };

    // /**
    //  * 輸入 指定 appId 的陣列清單，刪除一筆圖文選單的資料
    //  *
    //  * @param {string} appId
    //  * @param {string} richmenuId
    //  * @param {Function} callback
    //  */
    // AppsRichmenusModel.prototype.remove = (appId, richmenuId, callback) => {
    //     let deletedRichmenu = {
    //         isDeleted: 1
    //     };

    //     admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).update(deletedRichmenu).then(() => {
    //         return admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).once('value');
    //     }).then((snap) => {
    //         let richmenu = snap.val();
    //         let appsRichmenus = {};
    //         let _richmenus = {};
    //         _richmenus[richmenuId] = richmenu;
    //         appsRichmenus[appId] = {
    //             richmenus: _richmenus
    //         };
    //         return appsRichmenus;
    //     }).then((appsRichmenus) => {
    //         callback(appsRichmenus);
    //     }).catch(() => {
    //         callback(null);
    //     });
    // };

    // return new AppsRichmenusModel();
})();