module.exports = (function() {
    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');

    const CHATSHIER = 'CHATSHIER';
    const ALL = 'ALL';
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

    class ComposeHelper {
        /**
         * @param {Array<any>} conditions
         */
        findAvailableMessagers(conditions) {
            let availableMessagers = {};
            let apps;
            let appIds;

            return appsMdl.find().then((_apps) => {
                apps = _apps || {};
                appIds = Object.keys(apps);
                return appsChatroomsMdl.find(appIds);
            }).then((appsChatrooms) => {
                for (let i in appIds) {
                    let _appId = appIds[i];
                    let app = apps[_appId];
                    if (CHATSHIER === app.type) {
                        continue;
                    }

                    let chatrooms = appsChatrooms[_appId].chatrooms;
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

                            let isAvailable = false;
                            for (let i in conditions) {
                                let condition = conditions[i];

                                if ('CHATBOT' === condition.type) {
                                    if (condition.values.includes(ALL)) {
                                        isAvailable = true;
                                    } else if (condition.values.includes(LINE)) {
                                        isAvailable = LINE === app.type;
                                    } else if (condition.values.includes(FACEBOOK)) {
                                        isAvailable = FACEBOOK === app.type;
                                    } else {
                                        isAvailable = condition.values.includes(_appId);
                                    }
                                } else if ('AGE_RANGE' === condition.type) {
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
                                if (!availableMessagers[_appId]) {
                                    availableMessagers[_appId] = {
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

                                if (!availableMessagers[_appId].chatrooms[chatroomId]) {
                                    availableMessagers[_appId].chatrooms[chatroomId] = {
                                        name: chatroom.name,
                                        platformGroupId: chatroom.platformGroupId,
                                        platformGroupType: chatroom.platformGroupType,
                                        messagers: {}
                                    };
                                }

                                availableMessagers[_appId].chatrooms[chatroomId].messagers[messagerId] = messager;
                            }
                        }
                    }
                }

                return availableMessagers;
            });
        }
    }
    return new ComposeHelper();
})();
