module.exports = (function() {
    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    const CHATSHIER = 'CHATSHIER';

    class ComposeHelper {
        /**
         * @param {Array<any>} conditions
         * @param {string} appId
         */
        findAvailableMessagers(conditions, appId) {
            let availableMessagers = {};
            let app;

            return appsMdl.find(appId).then((apps) => {
                if (!apps || (apps && 1 !== Object.keys(apps).length)) {
                    return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                }
                app = apps[appId];
                return appsChatroomsMdl.find(appId);
            }).then((appsChatrooms) => {
                if (CHATSHIER === app.type) {
                    return availableMessagers;
                }

                let chatrooms = appsChatrooms[appId].chatrooms;
                for (let chatroomId in chatrooms) {
                    let chatroom = chatrooms[chatroomId];
                    if (chatroom.platformGroupId) {
                        continue;
                    }
                    let messagers = chatroom.messagers;

                    for (let messagerId in messagers) {
                        let messager = messagers[messagerId];
                        if (CHATSHIER === messager.type) {
                            continue;
                        }

                        let isAvailable = !conditions.length;
                        for (let i in conditions) {
                            let condition = conditions[i];

                            if ('AGE_RANGE' === condition.type) {
                                if (!messager.age) {
                                    isAvailable = false;
                                } else {
                                    let ageDown = condition.values[0];
                                    let ageUp = condition.values[1];
                                    isAvailable = ageDown <= messager.age && ageUp >= messager.age;
                                }
                            } else if ('GENDER' === condition.type) {
                                if (!messager.gender) {
                                    isAvailable = false;
                                } else {
                                    let gender = condition.values[0];
                                    isAvailable = gender === messager.gender;
                                }
                            } else if ('TAGS' === condition.type) {
                                if (!messager.tags || (messager.tags && 0 === messager.tags.length)) {
                                    isAvailable = false;
                                } else {
                                    let tags = condition.values;
                                    let hasContainTag = false;
                                    for (let i in tags) {
                                        if (messager.tags.includes(tags[i])) {
                                            hasContainTag = true;
                                            break;
                                        }
                                    }
                                    isAvailable = hasContainTag;
                                }
                            } else if ('CUSTOM_FIELD' === condition.type) {
                                let fieldId = condition.field_id;
                                let customField = messager.custom_fields[fieldId];
                                if (!customField) {
                                    isAvailable = false;
                                } else {
                                    let customFieldValue = customField.value;
                                    isAvailable = customFieldValue.indexOf(condition.values[0]) >= 0;
                                }
                            }

                            if (!isAvailable) {
                                break;
                            }
                        }

                        if (isAvailable) {
                            if (!availableMessagers[appId]) {
                                availableMessagers[appId] = {
                                    name: app.name,
                                    type: app.type,
                                    group_id: app.group_id,
                                    id1: app.id1,
                                    id2: app.id2,
                                    secret: app.secret,
                                    token1: app.token1,
                                    token2: app.token2,
                                    chatrooms: {}
                                };
                            }

                            if (!availableMessagers[appId].chatrooms[chatroomId]) {
                                availableMessagers[appId].chatrooms[chatroomId] = {
                                    name: chatroom.name,
                                    platformGroupId: chatroom.platformGroupId,
                                    platformGroupType: chatroom.platformGroupType,
                                    messagers: {}
                                };
                            }

                            availableMessagers[appId].chatrooms[chatroomId].messagers[messagerId] = messager;
                        }
                    }
                }

                return availableMessagers;
            });
        }
    }
    return new ComposeHelper();
})();
