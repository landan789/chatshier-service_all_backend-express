module.exports = (function() {
    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');
    const appsFieldsMdl = require('../models/apps_fields');
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
                return Promise.all([
                    appsChatroomsMdl.find(appId),
                    appsFieldsMdl.find(appId)
                ]);
            }).then(([ appsChatrooms, appsFields ]) => {
                if (CHATSHIER === app.type ||
                    !(appsChatrooms && appsChatrooms[appId]) || !appsFields) {
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
                                } else if (appsFields[appId]) {
                                    let field = appsFields[appId].fields[fieldId];
                                    let customFieldValue = customField.value;
                                    let SETS_TYPES = appsFieldsMdl.SetsTypes;

                                    switch (field.setsType) {
                                        case SETS_TYPES.SELECT:
                                        case SETS_TYPES.MULTI_SELECT:
                                            isAvailable = customFieldValue.indexOf(condition.values[0]) >= 0;
                                            break;
                                        case SETS_TYPES.NUMBER:
                                            customFieldValue = parseFloat(customFieldValue);
                                            let numberDown = parseFloat(condition.values[0]);
                                            let numberUp = parseFloat(condition.values[1]);
                                            isAvailable =
                                                !isNaN(customFieldValue) &&
                                                customFieldValue >= numberDown &&
                                                customFieldValue <= numberUp;
                                            break;
                                        case SETS_TYPES.CHECKBOX:
                                            isAvailable = customFieldValue && 'true' === condition.values[0];
                                            break;
                                        default:
                                            break;
                                    }
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
