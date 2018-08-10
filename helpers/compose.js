module.exports = (function() {
    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');
    const appsFieldsMdl = require('../models/apps_fields');
    /** @type {any} */
    const ERROR = require('../config/error.json');

    const CHATSHIER = 'CHATSHIER';

    const CONDITION_TYPES = Object.freeze({
        AGE_RANGE: 'AGE_RANGE',
        GENDER: 'GENDER',
        EMAIL: 'EMAIL',
        PHONE: 'PHONE',
        ADDRESS: 'ADDRESS',
        TAGS: 'TAGS',
        CUSTOM_FIELD: 'CUSTOM_FIELD'
    });

    const TEXT_MATCH_WAYS = Object.freeze({
        INCLUDES: 'INCLUDES',
        FULL_MATCH: 'FULL_MATCH',
        STARTS_WITH: 'STARTS_WITH',
        ENDS_WITH: 'ENDS_WITH'
    });

    const textValidation = {
        [TEXT_MATCH_WAYS.INCLUDES]: (src, dest) => src.includes(dest),
        [TEXT_MATCH_WAYS.FULL_MATCH]: (src, dest) => (src === dest),
        [TEXT_MATCH_WAYS.STARTS_WITH]: (src, dest) => src.startsWith(dest),
        [TEXT_MATCH_WAYS.ENDS_WITH]: (src, dest) => src.endsWith(dest)
    };

    class ComposeHelper {
        constructor() {
            this.CONDITION_TYPES = CONDITION_TYPES;
        }

        /**
         * @param {Chatshier.Models.ComposeCondition[]} conditions
         * @param {string} appId
         * @returns {Promise<Chatshier.Models.AppsChatrooms>}
         */
        findAvailableMessagers(conditions, appId) {
            let availableMessagers = {};
            let app;

            /** @type {{ [type: string]: Chatshier.Models.ComposeCondition[] }} */
            let conditionsSets = conditions.reduce((output, condition) => {
                let type = condition.type;
                if (condition.field_id) {
                    let fieldId = condition.field_id;
                    output[fieldId] = output[fieldId] || [];
                    output[fieldId].push(condition);
                } else {
                    output[type] = output[type] || [];
                    output[type].push(condition);
                }
                return output;
            }, {});

            return appsMdl.find(appId).then((apps) => {
                if (!(apps && apps[appId])) {
                    return Promise.reject(ERROR.APP_FAILED_TO_FIND);
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

                        let isAvailable = true;
                        for (let conditionType in conditionsSets) {
                            let _conditions = conditionsSets[conditionType];
                            let isAccept = !_conditions.length;

                            for (let i in _conditions) {
                                let condition = _conditions[i];

                                if (CONDITION_TYPES.AGE_RANGE === condition.type) {
                                    if (!messager.age) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let ageDown = condition.values[0];
                                        let ageUp = condition.values[1];
                                        isAccept = isAccept || (ageDown <= messager.age && ageUp >= messager.age);
                                    }
                                } else if (CONDITION_TYPES.GENDER === condition.type) {
                                    if (!messager.gender) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let gender = condition.values[0];
                                        isAccept = isAccept || gender === messager.gender;
                                    }
                                } else if (CONDITION_TYPES.EMAIL === conditionType) {
                                    if (!messager.email) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.email, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.PHONE === conditionType) {
                                    if (!messager.phone) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.phone, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.ADDRESS === conditionType) {
                                    if (!messager.address) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.address, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.TAGS === condition.type) {
                                    if (!messager.tags || (messager.tags && 0 === messager.tags.length)) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let tags = condition.values;
                                        let hasContainTag = false;
                                        for (let i in tags) {
                                            if (messager.tags.includes(tags[i])) {
                                                hasContainTag = true;
                                                break;
                                            }
                                        }
                                        isAccept = isAccept || hasContainTag;
                                    }
                                } else {
                                    let fieldId = condition.field_id || '';
                                    let customField = messager.custom_fields[fieldId];

                                    if (!(customField && customField.value)) {
                                        isAccept = isAccept || false;
                                    } else if (appsFields[appId]) {
                                        let field = appsFields[appId].fields[fieldId];
                                        let customFieldValue = customField.value || [];
                                        let SETS_TYPES = appsFieldsMdl.SetsTypes;

                                        switch (field.setsType) {
                                            case SETS_TYPES.SELECT:
                                            case SETS_TYPES.MULTI_SELECT:
                                                isAccept = isAccept || customFieldValue.indexOf(condition.values[0]) >= 0;
                                                break;
                                            case SETS_TYPES.NUMBER:
                                                customFieldValue = parseFloat(customFieldValue);
                                                let numberDown = parseFloat(condition.values[0]);
                                                let numberUp = parseFloat(condition.values[1]);
                                                isAccept = isAccept || (
                                                    !isNaN(customFieldValue) &&
                                                    customFieldValue >= numberDown &&
                                                    customFieldValue <= numberUp
                                                );
                                                break;
                                            case SETS_TYPES.CHECKBOX:
                                                isAccept = isAccept || (
                                                    (customFieldValue && 'true' === condition.values[0]) ||
                                                    (!customFieldValue && 'false' === condition.values[0])
                                                );
                                                break;
                                            case SETS_TYPES.TEXT:
                                                let matchText = condition.values[0] || '';
                                                let matchWay = condition.values[1] || '';
                                                if (matchText && matchWay) {
                                                    isAccept = textValidation[matchWay] ? textValidation[matchWay](customFieldValue, matchText) : false;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                            isAvailable = isAvailable && isAccept;
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

    ComposeHelper.CONDITION_TYPES = CONDITION_TYPES;
    return new ComposeHelper();
})();
