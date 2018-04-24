/// <reference path='../../typings/client/index.d.ts' />

(function() {
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const WECHAT = 'WECHAT';
    const CHATSHIER = 'CHATSHIER';
    const ACTIVE = '啟用';
    const INACTIVE = '未啟用';
    const NO_PERMISSION_CODE = '3.16';
    var api = window.restfulAPI;
    var transJson = {};

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    window.translate.ready.then(function(json) {
        transJson = json;
    });

    // 動態載入 gapi
    window.googleClientHelper.loadAPI().then(function() {
        var url = window.googleCalendarHelper.configJsonUrl;
        return window.googleClientHelper.init(url);
    }).then(function(isSignedIn) {
        var $gCalendarRow = $('#gcalendar_row');
        $gCalendarRow.removeClass('d-none');

        var $gCalendarCbx = $gCalendarRow.find('#gcalendar_cbx');
        $gCalendarCbx.prop('checked', isSignedIn);
        $gCalendarCbx.on('change', function(ev) {
            var elem = ev.target;
            if (elem.checked) {
                elem.checked = !elem.checked;
                return window.googleClientHelper.signIn().then(function() {
                    elem.checked = true;
                }).catch(function() {
                    elem.checked = false;
                });
            } else {
                elem.checked = !elem.checked;
                return window.googleClientHelper.signOut().then(function() {
                    elem.checked = false;
                }).catch(function() {
                    elem.checked = true;
                });
            }
        });
    });

    // ACTIONS
    $(document).on('click', '#edit', function() {
        let appId = $(this).attr('rel');
        findOneApp(appId); // 點選編輯後根據appId列出指定的APP
    });

    $(document).on('click', '#del', function() {
        let appId = $(this).attr('rel');
        removeOneApp(appId);
    });

    $(document).on('click', '#add-new-btn', function() {
        let groupId = $(this).attr('rel');
        let formStr =
            '<form>' +
                '<div class="form-group d-none">' +
                    '<div id="type">insertNewApp</div>' +
                    '<div id="groupId">' + groupId + '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">新增機器人:</label>' +
                    '<select id="app-group-select" class="form-control" value="LINE">' +
                        '<option value="LINE">LINE</option>' +
                        '<option value="FACEBOOK">臉書</option>' +
            // '<option value="WECHAT">WeChat</option>' +
                    '</select>' +
                '</div>' +
                '<div class="app-form" id="line-form">' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="line-name" placeholder="請輸入名稱" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">Channel ID:</label>' +
                            '<div class="input-container">' +
                            '<input class="form-control" type="text" id="channel-id" placeholder="請至 LINE Developers 查詢" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">Channel Secret: </label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="channel-secret" placeholder="請至 LINE Developers 查詢" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">Channel Access Token:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="channel-token" placeholder="請至 LINE Developers 查詢" />' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="app-form d-none" id="facebook-form">' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-name" placeholder="請輸入名稱">' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">粉絲頁 ID:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-page-id" placeholder="請至 粉絲專頁 > 關於 查詢">' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">App ID:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-app-id" placeholder="請至 Facebook Developers 查詢">' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">App Secret:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-app-secret" placeholder="請至 Facebook Developers 查詢">' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">Validation Token:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-valid-token" placeholder="請至 Facebook Developers 查詢">' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label font-weight-bold">Page Token:</label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="facebook-page-token" placeholder="請至 Facebook Developers 查詢">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="app-form d-none" id="wechat-form">' +
                    '<div class="form-group">' +
                        '<label class="col-form-label">機器人名稱: </label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="wechat-name" placeholder="請輸入名稱" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label">App ID: </label>' +
                            '<div class="input-container">' +
                            '<input class="form-control" type="text" id="channel-id" placeholder="請至 Wechat Developers 查詢" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label class="col-form-label">App Secret: </label>' +
                        '<div class="input-container">' +
                            '<input class="form-control" type="text" id="channel-secret" placeholder="請至 Wechat Developers 查詢" />' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</form>';
        $appModal.append(formStr);
    });

    $(document).on('change', '#app-group-select', function(ev) { // 切換模式 LINE或是臉書
        let $selector = $(ev.target);
        let type = $selector.find('option:selected').val();
        $selector.parents('form').find('.app-form').addClass('d-none');

        switch (type) {
            case LINE:
                $('#line-form').removeClass('d-none');
                break;
            case FACEBOOK:
                $('#facebook-form').removeClass('d-none');
                break;
            case WECHAT:
                $('#wechat-form').removeClass('d-none');
                break;
            default:
                break;
        }
    });

    $('#setting-modal').on('hidden.bs.modal', function() {
        clearAppModalBody();
    });

    $('#setting-modal-submit-btn').on('click', function(ev) {
        ev.preventDefault();

        let $modalContent = $(ev.target).parents('.modal-content');
        let type = $modalContent.find('#type').text();
        let groupId;
        // insertNewApp, updateProfile, updateApp
        switch (type) {
            case 'insertNewApp':
                let type = $modalContent.find('#app-group-select option:selected').val();
                groupId = $('#groupId').text();
                let app = insertType(type, groupId);
                insertOneApp(app);
                break;
            case 'updateProfile':
                profSubmitBasic();
                break;
            case 'updateApp':
                let appId = $modalContent.find('#webhook-id').text();
                groupId = $modalContent.find('#groupId').text();

                if ($('#name').val()) {
                    let name = $('#name').val();
                    let id1 = $('#channel-id').val();
                    let secret = $('#channel-secret').val();
                    let token1 = $('#channel-token').val();
                    let type = LINE;
                    let app = {
                        name: name,
                        id1: id1,
                        secret: secret,
                        token1: token1,
                        type: type
                    };
                    updateOneApp(appId, app); // 點送出後更新APP的資訊
                } else if ($('#facebook-name').val()) {
                    let name = $('#facebook-name').val();
                    let id1 = $('#facebook-page-id').val();
                    let id2 = $('#facebook-app-id').val();
                    let secret = $('#facebook-app-secret').val();
                    let token1 = $('#facebook-valid-token').val();
                    let token2 = $('#facebook-page-token').val();
                    let type = FACEBOOK;
                    let app = {
                        name: name,
                        id1: id1,
                        id2: id2,
                        secret: secret,
                        token1: token1,
                        token2: token2,
                        type: type
                    };
                    updateOneApp(appId, app); // 點送出後更新APP的資訊
                } else if ($('#wechat-app-name').val()) {
                    let name = $('#wechat-app-name').val();
                    let id1 = $('#wechat-app-id').val();
                    let secret = $('#wechat-app-secret').val();
                    let type = WECHAT;
                    let app = {
                        name: name,
                        id1: id1,
                        secret: secret,
                        type: type
                    };
                    updateOneApp(appId, app);
                }
                break;
            default:
                break;
        }
    });

    $('#userProfileEdit').click(function() {
        let company = $('#prof-company').text();
        let phone = $('#prof-phonenumber').text();
        let location = $('#prof-address').text();
        let str =
            '<div id="line-form">' +
                '<div id="type" class="d-none">updateProfile</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">公司名稱: </label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" value="' + company + '" id="company"/>' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">手機: </label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="tel" value="' + phone + '" id="phone"/>' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">地址: </label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" value="' + location + '" id="location"/>' +
                    '</div>' +
                '</div>' +
            '</div>';
        $appModal.append(str);
    });

    findAllGroups().then(() => {
        return findAllApps();
    });
    // 列出所有設定的APPs
    findUserProfile();

    // ===============
    // #region 客戶分類條件 Tab 代碼區塊
    (function() {
        var NEW_TAG_ID_PREFIX = 'temp_field_id';
        var fieldEnums = api.appsFields.enums;

        var fieldPanelCtrl = (function() {
            var instance = new FieldPanelCtrl();

            // 宣告用來處理整個客戶分類條件容器的控制類別
            function FieldPanelCtrl() {
                this.saveListeners = [];
                this.deleteListeners = [];
                this.$appsFieldsWapper = $('#appsFieldsWapper');
            }

            /**
             * @param {string} appId
             */
            FieldPanelCtrl.prototype.toggleItem = function(appId) {
                var fieldCollapseId = appId + '_collapse';
                this.$appsFieldsWapper.find('#' + fieldCollapseId).collapse();
            };

            /**
             * @param {string} appId
             * @param {any} app
             */
            FieldPanelCtrl.prototype.addAppItem = function(appId, app) {
                var _this = this;
                var fieldCollapseId = appId + '_collapse';

                // _this.$appsFieldsWapper.append(
                //     '<div class="card-header" role="tab" id="' + appId + '">' +
                //         '<div class="app-name collapsed" role="button" data-toggle="collapse" data-parent="#appsFieldsWapper" href="#' + fieldCollapseId + '" aria-expanded="true" aria-controls="' + fieldCollapseId + '">' +
                //             (app.name || '') +
                //         '</div>' +
                //     '</div>' +
                //     '<div id="' + fieldCollapseId + '" class="card-collapse collapse" aria-labelledby="' + appId + '">' +
                //         '<div class="card-body">' +
                //             '<button type="button" class="btn btn-light btn-border add-field mb-3">' +
                //                 '<i class="fas fa-plus fa-fw"></i>新增' +
                //             '</button>' +
                //             '<table class="chsr table table-striped">' +
                //                 '<thead>' +
                //                     '<tr>' +
                //                         '<th>欄位名稱</th>' +
                //                         '<th>欄位類別</th>' +
                //                         '<th>欄位設定</th>' +
                //                         '<th>刪除</th>' +
                //                         '<th></th>' +
                //                     '</tr>' +
                //                 '</thead>' +
                //                 '<tbody></tbody>' +
                //             '</table>' +
                //             '<div class="text-center">' +
                //                 '<button type="button" class="btn btn-light btn-border all-confirm font-weight-bold">儲存設定</button>' +
                //             '</div>' +
                //         '</div>' +
                //     '</div>'
                // );

                _this.$appsFieldsWapper.append(
                    '<div class="app-name collapsed" role="button" data-toggle="collapse" data-parent="#appsFieldsWapper" href="#' + fieldCollapseId + '" aria-expanded="true" aria-controls="' + fieldCollapseId + '">' +
                        (app.name || '') +
                    '</div>' +
                    '<div id="' + fieldCollapseId + '" class="card-collapse collapse" aria-labelledby="' + appId + '">' +
                        '<button type="button" class="btn btn-light btn-border add-field m-3">' +
                            '<i class="fas fa-plus fa-fw"></i>' +
                            '<span>新增</span>' +
                        '</button>' +
                        '<div class="card-body pt-0 d-flex flex-wrap"></div>' +
                        '<div class="text-center my-3">' +
                            '<button type="button" class="btn btn-light btn-border all-confirm font-weight-bold">儲存設定</button>' +
                        '</div>' +
                    '</div>'
                );

                var $fieldCollapse = _this.$appsFieldsWapper.find('#' + fieldCollapseId);
                var $fieldTableBody = $fieldCollapse.find('.card-body');
                $fieldTableBody.sortable(); // 使 jquery ui 的 sortable 的功能作動，讓 table 內的項目可以被拖曳移動

                $fieldCollapse.find('.btn.add-field').on('click', function() {
                    _this.addFieldItem(appId, NEW_TAG_ID_PREFIX + Date.now(), {
                        text: '新客戶分類條件',
                        type: fieldEnums.type.CUSTOM
                    });
                });

                $fieldCollapse.find('.btn.all-confirm').on('click', function(ev) {
                    var $fieldRows = $fieldTableBody.find('.field-content');
                    var uiFields = {};

                    for (var i = 0; i < $fieldRows.length; i++) {
                        var $row = $($fieldRows[i]);
                        var data = {
                            text: $row.find('.field-name input').val(),
                            setsType: $row.find('.field-type select option:selected').val(),
                            order: i
                        };
                        var setsValue = 0;

                        switch (data.setsType) {
                            case fieldEnums.setsType.MULTI_SELECT:
                            case fieldEnums.setsType.CHECKBOX:
                            case fieldEnums.setsType.SELECT:
                                // 單選的資料將 textarea 中的文字依照換行符號切割成陣列
                                data.sets = $row.find('.field-sets .sets-item').val().split('\n');
                                break;
                            case fieldEnums.setsType.NUMBER:
                            case fieldEnums.setsType.DATE:
                                // 文字、數字及日期資料用陣列的長度來定義顯示單行或多行
                                setsValue = parseInt($row.find('.field-sets option:selected').val());
                                data.sets = setsValue ? [0, 0] : [0];
                                break;
                            case fieldEnums.setsType.TEXT:
                            default:
                                setsValue = parseInt($row.find('.field-sets option:selected').val());
                                data.sets = setsValue ? ['', ''] : [''];
                                break;
                        }

                        // 每一行的 td 客戶分類條件的 ID 都直接使用 fieldId 設定，因此用來設定對應的資料
                        uiFields[$row.attr('id')] = data;
                    }

                    for (var idx in _this.saveListeners) {
                        _this.saveListeners[idx](ev, {
                            appId: appId,
                            uiFields: uiFields
                        });
                    }
                });
            };

            /**
             * @param {string} appId
             * @param {string} fieldId
             * @param {*} field
             */
            FieldPanelCtrl.prototype.addFieldItem = function(appId, fieldId, field) {
                var _this = this;
                var fieldCollapseId = appId + '_collapse';
                var $fieldTableBody = this.$appsFieldsWapper.find('#' + fieldCollapseId + ' .card-body');

                var getSetsHtml = function(setsType, setsData) {
                    switch (setsType) {
                        case fieldEnums.setsType.SELECT:
                        case fieldEnums.setsType.MULTI_SELECT:
                            return (
                                '<textarea class= "sets-item form-control" rows="3" columns="10" style="resize: vertical" placeholder="以換行區隔資料">' +
                                    (function(sets) {
                                        var transStrs = [];
                                        for (var i in sets) {
                                            transStrs.push(transJson[sets[i]] ? transJson[sets[i]] : (sets[i] || ''));
                                        }
                                        return transStrs;
                                    })(setsData).join('\n') +
                                '</textarea>'
                            );
                        case fieldEnums.setsType.CHECKBOX:
                            return (
                                '<input type="text" class="sets-item form-control" value="無設定" disabled />'
                            );
                        case fieldEnums.setsType.TEXT:
                        case fieldEnums.setsType.DATE:
                        case fieldEnums.setsType.NUMBER:
                        default:
                            return (
                                '<select class="sets-item form-control">' +
                                    '<option value="0">單行</option>' +
                                    '<option value="1">段落</option>' +
                                '</select>'
                            );
                    }
                };

                // $fieldTableBody.append(
                //     '<tr class="field-content" id="' + fieldId + '">' +
                //         '<td class="field-name long-token">' +
                //             '<input class="form-control" type="text" value="' + (transJson[field.text] ? transJson[field.text] : (field.text || '')) + '" />' +
                //         '</td>' +
                //         '<td class="field-type">' +
                //             '<select class="form-control">' +
                //                 '<option value="' + fieldEnums.setsType.TEXT + '">文字</option>' +
                //                 '<option value="' + fieldEnums.setsType.NUMBER + '">數字</option>' +
                //                 '<option value="' + fieldEnums.setsType.DATE + '">時間</option>' +
                //                 '<option value="' + fieldEnums.setsType.SELECT + '">單項選擇</option>' +
                //                 '<option value="' + fieldEnums.setsType.MULTI_SELECT + '">多項選擇</option>' +
                //                 '<option value="' + fieldEnums.setsType.CHECKBOX + '">單項勾選</option>' +
                //             '</select>' +
                //         '</td>' +
                //         '<td class="field-sets">' +
                //             getSetsHtml(field.setsType, field.sets) +
                //         '</td>' +
                //         '<td class="field-delete">' +
                //             '<button type="button" class="btn btn-danger btn-sm btn-danger field-delete-btn' + (fieldEnums.type.SYSTEM === field.type ? ' d-none' : '') + '">' +
                //                 '<i class="fas fa-times"></i>&nbsp刪除' +
                //             '</button>' +
                //         '</td>' +
                //         '<td class="field-drag-icon">' +
                //             '<i class="fas fa-bars" style="color:#C0C0C0;"></i>' +
                //         '</td>' +
                //     '</tr>'
                // );

                $fieldTableBody.append(
                    '<div class="field-content col-12 flex-column flex-nowrap flex-lg-row flex-lg-wrap" id="' + fieldId + '">' +
                        '<div class="field-item field-name mb-1 col-lg-4">' +
                            '<input class="form-control" type="text" value="' + (transJson[field.text] ? transJson[field.text] : (field.text || '')) + '" />' +
                        '</div>' +
                        '<div class="field-item field-type my-1 col-lg-3">' +
                            '<select class="form-control">' +
                                '<option value="' + fieldEnums.setsType.TEXT + '">文字</option>' +
                                '<option value="' + fieldEnums.setsType.NUMBER + '">數字</option>' +
                                '<option value="' + fieldEnums.setsType.DATE + '">時間</option>' +
                                '<option value="' + fieldEnums.setsType.SELECT + '">單項選擇</option>' +
                                '<option value="' + fieldEnums.setsType.MULTI_SELECT + '">多項選擇</option>' +
                                '<option value="' + fieldEnums.setsType.CHECKBOX + '">單項勾選</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="field-item field-sets my-1 col-lg-5">' +
                            getSetsHtml(field.setsType, field.sets) +
                        '</div>' +
                        '<div class="field-item field-delete mt-auto mb-1 py-2 w-100 text-center">' +
                            '<button type="button" class="btn btn-danger btn-sm btn-danger field-delete-btn' + (fieldEnums.type.SYSTEM === field.type ? ' d-none' : '') + '">' +
                                '<i class="fas fa-times fa-fw"></i>' +
                                '<span>刪除</span>' +
                            '</button>' +
                        '</div>' +
                        '<div class="field-item field-drag-icon mt-1 w-100 text-center">' +
                            '<i class="fas fa-bars"></i>' +
                        '</div>' +
                    '</div>'
                );
                var $fieldRow = $fieldTableBody.find('#' + fieldId);
                var $fieldTypeSelect = $fieldRow.find('.field-type select');
                $fieldTypeSelect.find('option[value="' + field.setsType + '"]').prop('selected', true);

                if (field.type !== fieldEnums.type.CUSTOM) {
                    $fieldTypeSelect.prop('disabled', true);
                    $fieldRow.find('.field-name input').prop('disabled', true);
                    $fieldRow.find('.field-sets .sets-item').prop('disabled', true);
                }

                $fieldTypeSelect.on('change', function(ev) {
                    var $nextCol = $(ev.target.parentElement.nextElementSibling);
                    var selectedVal = ev.target.value;
                    $nextCol.html(getSetsHtml(selectedVal, ['']));
                });

                $fieldRow.find('.btn.field-delete-btn').on('click', function(ev) {
                    $(ev.target).parents('.field-content').remove();
                    for (var idx in _this.deleteListeners) {
                        _this.deleteListeners[idx]({
                            appId: appId,
                            fieldId: fieldId
                        });
                    }
                });
            };

            FieldPanelCtrl.prototype.onSave = function(handler) {
                var _this = this;
                _this.saveListeners.push(handler);
                return function() {
                    var idx = _this.saveListeners.indexOf(handler);
                    idx >= 0 && _this.saveListeners.length > 0 && _this.saveListeners.splice(idx, 1);
                };
            };

            FieldPanelCtrl.prototype.onDelete = function(handler) {
                var _this = this;
                _this.deleteListeners.push(handler);
                return function() {
                    var idx = _this.deleteListeners.indexOf(handler);
                    idx >= 0 && _this.deleteListeners.length > 0 && _this.deleteListeners.splice(idx, 1);
                };
            };

            return instance;
        })();

        // 設定頁面中 tab 切換時的事件監聽
        // 切換到客戶分類條件頁面時，再抓取客戶分類條件資料
        $('.nav-link[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
            if ('#fields' !== ev.target.hash) {
                // 非客戶分類條件頁面不處理
                return;
            }

            var firstAppId = '';
            fieldPanelCtrl.$appsFieldsWapper.empty();
            return Promise.all([
                api.apps.findAll(userId),
                api.appsFields.findAll(userId)
            ]).then(function(resJsons) {
                var apps = resJsons.shift().data;
                var appsFields = resJsons.shift().data;

                fieldPanelCtrl.saveListeners.length = 0;
                fieldPanelCtrl.deleteListeners.length = 0;

                for (var appId in apps) {
                    var app = apps[appId] || {};
                    if (CHATSHIER === app.type) {
                        continue;
                    }

                    var fields = appsFields[appId].fields || {};
                    fieldPanelCtrl.addAppItem(appId, app);
                    firstAppId = firstAppId || appId;

                    // 將客戶分類條件資料依照設定的 order 進行排序，根據順序擺放到 UI 上
                    var fieldIds = Object.keys(fields);
                    fieldIds.sort(function(a, b) {
                        return fields[a].order - fields[b].order;
                    });

                    for (var i in fieldIds) {
                        var fieldId = fieldIds[i];
                        var field = fields[fieldId];
                        if (field.isDeleted) {
                            delete fields[fieldId];
                            continue;
                        }
                        fieldPanelCtrl.addFieldItem(appId, fieldId, field);
                    }
                }

                // 監聽每行客戶分類條件的儲存事件，根據 UI 上資料的變更
                // 檢查哪些資料需要更新哪些資料需要新增
                fieldPanelCtrl.onSave(function(ev, args) {
                    $(ev.target).attr('disabled', true);
                    var fieldsOrg = appsFields[args.appId].fields;
                    var fieldIds = Object.keys(fieldsOrg);

                    /**
                     * 深層比對目標物件中的資料在來源物件中是否具有相同資料
                     */
                    var fieldHasChanged = function(srcField, destField) {
                        for (var key in destField) {
                            // 因為有翻譯文字的關係
                            // 非自定義客戶分類條件的名稱與系統性別的設定不檢查
                            if (('text' === key && fieldEnums.type.CUSTOM !== srcField.type) ||
                                ('sets' === key && 'gender' === srcField.alias)) {
                                continue;
                            }

                            if (srcField[key] === destField[key]) {
                                continue;
                            }

                            if (!(srcField[key] instanceof Array && destField[key] instanceof Array)) {
                                return true;
                            } else if (srcField[key].length !== destField[key].length) {
                                return true;
                            }

                            for (var i in destField[key]) {
                                if (srcField[key][i] !== destField[key][i]) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };

                    return Promise.all(fieldIds.map(function(fieldId) {
                        var fieldOrg = fieldsOrg[fieldId];
                        var fieldOnUI = Object.assign({}, args.uiFields[fieldId]);
                        delete args.uiFields[fieldId]; // 確認完用的 UI 資料直接刪除，不需再處理

                        // 需對照 UI 上目前每個客戶分類條件的順序，更新至對應的客戶分類條件
                        if (!!fieldOnUI && fieldHasChanged(fieldOrg, fieldOnUI)) {
                            // 只允許自定義的欄位可進行資料變更動作
                            if (fieldOrg.type === fieldEnums.type.CUSTOM) {
                                fieldOrg.text = fieldOnUI.text;
                                fieldOrg.setsType = fieldOnUI.setsType;
                                fieldOrg.sets = fieldOnUI.sets;
                            }
                            fieldOrg.order = fieldOnUI.order;
                            return api.appsFields.update(args.appId, fieldId, userId, fieldOrg);
                        } else if (fieldOrg.isDeleted) {
                            return api.appsFields.remove(args.appId, fieldId, userId).then(function() {
                                delete appsFields[args.appId].fields[fieldId];
                            });
                        }
                        return Promise.resolve();
                    })).then(function() {
                        return Promise.all(Object.keys(args.uiFields).map(function(fieldId) {
                            // 將剩下的 id 檢查是否為新增的客戶分類條件
                            // 新增的客戶分類條件 id 前綴設定為 NEW_TAG_ID_PREFIX 變數
                            // 非新增的客戶分類條件資料不進行資料插入動作
                            if (fieldId.indexOf(NEW_TAG_ID_PREFIX) < 0) {
                                return Promise.resolve();
                            }

                            var fieldOnUI = args.uiFields[fieldId];
                            var newField = {
                                text: fieldOnUI.text,
                                type: fieldEnums.type.CUSTOM,
                                sets: fieldOnUI.sets,
                                setsType: fieldOnUI.setsType,
                                order: fieldOnUI.order
                            };
                            return api.appsFields.insert(args.appId, userId, newField).then(function(resJson) {
                                // 完成資料庫儲存後，將暫時使用的 fieldId 替換成真正資料庫的 fieldId
                                var insertFields = resJson.data;
                                var newFieldId = Object.keys(insertFields[args.appId].fields).shift();
                                appsFields[args.appId].fields[newFieldId] = insertFields[args.appId].fields[newFieldId];
                                $('#' + fieldId + '.field-content').attr('id', newFieldId);
                            });
                        }));
                    }).then(function() {
                        // 客戶分類條件資料處理完成後顯示訊息在 UI 上
                        $.notify('客戶分類條件更新成功', { type: 'success' });
                        $(ev.target).removeAttr('disabled');
                    });
                });

                // 監聽每行客戶分類條件的刪除事件，刪除時在原始資料上標記刪除
                fieldPanelCtrl.onDelete(function(ev) {
                    var field = appsFields[ev.appId].fields[ev.fieldId];
                    if (!field) {
                        return;
                    }
                    field.isDeleted = true;
                });

                // 所有資料載入完後展開第一個 collapse
                fieldPanelCtrl.toggleItem(firstAppId);
            });
        });
    })();
    // #endregion
    // ===============

    // ===============
    // #region 內部群組代碼區塊
    (function() {
        var api = window.restfulAPI;
        var memberTypes = api.groupsMembers.enums.type;
        var groups = {};
        var userGroupMembers = {};
        var searchCache = {};
        var keyinWaitTimer = null;

        var $groupAddModal = $('#groupAddModal');
        var $groupAddSubmit = $groupAddModal.find('#groupAddSubmit');
        var $internalGroupPanel = $('#internal-group');
        var $groupBody = $internalGroupPanel.find('.card-body');
        var $groupElems = {};

        $groupAddModal.on('show.bs.modal', function() {
            // 新增群組 modal 顯示時，清空上一次輸入的名稱
            $groupAddModal.find('input[name="groupAddName"]').val('');
        });

        var groupCtrl = (function() {
            function GroupPanelCtrl() {}

            GroupPanelCtrl.prototype.clearAll = function() {
                groups = {};
                $groupElems = {};
                $groupBody.empty();
            };

            GroupPanelCtrl.prototype.showCollapse = function(groupId) {
                instance.hideCollapseAll(groupId);
                $groupElems[groupId].$collapse.collapse('show');
            };

            GroupPanelCtrl.prototype.hideCollapseAll = function(excludeId) {
                for (var groupId in $groupElems) {
                    if (excludeId && excludeId === groupId) {
                        continue;
                    }
                    $groupElems[groupId].$collapse.collapse('hide');
                }
            };

            GroupPanelCtrl.prototype.generateGroupHtml = function(groupId, groupName, member) {
                var html =
                    '<div group-id="' + groupId + '" class="group-tab" role="tab">' +
                        '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '" aria-expanded="true" aria-controls="' + groupId + '">' +
                            (groupName || '') +
                        '</a>' +
                    '</div>' +
                    '<div id="' + groupId + '" class="chsr-group card-collapse collapse">' +
                        '<div class="px-3 py-2 ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'd-none') + '">' +
                            '<label for="group_name" class="col-form-label">群組名稱: </label>' +
                            '<div class="input-container">' +
                                '<div class="input-group group-name" id="group_name">' +
                                    '<input class="group-name-input form-control" type="text" value="' + groupName + '" placeholder="我的群組" />' +
                                    '<span class="input-group-btn btn-update">' +
                                        '<button class="btn btn-primary">更新</button>' +
                                    '</span>' +
                                // '<span class="input-group-btn btn-delete">' +
                                //     '<button class="btn btn-danger">刪除群組</button>' +
                                // '</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        // '<div class="px-3 py-2">' +
                        //     '<label for="group_photo" class="col-form-label">群組圖片 (URL): </label>' +
                        //     '<div class="input-container">' +
                        //         '<div class="input-group file-container" id="group_photo">' +
                        //             '<span class="input-group-btn">' +
                        //                 '<button class="btn btn-light btn-border file-choose">' +
                        //                     '<i class="fa fa-upload"></i>' +
                        //                 '</button>' +
                        //             '</span>' +
                        //             '<input type="file" class="file-ghost" accept=".png,.jpg,.jpeg,.bmp">' +
                        //             '<p type="input" class="form-control file-text" data-placeholder="選擇一張圖片..."></p>' +
                        //             '<span class="input-group-btn">' +
                        //                 '<img src="image/favicon/favicon.ico" class="img-preview" />' +
                        //             '</span>' +
                        //             '<span class="input-group-btn btn-update">' +
                        //                 '<button class="btn btn-primary">更新</button>' +
                        //             '</span>' +
                        //         '</div>' +
                        //     '</div>' +
                        // '</div>' +

                        '<div class="px-3 py-2 d-flex user-invite">' +
                            '<div class="w-100 position-relative input-container ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'd-none') + '">' +
                                '<input type="email" class="text user-email form-control typeahead" data-provide="typeahead" placeholder="Email 地址" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" autofocus="false" />' +
                            '</div>' +
                            '<div class="ml-2 permission">' +
                                '<div class="input-group text-right">' +
                                    '<div class="input-group-btn">' +
                                        '<button class="btn btn-light btn-block btn-border outline dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                                            '<span class="permission-text">權限</span>' +
                                        '</button>' +
                                        '<div class="dropdown-menu dropdown-menu-right ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'd-none') + '">' +
                                            '<a class="dropdown-item" role="button">READ</a>' +
                                            '<a class="dropdown-item" role="button">WRITE</a>' +
                                            '<a class="dropdown-item" role="button">ADMIN</a>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="ml-auto actions">' +
                                '<div class="text-right ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'd-none') + '">' +
                                    '<button class="btn btn-light btn-block btn-border outline add-button">' +
                                        '<span>邀請</span>' +
                                        '<i class="fas fa-user-plus"></i>' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="d-flex flex-wrap justify-content-center">' +
                            '<div class="w-100 px-2 py-3 row member-list"></div>' +
                        '</div>' +
                    '</div>';
                return html;
            };

            GroupPanelCtrl.prototype.generateMemberHtml = function(memberId, memberUser, member, memberSelf) {
                // 只有群組成員本人可以確認是否加入群組
                var canJoin = member.user_id === userId && !member.status;

                // 群組擁有者及管理員可以踢掉群組成員
                // 群組成員可以自行離開群組
                // 群組擁有者不能離開群組
                var canDelete =
                    (memberTypes.OWNER === memberSelf.type ||
                    memberTypes.ADMIN === memberSelf.type ||
                    member.user_id === userId) &&
                    memberTypes.OWNER !== member.type;

                var html =
                    '<div class="col-12 m-2 card justify-content-around group-member" member-id="' + memberId + '">' +
                        '<div class="d-flex flex-nowrap align-items-center w-100 user chips">' +
                            '<div class="avatar-container">' +
                                '<img class="member-avatar" src="/image/avatar-default.png" alt="Member avatar" />' +
                            '</div>' +
                            '<span class="avatar-name">' + (memberUser.name || memberUser.name || '') + '</span>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center permission-group">' +
                            '<div class="mr-3 text-left">權限:</div>' +
                            '<div class="permission-item text-center' + (memberTypes.READ === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">R</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (memberTypes.WRITE === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">W</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (memberTypes.ADMIN === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">A</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (memberTypes.OWNER === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">O</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center status">' +
                            '<div class="mr-3 text-left">狀態:</div>' +
                            '<div class="status-item text-left">' +
                                '<span class="active ' + (!member.status ? 'd-none' : '') + '">' + ACTIVE + '</span>' +
                                '<span class="inactive ' + (member.status ? 'd-none' : '') + '">' + INACTIVE + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center actions">' +
                            '<div class="mr-3 text-left">操作:</div>' +
                            '<div class="action-container text-left">' +
                                '<a role="button" class="btn-join' + (!canJoin ? ' d-none' : '') + '">' +
                                    '<span class="chsr-icon">' +
                                        '<i class="fas fa-2x fa-plus-circle action-icon"></i>' +
                                    '</span>' +
                                '</a>' +
                                '<a role="button" class="btn-remove' + (!canDelete ? ' d-none' : '') + '">' +
                                    '<span class="chsr-icon">' +
                                        '<i class="fas fa-2x fa-trash-alt action-icon"></i>' +
                                    '</span>' +
                                '</a>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                return html;
            };

            GroupPanelCtrl.prototype.addGroup = function(groupId, group) {
                instance.hideCollapseAll(groupId);
                var members = group.members;
                var userIds = Object.keys(members).map((memberId) => {
                    if (!members[memberId].isDeleted) {
                        return members[memberId].user_id;
                    };
                });
                var index = userIds.indexOf(userId);
                if (0 > index) {
                    // return;
                };

                var memberSelf = members[Object.keys(members)[index]];
                $groupBody.append(instance.generateGroupHtml(groupId, group.name, memberSelf));

                // #region 每個群組相關事件宣告
                // 將群組中經常取用的 element 一次抓取出來，方便存取
                var $collapse = $groupBody.find('.card-collapse#' + groupId);
                $groupElems[groupId] = {
                    $collapse: $collapse,
                    $groupName: $groupBody.find('.group-name'),

                    $fileGhost: $collapse.find('.file-container input.file-ghost'),
                    $fileName: $collapse.find('.file-container .file-text'),
                    $imgPreview: $collapse.find('.file-container .img-preview'),

                    $memberEmail: $collapse.find('.user-email'),
                    $memberList: $collapse.find('.member-list'),
                    $permissionText: $collapse.find('.permission .permission-text')
                };

                // 群組展開時將其他群組收縮起來
                $collapse.on('show.bs.collapse', function(e) {
                    instance.hideCollapseAll(e.target.id);
                });

                // 使用者更新群組名稱的事件處理
                $collapse.on('click', '.group-name .btn-update', function() {
                    var groupData = {
                        name: $(this).parent().find('input').val()
                    };

                    if (groups[groupId].name === groupData.name) {
                        return;
                    }

                    var $updateButton = $(this);
                    $updateButton.attr('disabled', true);

                    return api.groups.update(groupId, userId, groupData).then(function() {
                        groups[groupId].name = groupData.name;
                        $collapse.parent().find('.group-tab .group-name[aria-controls="' + groupId + '"]').text(groupData.name);
                        $.notify('群組名稱更新成功！', { type: 'success' });
                    }).catch(function() {
                        $.notify('群組名稱更新失敗！', { type: 'danger' });
                    }).then(function() {
                        $updateButton.removeAttr('disabled');
                    });
                });

                // 使用者刪除群組的事件處理
                $collapse.on('click', '.group-name .btn-delete', function() {
                    if (!confirm('確定刪除此群組嗎？')) {
                        return;
                    }

                    return api.groups.remove(groupId, userId).then(function() {
                        $collapse.parent().find('.group-tab').remove();
                        $collapse.remove();
                        delete groups[groupId];
                    });
                });

                // 使用者更新群組頭像的事件處理
                $collapse.on('click', '.file-container .btn-update', function() {
                    var groupData = {
                        photo: $groupElems[groupId].groupImgBase64 || ''
                    };

                    if (!groupData.photo) {
                        $.notify('沒有選擇上傳的圖像', { type: 'warning' });
                        return;
                    }
                    return api.groups.update(groupId, userId, groupData).then(function() {
                        groups[groupId].photo = groupData.photo;
                        delete $groupElems[groupId].groupImgBase64;
                        $.notify('群組圖像上傳成功！', { type: 'success' });
                    });
                });

                // 使用者選擇新增成員的權限
                $collapse.on('click', '.permission .dropdown-menu a', function() {
                    $groupElems[groupId].$permissionText.text($(this).text());
                });

                $collapse.on('click', '.actions .add-button', function() {
                    var memberEmail = $groupElems[groupId].$memberEmail.val();
                    var permission = $groupElems[groupId].$permissionText.text();
                    if (!memberEmail) {
                        $.notify('請輸入目標成員的 Email', { type: 'warning' });
                        return;
                    } else if (!memberTypes[permission]) {
                        $.notify('請選擇目標成員的權限', { type: 'warning' });
                        return;
                    }

                    var $addButton = $(this);
                    $addButton.attr('disabled', true);

                    return api.users.find(userId, memberEmail).then(function(resJson) {
                        var memberUserId = Object.keys(resJson.data).shift();
                        var postMemberData = {
                            type: memberTypes[permission],
                            userid: memberUserId
                        };

                        // 成功更新群組成員後，將新成員的資料合併至本地端的群組資料
                        // 並且清除新增成員的 email 欄位
                        return api.groupsMembers.insert(groupId, userId, postMemberData).then(function(resJson) {
                            var groupMembersData = resJson.data[groupId].members;
                            var groupMemberId = Object.keys(groupMembersData).shift();
                            groups[groupId].members = Object.assign(groups[groupId].members, groupMembersData);
                            return {
                                groupMemberId: groupMemberId,
                                groupMembersData: groupMembersData[groupMemberId]
                            };
                        });
                    }).then(function(insertData) {
                        return api.users.find(userId).then(function(resJson) {
                            userGroupMembers = resJson.data || {};
                            instance.addMemberToList(groupId, insertData.groupMemberId, insertData.groupMembersData, memberSelf);

                            $groupElems[groupId].$memberEmail.val('');
                            $groupElems[groupId].$permissionText.text('權限');
                            $.notify('群組成員新增成功', { type: 'success' });
                        });
                    }).catch(function() {
                        $.notify('群組成員新增失敗', { type: 'danger' });
                    }).then(function() {
                        $addButton.removeAttr('disabled');
                    });
                });

                // 點擊檔案上傳觸發隱藏起來的 html5 的 input file
                $collapse.on('click', '.file-container .file-choose', function() {
                    $groupElems[groupId].$fileGhost.click();
                });

                // 選擇圖檔後，將圖像資源載入成 base64 的資料型態
                $groupElems[groupId].$fileGhost.on('change', function() {
                    var files = this.files;
                    if (files.length) {
                        $groupElems[groupId].$fileName.text(($(this).val()).split('\\').pop());

                        var file = files[0];
                        return new Promise(function(resolve, reject) {
                            var fileReader = new FileReader();
                            fileReader.onload = function() {
                                resolve(fileReader.result);
                            };
                            fileReader.readAsDataURL(file);
                        }).then(function(imgBase64) {
                            $groupElems[groupId].groupImgBase64 = imgBase64;
                            $groupElems[groupId].$imgPreview.prop('src', imgBase64);
                        });
                    }
                });

                $groupElems[groupId].$memberEmail.typeahead({
                    minLength: 2,
                    fitToElement: true,
                    showHintOnFocus: false,
                    items: 5,
                    source: [],
                    autoSelect: false,
                    matcher: function() {
                        // 總是回傳 ture 代表無視 keyin 內容
                        // typeahead 清單資料以 api 回傳的清單為主
                        return true;
                    },
                    updater: function(item) {
                        // 選擇項目後，將 email 的部分設於 input value
                        return { name: item.email };
                    },
                    displayText: function(item) {
                        // 項目顯示樣式為 [username - example@example.com]
                        return item.name + (item.email ? ' - ' + item.email : '');
                    }
                });

                $groupElems[groupId].$memberEmail.on('keyup', function(ev) {
                    keyinWaitTimer && window.clearTimeout(keyinWaitTimer);
                    if (ev.target.value < 2) {
                        return;
                    }

                    var emailPattern = ev.target.value;
                    keyinWaitTimer = window.setTimeout(function() {
                        return Promise.resolve().then(function() {
                            if (searchCache[emailPattern]) {
                                return searchCache[emailPattern];
                            }

                            return api.users.find(userId, emailPattern, true).then(function(resJson) {
                                let users = resJson.data || {};
                                let userIds = Object.keys(resJson.data);
                                return userIds.map(function(userId) {
                                    return users[userId];
                                });
                            });
                        }).then(function(searchResults) {
                            // 將搜尋到的結果存到快取中，相同的搜尋字不需再搜尋兩次
                            searchCache[emailPattern] = searchResults;

                            var typeaheadData = $(ev.target).data('typeahead');
                            typeaheadData.setSource(searchResults);
                            typeaheadData.lookup();
                        });
                    }, 500); // 使用者停止 keyin 500ms 後在確定發送搜尋 api
                });
                // #endregion

                // 將群組內的成員資料載入至畫面上
                for (var memberId in group.members) {
                    instance.addMemberToList(groupId, memberId, group.members[memberId], memberSelf);
                }
            };

            GroupPanelCtrl.prototype.addMemberToList = function(groupId, memberId, member, memberSelf) {
                var memberUser = userGroupMembers[member.user_id];
                if (!memberUser) {
                    return;
                };

                var memberItemHtml = instance.generateMemberHtml(memberId, memberUser, member, memberSelf);
                $groupElems[groupId].$memberList.append(memberItemHtml);

                var $memberRow = $groupElems[groupId].$memberList.find('[member-id="' + memberId + '"]');
                var $memberPermission = $memberRow.find('.permission-item');
                var $memberStatus = $memberRow.find('.status');
                var $memberActions = $memberRow.find('.actions');

                // 使用者點擊群組內的事件處理
                $memberPermission.on('click', function() {
                    var $permissionItem = $(this);
                    var $permissionText = $permissionItem.find('.permission-text');
                    var wantPermission = {
                        'R': memberTypes.READ,
                        'W': memberTypes.WRITE,
                        'A': memberTypes.ADMIN,
                        'O': memberTypes.OWNER
                    }[$permissionText.text()];

                    if (wantPermission === groups[groupId].members[memberId].type) {
                        // 想變更的權限與目前的權限一樣，無需執行更新
                        return;
                    } else if (memberTypes.OWNER === groups[groupId].members[memberId].type) {
                        $.notify('群組擁有者無法變更權限', { type: 'warning' });
                        return;
                    } else if (wantPermission === memberTypes.OWNER) {
                        $.notify('權限無法變更為群組擁有者', { type: 'warning' });
                        return;
                    }

                    var putMemberData = { type: wantPermission };
                    return api.groupsMembers.update(groupId, memberId, userId, putMemberData).then(function() {
                        // 成功更新後更新本地端的資料
                        groups[groupId].members[memberId].type = putMemberData.type;
                        $permissionItem.addClass('btn-primary').siblings().removeClass('btn-primary');
                    }).catch((resJson) => {
                        if ('3.11' === resJson.code) {
                            $.notify('權限不足，無法更新成員權限', { type: 'danger' });
                            return;
                        }
                        $.notify('更新成員權限失敗', { type: 'danger' });
                    });
                });

                $memberActions.on('click', '.btn-join', function() {
                    var putMemberData = { status: true };
                    var $self = $(this);
                    return api.groupsMembers.update(groupId, memberId, userId, putMemberData).then(function() {
                        // 更新 API，加入群組
                        groups[groupId].members[memberId].status = putMemberData.status;
                        $memberStatus.find('.active').removeClass('d-none');
                        $memberStatus.find('.inactive').addClass('d-none');
                        $self.remove();
                        $.notify('您已加入群組', { type: 'success' });
                    });
                });

                $memberActions.on('click', '.btn-remove', function() {
                    let member = groups[groupId].members[memberId];
                    let memberUserId = member.user_id;

                    if (memberTypes.OWNER === member.type) {
                        $.notify('群組擁有者無法刪除', { type: 'warning' });
                        return;
                    } else if (!confirm('確定刪除此成員嗎？')) {
                        return;
                    }

                    return api.groupsMembers.remove(groupId, memberId, userId).then(function() {
                        // 成功更新後刪除本地端的資料
                        $memberRow.remove();
                        delete groups[groupId].members[memberId];

                        // 如果是群組成員自行離開群組，離開後開除整個群組資料
                        if (memberUserId === userId) {
                            $groupBody.find('.group-tab[group-id="' + groupId + '"]').remove();
                            $groupBody.find('.card-collapse#' + groupId).remove();
                            delete groups[groupId];
                        }
                    });
                });
            };

            var instance = new GroupPanelCtrl();
            return instance;
        })();

        $('.nav-link[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
            if ('#internal-group' !== ev.target.hash) {
                // 非內部群組頁面不處理
                $groupAddSubmit.off('click').on('click', insertOneGroup);
                return;
            }

            $groupAddSubmit.off('click').on('click', function() {
                var $groupNameElem = $groupAddModal.find('input[name="groupAddName"]');
                var groupName = $groupNameElem.val();
                if (!groupName) {
                    return;
                }

                var group = {
                    name: groupName
                };

                return api.groups.insert(userId, group).then(function(resJson) {
                    var groupId = Object.keys(resJson.data).shift();
                    groups[groupId] = resJson.data[groupId];
                    groupCtrl.addGroup(groupId, groups[groupId]);
                    groupCtrl.showCollapse(groupId);
                    $groupNameElem.val('');
                    $groupAddModal.modal('hide');
                });
            });

            groupCtrl.clearAll();
            return Promise.all([
                api.groups.findAll(userId),
                api.users.find(userId)
            ]).then(function(resJsons) {
                groups = resJsons[0].data || {};
                userGroupMembers = resJsons[1].data || {};
                var firstGroupId = '';
                for (var groupId in groups) {
                    firstGroupId = firstGroupId || groupId;
                    var groupData = groups[groupId];
                    if (groupData.isDeleted) {
                        continue;
                    }
                    groupCtrl.addGroup(groupId, groupData);
                }
                firstGroupId && groupCtrl.showCollapse(firstGroupId);
            });
        });
    })();
    // #endregion
    // ===============

    var $appModal = $('#setting-modal .modal-body');

    function findAllGroups() {
        return api.groups.findAll(userId).then(function(resJson) {
            let groups = resJson.data;
            if (groups && 0 === Object.keys(groups).length) {
                $('#addGroupNameAppBtn').attr('disabled', false);
                return;
            };

            for (let groupId in groups) {
                if (groups[groupId].isDeleted) {
                    continue;
                }
                loadGroups(groups[groupId], groupId);
            }
            $('#addGroupNameAppBtn').attr('disabled', false);
        });
    }

    function insertOneGroup() {
        let name = $('input[name="groupAddName"]').val();
        let groupName = { name };
        return api.groups.insert(userId, groupName).then(function(resJson) {
            let groups = resJson.data;
            $('#groupAddModal').modal('hide');
            for (let groupId in groups) {
                loadGroups(groups[groupId], groupId);
            }
        });
    }

    function findAllApps() {
        return api.apps.findAll(userId).then(function(resJson) {
            let apps = resJson.data;

            for (let appId in apps) {
                if (apps[appId].isDeleted || CHATSHIER === apps[appId].type) {
                    continue;
                }
                groupType(appId, apps[appId]);
            }
            $('.chsr.nav-pills .nav-link:first-child').tab('show');
            $('#add-new-btn').attr('disabled', false);
        });
    }

    function findOneApp(appId) {
        return api.apps.findOne(appId, userId).then(function(resJson) {
            let apps = resJson.data;
            formModalBody(appId, apps[appId]);
        });
    }

    function insertType(type, groupId) {
        let app = {
            type: type,
            groupid: groupId
        };

        switch (type) {
            case LINE:
                let lineName = $('#line-name').val();
                let lineId = $('#channel-id').val();
                let lineSecret = $('#channel-secret').val();
                let lineToken = $('#channel-token').val();
                app.name = lineName;
                app.id1 = lineId;
                app.secret = lineSecret;
                app.token1 = lineToken;
                break;
            case FACEBOOK:
                let fbName = $('#facebook-name').val();
                let fbPageId = $('#facebook-page-id').val();
                let fbAppId = $('#facebook-app-id').val();
                let fbSecret = $('#facebook-app-secret').val();
                let fbValidToken = $('#facebook-valid-token').val();
                let fbPageToken = $('#facebook-page-token').val();
                app.name = fbName;
                app.id1 = fbPageId;
                app.id2 = fbAppId;
                app.secret = fbSecret;
                app.token1 = fbValidToken;
                app.token2 = fbPageToken;
                break;
            case WECHAT:
                let $wechatForm = $('#wechat-form');
                let wechatName = $wechatForm.find('#wechat-name').val();
                let wechatId = $wechatForm.find('#channel-id').val();
                let wechatSecret = $wechatForm.find('#channel-secret').val();
                app.name = wechatName;
                app.id1 = wechatId;
                app.secret = wechatSecret;
                break;
            default:
                break;
        }
        return app;
    }

    function insertOneApp(app) {
        return api.apps.insert(userId, app).then(function(resJson) {
            $('#setting-modal').modal('hide');
            clearAppModalBody();

            var str = (
                '<tr class="d-none">' +
                    '<td>ID:</td>' +
                    '<td id="prof-id"></td>' +
                '</tr>'
            );
            $('#app-group').html(str);

            $.notify('新增成功!', { type: 'success' });
            let apps = resJson.data;
            for (let appId in apps) {
                groupType(appId, apps[appId]);
            }
        }).catch((resJson) => {
            if (!resJson.status) {
                $('#setting-modal').modal('hide');
                clearAppModalBody();
                $.notify('失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $('#setting-modal').modal('hide');
                clearAppModalBody();
                $.notify('無此權限', { type: 'danger' });
            }
        });
    }

    function updateOneApp(appId, appData) {
        return api.apps.update(appId, userId, appData).then(function(resJson) {
            $('#setting-modal').modal('hide');
            clearAppModalBody();

            var str = '<tr class="d-none"><td>ID: </td><td id="prof-id"></td></tr>';
            $('#app-group').html(str);

            $.notify('修改成功!', { type: 'success' });
            var apps = resJson.data;
            var app = apps[appId];

            switch (app.type) {
                case LINE:
                    $('[app-id="' + appId + '"] #prof-name1').html(app.name);
                    $('[app-id="' + appId + '"] #prof-channelId_1').html(app.id1);
                    $('[app-id="' + appId + '"] #prof-channelSecret_1').html(app.secret);
                    $('[app-id="' + appId + '"] #prof-channelAccessToken_1').html(app.token1);
                    break;
                case FACEBOOK:
                    $('[app-id="' + appId + '"] #prof-fbPageName').html(app.name);
                    $('[app-id="' + appId + '"] #prof-fbPageId').html(app.id1);
                    $('[app-id="' + appId + '"] #prof-fbAppId').html(app.id2);
                    $('[app-id="' + appId + '"] #prof-fbAppSecret').html(app.secret);
                    $('[app-id="' + appId + '"] #prof-fbValidToken').html(app.token1);
                    $('[app-id="' + appId + '"] #prof-fbPageToken').html(app.token2);
                    break;
                case WECHAT:
                    $('[app-id="' + appId + '"] #prof-wechat-app-name').html(app.name);
                    $('[app-id="' + appId + '"] #prof-wechat-app-id').html(app.id1);
                    $('[app-id="' + appId + '"] #prof-wechat-app-secret').html(app.secret);
                    break;
                default:
                    break;
            };
        }).catch((resJson) => {
            if (!resJson.status) {
                $('#setting-modal').modal('hide');
                clearAppModalBody();
                $.notify('失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $('#setting-modal').modal('hide');
                clearAppModalBody();
                $.notify('無此權限', { type: 'danger' });
            }
        });
    }

    function removeOneApp(appId) {
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            return api.apps.remove(appId, userId).then(function(resJson) { // 強烈建議這裡也放resJson這樣才可以清空table，table的id會掛group id不然會出現重複資料
                let str = '<tr class="d-none"><td>ID: </td><td id="prof-id"></td></tr>';
                $('#app-group').html(str);
                $.notify('成功刪除!', { type: 'success' });
                var apps = resJson.data;
                var app = apps[appId];

                switch (app.type) {
                    case LINE:
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        break;
                    case FACEBOOK:
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        break;
                    case WECHAT:
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        $('[app-id="' + appId + '"]').remove();
                        break;
                    default:
                        break;
                };
            }).catch((resJson) => {
                if (!resJson.status) {
                    $.notify('失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                }
            });
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            var isOK = false;
            var $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }

    /**
     * 群組資料從ajax載入後把群組視覺化
     * @param {any} group
     * @param {string} groupId
     */
    function loadGroups(group, groupId) {
        let groupStr =
            '<div class="group-tab" role="tab">' +
                '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '-group" aria-expanded="true" aria-controls="' + groupId + '-group">' +
                    (group.name || '') +
                '</a>' +
            '</div>' +
            '<div id="' + groupId + '-group" class="card-collapse collapse">' +
                '<div class="app-table-space">' +
                    '<button type="button" class="btn btn-light btn-border mt-2 mb-3" id="add-new-btn" rel="' + groupId + '" data-toggle="modal" data-target="#setting-modal">' +
                        '<i class="fas fa-plus fa-fw"></i>新增聊天機器人' +
                    '</button>' +
                    '<table class="table chsr-group chsr-table">' +
                        '<tbody id="' + groupId + '-body"></tbody>' +
                    '</table>' +
                '</div>' +
            '</div>';
        $('#apps .app-container').append(groupStr);
    }

    function groupType(appId, app) {
        var baseWebhookUrl = urlConfig.webhookUrl;
        var appStr;

        switch (app.type) {
            case LINE:
                appStr =
                    '<tr class="active" app-id="' + appId + '">' +
                        '<th>LINE</th>' +
                        '<th class="text-right">' +
                            '<div id="group1" class="line">' +
                                '<button type="button" class="btn btn-danger m-2" id="del" rel="' + appId + '">' +
                                    '<i class="fas fa-trash-alt fa-fw"></i>' +
                                    '<span>刪除</span>' +
                                '</button>' +
                                '<button type="button" class="btn btn-border m-2" rel="' + appId + '" id="edit" data-toggle="modal" data-target="#setting-modal">' +
                                    '<i class="fas fa-edit fa-fw"></i>' +
                                    '<span>編輯</span>' +
                                '</button>' +
                            '</div>' +
                        '</th>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">機器人名稱:</td>' +
                        '<td class="long-token" id="prof-name1">' + app.name + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Channel ID:</td>' +
                        '<td class="long-token" id="prof-channelId_1">' + app.id1 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Channel Secret:</td>' +
                        '<td class="long-token" id="prof-channelSecret_1">' + app.secret + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Channel Access Token:</td>' +
                        '<td class="long-token" id="prof-channelAccessToken_1">' + app.token1 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Webhook URL:</td>' +
                        '<td class="long-token">' +
                            '<span id="prof-webhookUrl-1">' + createWebhookUrl(baseWebhookUrl, app.webhook_id) + '</span>' +
                        '</td>' +
                    '</tr>';
                break;
            case FACEBOOK:
                appStr =
                    '<tr class="active" app-id="' + appId + '">' +
                        '<th>Facebook</th>' +
                        '<th class="text-right">' +
                            '<div id="group3" class="fb">' +
                                '<button class="btn btn-danger m-2" id="del" rel="' + appId + '">' +
                                    '<i class="fas fa-trash-alt fa-fw"></i>' +
                                    '<span>刪除</span>' +
                                '</button>' +
                                '<button type="button" class="btn btn-border m-2" rel="' + appId + '" id="edit" data-toggle="modal" data-target="#setting-modal">' +
                                    '<i class="fas fa-edit fa-fw"></i>' +
                                    '<span>編輯</span>' +
                                '</button>' +
                            '</div>' +
                        '</th>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">機器人名稱:</td>' +
                        '<td class="long-token" id="prof-fbPageName">' + app.name + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">粉絲頁 ID:</td>' +
                        '<td class="long-token" id="prof-fbPageId">' + app.id1 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">App ID:</td>' +
                        '<td class="long-token" id="prof-fbAppId">' + app.id2 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">App Secret:</td>' +
                        '<td class="long-token" id="prof-fbAppSecret">' + app.secret + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Validation Token: </td>' +
                        '<td class="long-token" id="prof-fbValidToken">' + app.token1 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Page Access Token:</td>' +
                        '<td class="long-token" id="prof-fbPageToken">' + app.token2 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Webhook URL:</td>' +
                        '<td class="long-token">' +
                            '<span id="prof-fbwebhookUrl">' + createWebhookUrl(baseWebhookUrl, app.webhook_id) + '</span>' +
                        '</td>' +
                    '</tr>';
                break;
            case WECHAT:
                appStr =
                    '<tr class="active" app-id="' + appId + '">' +
                        '<th>Wechat</th>' +
                        '<th class="text-right">' +
                            '<div id="group1" class="wechat">' +
                                '<button class="btn btn-danger m-2" id="del" rel="' + appId + '">' +
                                    '<i class="fas fa-trash-alt fa-fw"></i>' +
                                    '<span>刪除</span>' +
                                '</button>' +
                                '<button type="button" class="btn btn-border btn-light m-2" rel="' + appId + '" id="edit" data-toggle="modal" data-target="#setting-modal">' +
                                    '<i class="fas fa-edit fa-fw"></i>' +
                                    '<span>編輯</span>' +
                                '</button>' +
                            '</div>' +
                        '</th>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">機器人名稱:</td>' +
                        '<td class="long-token" id="prof-wechat-app-name">' + app.name + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">App ID:</td>' +
                        '<td class="long-token" id="prof-wechat-app-id">' + app.id1 + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">App Secret:</td>' +
                        '<td class="long-token" id="prof-wechat-app-secret">' + app.secret + '</td>' +
                    '</tr>' +
                    '<tr app-id="' + appId + '">' +
                        '<td class="font-weight-bold">Webhook URL:</td>' +
                        '<td class="long-token">' +
                            '<span id="prof-webhookUrl-1">' + createWebhookUrl(baseWebhookUrl, app.webhook_id) + '</span>' +
                        '</td>' +
                    '</tr>';
                break;
            default:
                break;
        }
        appStr && $('#' + app.group_id + '-body').append(appStr);
    }

    function formModalBody(id, app) {
        let appStr;
        switch (app.type) {
            case LINE:
                appStr =
                    '<form>' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                            '<span id="webhook-id">' + id + '</span>' +
                            '<span id="groupId">' + app.group_id + '</span>' +
                        '</div>' +
                        '<div id="prof-edit-line-1">' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.name + '" id="name" />' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="prof-edit-channelId_1" class="col-form-label font-weight-bold">Channel ID:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.id1 + '" id="channel-id"/>' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="prof-edit-channelSecret_1" class="col-form-label font-weight-bold">Channel Secret:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.secret + '" id="channel-secret"/>' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="prof-edit-channelAccessToken_1" class="col-form-label font-weight-bold">Channel Access Token:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.token1 + '" id="channel-token"/>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            case FACEBOOK:
                appStr =
                    '<form>' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                            '<span id="webhook-id">' + id + '</span>' +
                            '<span id="groupId">' + app.group_id + '</span>' +
                        '</div>' +
                        '<div id="prof-edit-fb">' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.name + '" id="facebook-name">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">Page ID:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.id1 + '" id="facebook-page-id">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">App ID:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.id2 + '" id="facebook-app-id">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">App Secret:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.secret + '" id="facebook-app-secret">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">Validation Token:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.token1 + '" id="facebook-valid-token">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">Page Token:</label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.token2 + '" id="facebook-page-token">' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            case WECHAT:
                appStr =
                    '<form>' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                            '<span id="webhook-id">' + id + '</span>' +
                            '<span id="groupId">' + app.group_id + '</span>' +
                        '</div>' +
                        '<div id="prof-edit-line-1">' +
                            '<div class="form-group">' +
                                '<label class="col-form-label font-weight-bold">App Name: </label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.name + '" id="wechat-app-name"/>' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="prof-edit-channelId_1" class="col-form-label font-weight-bold">App ID: </label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.id1 + '" id="wechat-app-id"/>' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="prof-edit-channelSecret_1" class="col-form-label font-weight-bold">App Secret: </label>' +
                                '<div class="input-container">' +
                                    '<input class="form-control" type="text" value="' + app.secret + '" id="wechat-app-secret"/>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            default:
                break;
        }
        appStr && $appModal.append(appStr);
    }

    function clearAppModalBody() {
        $appModal.empty();
    }

    function findUserProfile() {
        return api.users.find(userId).then(function(resJson) {
            var users = resJson.data;
            var user = users[userId];

            $('#prof-id').text(userId);
            $('.user-name .card-title').text(user.name);
            $('#prof-email').text(user.email);
            $('#prof-IDnumber').text(userId);
            $('#prof-company').text(user.company);
            $('#prof-phonenumber').text(user.phone);
            $('#prof-address').text(user.address);
        });
    }

    function updateUserProfile(user) {
        return api.users.update(userId, user).then(function() {
            $('#prof-company').text(user.company);
            $('#prof-phonenumber').text(user.phone);
            $('#prof-address').text(user.address);
        });
    }

    function profSubmitBasic() {
        let company = $('#company').val();
        let phone = $('#phone').val();
        let address = $('#location').val();
        let users = {
            company,
            phone,
            address
        };
        var phoneRule = /^09\d{8}$/;
        if (phone && !phone.match(phoneRule)) {
            $('#setting-modal').modal('hide');
            $.notify('手機格式錯誤，應為09XXXXXXXX', {type: 'danger'});
        } else {
            updateUserProfile(users);
            $('#setting-modal').modal('hide');
        }
    }

    function createWebhookUrl(baseWebhookUrl, webhookId) {
        let webhookUrl;
        baseWebhookUrl = baseWebhookUrl.replace(/^https?:\/\//, '');
        baseWebhookUrl = baseWebhookUrl.replace(/\/+$/, '');
        webhookUrl = 'https://' + baseWebhookUrl + '/' + webhookId;
        return webhookUrl;
    };
})();
