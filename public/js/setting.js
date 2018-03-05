/// <reference path='../../typings/client/index.d.ts' />

const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';
const CHATSHIER = 'CHATSHIER';
const ACTIVE = '啟用';
const INACTIVE = '未啟用';
const NO_PERMISSION_CODE = '3.16';
var userId = '';
var api = window.restfulAPI;
var transJson = {};

window.translate.ready.then(function(json) {
    transJson = json;
});

window.auth.ready.then(function(currentUser) {
    userId = currentUser.uid;

    // ACTIONS
    $('#setting-modal').on('hidden.bs.modal', function() {
        clearAppModalBody();
    });
    $(document).on('click', '#edit', function() {
        let appId = $(this).attr('rel');
        findOneApp(appId); // 點選編輯後根據appId列出指定的APP
    });
    $('#setting-modal-submit-btn').click(function(event) {
        event.preventDefault();
        let type = $(this).parent().parent().find('#type').text();
        let groupId;
        // insertNewApp, updateProfile, updateApp
        switch (type) {
            case 'insertNewApp':
                let type = $(this).parent().parent().find('#app-group-select option:selected').val();
                groupId = $('#groupId').text();
                insertType(type, groupId, (data) => {
                    insertOneApp(data);
                });
                break;
            case 'updateProfile':
                profSubmitBasic();
                break;
            case 'updateApp':
                let appId = $(this).parent().parent().find('#webhook-id').text();
                groupId = $(this).parent().parent().find('#groupId').text();

                if ($('#facebook-name').val() === undefined) {
                    let name = $('#name').val();
                    let id1 = $('#channel-id').val();
                    let secret = $('#channel-secret').val();
                    let token1 = $('#channel-token').val();
                    let type = LINE;
                    let updateObj = {
                        name: name,
                        id1: id1,
                        secret: secret,
                        token1: token1,
                        type: type
                    };
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                } else {
                    let name = $('#facebook-name').val();
                    let id1 = $('#facebook-page-id').val();
                    let id2 = $('#facebook-app-id').val();
                    let secret = $('#facebook-app-secret').val();
                    let token1 = $('#facebook-valid-token').val();
                    let token2 = $('#facebook-page-token').val();
                    let type = FACEBOOK;
                    let updateObj = {
                        name: name,
                        id1: id1,
                        id2: id2,
                        secret: secret,
                        token1: token1,
                        token2: token2,
                        type: type
                    };
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                }
                break;
        }
    });
    $(document).on('click', '#del', function() {
        let appId = $(this).attr('rel');
        removeOneApp(appId);
    });
    $(document).on('click', '#add-new-btn', function() {
        let groupId = $(this).attr('rel');
        let formStr =
            '<form>' +
            '<div id="type" hidden>insertNewApp</div>' +
            '<div id="groupId" hidden>' + groupId + '</div>' +
            '<br/>' +
            '<label class="col-2 col-form-label">新增群組: </label>' +
            '<select id="app-group-select" class="form-control">' +
            '<option value="LINE" selected>LINE</option>' +
            '<option value="FACEBOOK">臉書</option>' +
            '</select>' +
            '<br/>' +
            '<div id="line-form">' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">名稱: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="line-name"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-id"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Secret: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-secret"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Token: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-token"/>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div id="facebook-form" hidden>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Facebook粉絲頁名稱: </label>' +
            ' <div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-name">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Page ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-page-id">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">App ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-app-id">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">App Secret: </label>' +
            ' <div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-app-secret">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Validation Token: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-valid-token">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Page Token: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-page-token">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</form>';
        $appModal.append(formStr);
    });
    $(document).on('change', '#app-group-select', function() { // 切換模式 LINE或是臉書
        let type = $(this).find('option:selected').val();
        switch (type) {
            case LINE:
                $('#line-form').hide();
                $('#facebook-form').hide();
                $('#line-form').show();
                break;
            case FACEBOOK:
                $('#line-form').hide();
                $('#facebook-form').hide();
                $('#facebook-form').show();
                break;
        }
    });
    $('#profile').click(function() {
        let company = $('#prof-company').text();
        let phone = $('#prof-phonenumber').text();
        let location = $('#prof-address').text();
        let str =
            '<div id="line-form">' +
            '<div id="type" hidden>updateProfile</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">公司名稱: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + company + '" id="company"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">手機: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + phone + '" id="phone"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">地址: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + location + '" id="location"/>' +
            '</div>' +
            '</div>' +
            '</div>';
        $appModal.append(str);
    });
    $('#add_group_app_submit').click(insertOneGroup);

    findAllGroups();
    findAllApps(); // 列出所有設定的APPs
    findAuthUserProfile();
    findUserProfile();
});

// ===============
// #region 標籤 Tab 代碼區塊
(function() {
    var NEW_TAG_ID_PREFIX = 'temp_tag_id';
    var tagEnums = api.tag.enums;

    var tagPanelCtrl = (function() {
        var instance = new TagPanelCtrl();

        // 宣告用來處理整個標籤容器的控制類別
        function TagPanelCtrl() {
            this.saveListeners = [];
            this.deleteListeners = [];
            this.$tagPanel = $('.chsr-tags.panel-group .panel');
        }

        /**
         * @param {string} appId
         */
        TagPanelCtrl.prototype.toggleItem = function(appId) {
            var tagCollapseId = appId + '_collapse';
            this.$tagPanel.find('#' + tagCollapseId).collapse();
        };

        /**
         * @param {string} appId
         * @param {*} appData
         */
        TagPanelCtrl.prototype.addAppItem = function(appId, appData) {
            var _this = this;
            var tagCollapseId = appId + '_collapse';
            _this.$tagPanel.append(
                '<div class="panel-heading" role="tab" id="' + appId + '">' +
                    '<h4 class="panel-title">' +
                        '<a class="collapsed" role="button" data-toggle="collapse" data-parent="#apps_tags_wapper" href="#' + tagCollapseId + '" aria-expanded="true" aria-controls="' + tagCollapseId + '">' +
                            (appData.name || '') +
                        '</a>' +
                    '</h4>' +
                '</div>' +
                '<div id="' + tagCollapseId + '" class="panel-collapse collapse" role="tabpanel" aria-labelledby="' + appId + '">' +
                    '<div class="panel-body">' +
                        '<button type="button" class="btn btn-default add-tag">' +
                            '<span class="fa fa-plus fa-fw"></span>新增' +
                        '</button>' +
                        '<table class="table table-striped">' +
                            '<thead>' +
                                '<tr>' +
                                    '<th>欄位名稱</th>' +
                                    '<th>欄位類別</th>' +
                                    '<th>欄位設定</th>' +
                                    '<th>刪除</th>' +
                                    '<th></th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody></tbody>' +
                        '</table>' +
                        '<div class="align-center">' +
                            '<button type="button" class="btn btn-default all-confirm bold-word">儲存設定</button>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );

            var $tagCollapse = _this.$tagPanel.find('#' + tagCollapseId);
            var $tagTableBody = $tagCollapse.find('.panel-body table tbody');
            $tagTableBody.sortable(); // 使 jquery ui 的 sortable 的功能作動，讓 table 內的項目可以被拖曳移動

            $tagCollapse.find('.btn.add-tag').on('click', function() {
                _this.addTagItem(appId, NEW_TAG_ID_PREFIX + Date.now(), {
                    text: '新標籤',
                    type: tagEnums.type.CUSTOM
                });
            });

            $tagCollapse.find('.btn.all-confirm').on('click', function(ev) {
                var $tagRows = $tagTableBody.find('tr.tag-content');
                var uiTags = {};

                for (var i = 0; i < $tagRows.length; i++) {
                    var $row = $($tagRows[i]);
                    var data = {
                        text: $row.find('.tag-name input').val(),
                        setsType: $row.find('.tag-type select option:selected').val(),
                        order: i
                    };
                    var setsValue = 0;

                    switch (data.setsType) {
                        case tagEnums.setsType.MULTI_SELECT:
                        case tagEnums.setsType.CHECKBOX:
                        case tagEnums.setsType.SELECT:
                            // 單選的資料將 textarea 中的文字依照換行符號切割成陣列
                            data.sets = $row.find('.tag-sets .sets-item').val().split('\n');
                            break;
                        case tagEnums.setsType.NUMBER:
                        case tagEnums.setsType.DATE:
                            // 文字、數字及日期資料用陣列的長度來定義顯示單行或多行
                            setsValue = parseInt($row.find('.tag-sets option:selected').val());
                            data.sets = setsValue ? [0, 0] : [0];
                            break;
                        case tagEnums.setsType.TEXT:
                        default:
                            setsValue = parseInt($row.find('.tag-sets option:selected').val());
                            data.sets = setsValue ? ['', ''] : [''];
                            break;
                    }

                    // 每一行的 td 標籤的 ID 都直接使用 tagId 設定，因此用來設定對應的資料
                    uiTags[$row.attr('id')] = data;
                }

                for (var idx in _this.saveListeners) {
                    _this.saveListeners[idx](ev, {
                        appId: appId,
                        uiTags: uiTags
                    });
                }
            });
        };

        /**
         * @param {string} appId
         * @param {string} tagId
         * @param {*} tagData
         */
        TagPanelCtrl.prototype.addTagItem = function(appId, tagId, tagData) {
            var _this = this;
            var tagCollapseId = appId + '_collapse';
            var $tagTableBody = this.$tagPanel.find('#' + tagCollapseId + ' .panel-body table tbody');

            var getSetsHtml = function(setsType, setsData) {
                switch (setsType) {
                    case tagEnums.setsType.SELECT:
                    case tagEnums.setsType.MULTI_SELECT:
                        return '<textarea class= "sets-item form-control" rows="3" columns="10" style="resize: vertical" placeholder="以換行區隔資料">' +
                            (function(sets) {
                                var transStrs = [];
                                for (var i in sets) {
                                    transStrs.push(transJson[sets[i]] ? transJson[sets[i]] : (sets[i] || ''));
                                }
                                return transStrs;
                            })(setsData).join('\n') +
                        '</textarea>';
                    case tagEnums.setsType.CHECKBOX:
                        return '<input type="text" class="sets-item form-control" value="無設定" disabled />';
                    case tagEnums.setsType.TEXT:
                    case tagEnums.setsType.DATE:
                    case tagEnums.setsType.NUMBER:
                    default:
                        return '<select class="sets-item form-control">' +
                            '<option value="0">單行</option>' +
                            '<option value="1">段落</option>' +
                        '</select>';
                }
            };

            $tagTableBody.append(
                '<tr class="tag-content" id="' + tagId + '">' +
                    '<td class="tag-name long-token">' +
                        '<input class="form-control" type="text" value="' + (transJson[tagData.text] ? transJson[tagData.text] : (tagData.text || '')) + '" />' +
                    '</td>' +
                    '<td class="tag-type">' +
                        '<select class="form-control">' +
                            '<option value="' + tagEnums.setsType.TEXT + '">文字</option>' +
                            '<option value="' + tagEnums.setsType.NUMBER + '">數字</option>' +
                            '<option value="' + tagEnums.setsType.DATE + '">時間</option>' +
                            '<option value="' + tagEnums.setsType.SELECT + '">單項選擇</option>' +
                            '<option value="' + tagEnums.setsType.MULTI_SELECT + '">多項選擇</option>' +
                            '<option value="' + tagEnums.setsType.CHECKBOX + '">單項勾選</option>' +
                        '</select>' +
                    '</td>' +
                    '<td class="tag-sets">' +
                        getSetsHtml(tagData.setsType, tagData.sets) +
                    '</td>' +
                    '<td class="tag-delete">' +
                        '<button type="button" class="btn btn-default btn-sm btn-danger tag-delete-btn' + (tagEnums.type.SYSTEM === tagData.type ? ' hide' : '') + '">' +
                            '<span class="glyphicon glyphicon-remove"></span>&nbsp刪除' +
                        '</button>' +
                    '</td>' +
                    '<td class="tag-drag-icon">' +
                        '<span class="glyphicon glyphicon-menu-hamburger" style="color:#C0C0C0;"></span>' +
                    '</td>' +
                '</tr>');
            var $tagRow = $tagTableBody.find('#' + tagId);
            var $tagTypeSelect = $tagRow.find('.tag-type select');
            $tagTypeSelect.find('option[value="' + tagData.setsType + '"]').prop('selected', true);

            if (tagData.type !== tagEnums.type.CUSTOM) {
                $tagTypeSelect.prop('disabled', true);
                $tagRow.find('.tag-name input').prop('disabled', true);
                $tagRow.find('.tag-sets .sets-item').prop('disabled', true);
            }

            $tagTypeSelect.on('change', function(ev) {
                var $nextCol = $(ev.target.parentElement.nextElementSibling);
                var selectedVal = ev.target.value;
                $nextCol.html(getSetsHtml(selectedVal, ['']));
            });

            $tagRow.find('.btn.tag-delete-btn').on('click', function(ev) {
                $(ev.target).parentsUntil('tbody').remove();
                for (var idx in _this.deleteListeners) {
                    _this.deleteListeners[idx]({
                        appId: appId,
                        tagId: tagId
                    });
                }
            });
        };

        TagPanelCtrl.prototype.onSave = function(handler) {
            var _this = this;
            _this.saveListeners.push(handler);
            return function() {
                var idx = _this.saveListeners.indexOf(handler);
                idx >= 0 && _this.saveListeners.length > 0 && _this.saveListeners.splice(idx, 1);
            };
        };

        TagPanelCtrl.prototype.onDelete = function(handler) {
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
    // 切換到標籤頁面時，再抓取標籤資料
    $('a[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
        if ('#menu3' !== ev.target.hash) {
            // 非標籤頁面不處理
            return;
        }

        var firstAppId = '';
        tagPanelCtrl.$tagPanel.empty();
        return Promise.all([
            api.app.getAll(userId),
            api.tag.getAll(userId)
        ]).then(function(resJsons) {
            var appsData = resJsons.shift().data;
            var appsTagsData = resJsons.shift().data;

            tagPanelCtrl.saveListeners.length = 0;
            tagPanelCtrl.deleteListeners.length = 0;

            for (var appId in appsData) {
                var appData = appsData[appId] || {};
                var tags = appsTagsData[appId].tags || {};
                tagPanelCtrl.addAppItem(appId, appData);
                firstAppId = firstAppId || appId;

                // 將標籤資料依照設定的 order 進行排序，根據順序擺放到 UI 上
                var tagIds = Object.keys(tags);
                tagIds.sort(function(a, b) {
                    return tags[a].order - tags[b].order;
                });

                for (var i in tagIds) {
                    var tagId = tagIds[i];
                    var tag = tags[tagId];
                    if (tag.isDeleted) {
                        delete tags[tagId];
                        continue;
                    }
                    tagPanelCtrl.addTagItem(appId, tagId, tag);
                }
            }

            // 監聽每行標籤的儲存事件，根據 UI 上資料的變更
            // 檢查哪些資料需要更新哪些資料需要新增
            tagPanelCtrl.onSave(function(ev, args) {
                $(ev.target).attr('disabled', true);
                var tagsOrg = appsTagsData[args.appId].tags;
                var tagIds = Object.keys(tagsOrg);

                /**
                 * 深層比對目標物件中的資料在來源物件中是否具有相同資料
                 */
                var tagHasChanged = function(srcTag, destTag) {
                    for (var key in destTag) {
                        // 因為有翻譯文字的關係
                        // 非自定義標籤的名稱與系統性別的設定不檢查
                        if (('text' === key && tagEnums.type.CUSTOM !== srcTag.type) ||
                            ('sets' === key && 'gender' === srcTag.alias)) {
                            continue;
                        }

                        if (srcTag[key] === destTag[key]) {
                            continue;
                        }

                        if (!(srcTag[key] instanceof Array && destTag[key] instanceof Array)) {
                            return true;
                        } else if (srcTag[key].length !== destTag[key].length) {
                            return true;
                        }

                        for (var i in destTag[key]) {
                            if (srcTag[key][i] !== destTag[key][i]) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                return Promise.all(tagIds.map(function(tagId) {
                    var tagOrg = tagsOrg[tagId];
                    var tagOnUI = Object.assign({}, args.uiTags[tagId]);
                    delete args.uiTags[tagId]; // 確認完用的 UI 資料直接刪除，不需再處理

                    // 需對照 UI 上目前每個標籤的順序，更新至對應的標籤
                    if (!!tagOnUI && tagHasChanged(tagOrg, tagOnUI)) {
                        // 只允許自定義的欄位可進行資料變更動作
                        if (tagOrg.type === tagEnums.type.CUSTOM) {
                            tagOrg.text = tagOnUI.text;
                            tagOrg.setsType = tagOnUI.setsType;
                            tagOrg.sets = tagOnUI.sets;
                        }
                        tagOrg.order = tagOnUI.order;
                        return api.tag.update(args.appId, tagId, userId, tagOrg);
                    } else if (tagOrg.isDeleted) {
                        return api.tag.remove(args.appId, tagId, userId).then(function() {
                            delete appsTagsData[args.appId].tags[tagId];
                        });
                    }
                    return Promise.resolve();
                })).then(function() {
                    return Promise.all(Object.keys(args.uiTags).map(function(tagId) {
                        // 將剩下的 id 檢查是否為新增的標籤
                        // 新增的標籤 id 前綴設定為 NEW_TAG_ID_PREFIX 變數
                        // 非新增的標籤資料不進行資料插入動作
                        if (tagId.indexOf(NEW_TAG_ID_PREFIX) < 0) {
                            return Promise.resolve();
                        }

                        var tagOnUI = args.uiTags[tagId];
                        var newTag = {
                            text: tagOnUI.text,
                            type: tagEnums.type.CUSTOM,
                            sets: tagOnUI.sets,
                            setsType: tagOnUI.setsType,
                            order: tagOnUI.order
                        };
                        return api.tag.insert(args.appId, userId, newTag).then(function(resJson) {
                            // 完成資料庫儲存後，將暫時使用的 tagId 替換成真正資料庫的 tagId
                            var insertTags = resJson.data;
                            var newTagId = Object.keys(insertTags[args.appId].tags).shift();
                            appsTagsData[args.appId].tags[newTagId] = insertTags[args.appId].tags[newTagId];
                            $('#' + tagId + '.tag-content').attr('id', newTagId);
                        });
                    }));
                }).then(function() {
                    // 標籤資料處理完成後顯示訊息在 UI 上
                    $.notify('標籤更新成功', { type: 'success' });
                    $(ev.target).removeAttr('disabled');
                });
            });

            // 監聽每行標籤的刪除事件，刪除時在原始資料上標記刪除
            tagPanelCtrl.onDelete(function(ev) {
                var tagsData = appsTagsData[ev.appId].tags[ev.tagId];
                if (!tagsData) {
                    return;
                }
                tagsData.isDeleted = 1;
            });

            // 所有資料載入完後展開第一個 collapse
            tagPanelCtrl.toggleItem(firstAppId);
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

    var groupCtrl = (function() {
        var $addGroupModal = $('#add_group_modal');
        var $groupElems = {};

        var $internalGroupPanel = $('#create-internal-room');
        var $groupBody = $internalGroupPanel.find('.panel-body');

        $addGroupModal.on('click', '#add_group_submit', function() {
            $addGroupModal.modal('hide');

            var groupName = $addGroupModal.find('input').val();
            if (!groupName) {
                return;
            }

            var groupData = {
                name: groupName
            };

            return api.groups.insert(userId, groupData).then(function(resJson) {
                var groupId = Object.keys(resJson.data).shift();
                groups[groupId] = resJson.data[groupId];
                instance.addGroup(groupId, groups[groupId]);
                instance.showCollapse(groupId);
                $addGroupModal.find('input').val('');
            });
        });

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
                '<div class="group-tab" role="tab">' +
                    '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '" aria-expanded="true" aria-controls="' + groupId + '">' +
                        (groupName || '') +
                    '</a>' +
                '</div>' +
                '<div id="' + groupId + '" class="panel-collapse collapse" role="tabpanel">' +
                    '<div class="form-group form-group-row ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'hide') + '">' +
                        '<label for="group_name" class="col-2 col-form-label">群組名稱: </label>' +
                        '<div class="col-4">' +
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

                    // '<div class="form-group form-group-row">' +
                    //     '<label for="group_photo" class="col-2 col-form-label">群組圖片 (URL): </label>' +
                    //     '<div class="col-4">' +
                    //         '<div class="input-group file-container" id="group_photo">' +
                    //             '<span class="input-group-btn">' +
                    //                 '<button class="btn btn-default file-choose">' +
                    //                     '<i class="fa fa-upload"></i>' +
                    //                 '</button>' +
                    //             '</span>' +
                    //             '<input type="file" class="file-ghost" accept=".png,.jpg,.jpeg,.bmp">' +
                    //             '<p type="input" class="form-control file-text" data-placeholder="選擇一張圖片..."></p>' +
                    //             '<span class="input-group-btn">' +
                    //                 '<img src="image/favicon.ico" class="img-preview" />' +
                    //             '</span>' +
                    //             '<span class="input-group-btn btn-update">' +
                    //                 '<button class="btn btn-primary">更新</button>' +
                    //             '</span>' +
                    //         '</div>' +
                    //     '</div>' +
                    // '</div>' +

                    '<table class="table table-responsive chsr-group chsr-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<td class="user">' +
                                    '<div class="email-input-container ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'hide') + '">' +
                                        '<input id="group_add_user" type="text" class="text user-email form-control typeahead" data-provide="typeahead" placeholder="Email 地址" autocomplete="off">' +
                                    '</div>' +
                                '</td>' +
                                '<td class="permission">' +
                                    '<div class="input-group text-right">' +
                                        '<div class="input-group-btn">' +
                                            '<button class="btn btn-default btn-block outline dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                                                '<span class="permission-text">Permission</span>' + '&nbsp;' +
                                                '<span class="caret"></span>' +
                                            '</button>' +
                                            '<ul class="dropdown-menu dropdown-menu-right ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'hide') + '">' +
                                                '<li><a role="button">READ</a></li>' +
                                                '<li><a role="button">WRITE</a></li>' +
                                                '<li><a role="button">ADMIN</a></li>' +
                                            '</ul>' +
                                        '</div>' +
                                    '</div>' +
                                '</td>' +
                                '<td class="status">' +
                                    '<div">' +
                                        '狀態' +
                                    '</div>' +
                                '</td>' +
                                '<td class="actions">' +
                                    '<div class="text-right ' + (memberTypes.OWNER === member.type || memberTypes.ADMIN === member.type ? '' : 'hide') + '">' +
                                        '<button class="btn btn-default btn-block outline add-button">' +
                                            '新增' +
                                            '<i class="fa fa-user-plus"></i>' +
                                        '</button>' +
                                    '</div>' +
                                '</td>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody></tbody>' +
                    '</table>' +
                '</div>';
            return html;
        };

        GroupPanelCtrl.prototype.generateMemberHtml = function(memberId, user, member, memberSelf) {
            var html =
                '<tr class="group-member" member-id="' + memberId + '">' +
                    '<td class="user">' +
                        '<div class="chips">' +
                            '<div class="avatar-container">' +
                                '<img class="member-avatar" src="image/avatar-default.png" alt="Member avatar" />' +
                            '</div>' +
                            '<span class="avatar-name">' + (user.name || user.displayName || '') + '</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="permission">' +
                        '<div class="permission-group text-left">' +
                            '<span class="permission-item cursor-pointer' + (memberTypes.READ === member.type ? ' btn-primary' : '') + '">READ</span>' +
                            '<span class="permission-item cursor-pointer' + (memberTypes.WRITE === member.type ? ' btn-primary' : '') + '">WRITE</span>' +
                            '<span class="permission-item cursor-pointer' + (memberTypes.ADMIN === member.type ? ' btn-primary' : '') + '">ADMIN</span>' +
                            '<span class="permission-item cursor-pointer' + (memberTypes.OWNER === member.type ? ' btn-primary' : '') + '">OWNER</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="status">' +
                        '<span class="active ' + (0 === member.status ? 'hide' : '') + '">' + ACTIVE + '</span>' +
                        '<span class="inactive ' + (1 === member.status ? 'hide' : '') + '">' + INACTIVE + '</span>' +
                    '</td>' +
                    '<td class="actions">' +
                        '<div class="action-container text-right">' +
                            '<a role="button" class="btn-join' + ((memberTypes.OWNER === member.type || 1 === member.status || member.user_id !== auth.currentUser.uid) ? ' hide' : '') + '">' +
                                '<span class="chsr-icon">' +
                                    '<i class="fa fa-2x fa-plus-circle remove-icon"></i>' +
                                '</span>' +
                            '</a>' +
                        '</div>' +
                        '<div class="action-container text-right">' +
                            '<a role="button" class="btn-remove' + ((memberTypes.OWNER === member.type || memberTypes.WRITE === memberSelf.type || memberTypes.READ === memberSelf.type) ? ' hide' : '') + '">' +
                                '<span class="chsr-icon">' +
                                    '<i class="fa fa-2x fa-times-circle remove-icon"></i>' +
                                '</span>' +
                            '</a>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            return html;
        };

        GroupPanelCtrl.prototype.addGroup = function(groupId, groupData) {
            instance.hideCollapseAll(groupId);
            var members = groupData.members;
            var userIds = Object.values(members).map((member) => {
                if (0 === member.isDeleted) {
                    return member.user_id;
                };
            });
            var index = userIds.indexOf(auth.currentUser.uid);
            if (0 > index) {
                // return;
            };

            var memberSelf = Object.values(members)[index];
            $groupBody.append(instance.generateGroupHtml(groupId, groupData.name, memberSelf));

            // #region 每個群組相關事件宣告
            // 將群組中經常取用的 element 一次抓取出來，方便存取
            var $collapse = $groupBody.find('#' + groupId);
            $groupElems[groupId] = {
                $collapse: $collapse,
                $groupName: $groupBody.find('.group-name'),

                $fileGhost: $collapse.find('.file-container input.file-ghost'),
                $fileName: $collapse.find('.file-container .file-text'),
                $imgPreview: $collapse.find('.file-container .img-preview'),

                $memberEmail: $collapse.find('.chsr-group .user-email'),
                $memberList: $collapse.find('.chsr-group tbody'),
                $permissionText: $collapse.find('.chsr-group .permission .permission-text')
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

                return api.auth.getUsers(userId, memberEmail).then(function(resJson) {
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
                    return api.auth.getUsers(userId).then(function(resJson) {
                        userGroupMembers = resJson.data || {};
                        instance.addMemberToList(groupId, insertData.groupMemberId, insertData.groupMembersData, memberSelf);

                        $groupElems[groupId].$memberEmail.val('');
                        $groupElems[groupId].$permissionText.text('Permission');
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
                    return { displayName: item.email };
                },
                displayText: function(item) {
                    // 項目顯示樣式為 [username - example@example.com]
                    return item.displayName + (item.email ? ' - ' + item.email : '');
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

                        return api.auth.searchUsers(userId, emailPattern).then(function(resJson) {
                            return resJson.data || [];
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
            for (var memberId in groupData.members) {
                instance.addMemberToList(groupId, memberId, groupData.members[memberId], memberSelf);
            }
        };

        GroupPanelCtrl.prototype.addMemberToList = function(groupId, memberId, member, memberSelf) {
            var user = userGroupMembers[member.user_id];
            if (!user) {
                return;
            };

            var memberItemHtml = instance.generateMemberHtml(memberId, user, member, memberSelf);
            $groupElems[groupId].$memberList.append(memberItemHtml);

            var $memberRow = $groupElems[groupId].$memberList.find('[member-id="' + memberId + '"]');
            var $memberPermission = $memberRow.find('.permission');
            var $memberStatus = $memberRow.find('.status');
            var $memberActions = $memberRow.find('.actions');

            // 使用者點擊群組內的事件處理
            $memberPermission.on('click', '.permission-item', function() {
                var $permissionItem = $(this);
                var wantPermission = memberTypes[$permissionItem.text()];

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
                });
            });

            $memberActions.on('click', '.btn-join', function() {
                var putMemberData = { status: 1 };
                var $self = $(this);
                return api.groupsMembers.update(groupId, memberId, userId, putMemberData).then(function() {
                    // 更新 API，加入群組
                    groups[groupId].members[memberId].status = putMemberData.status;
                    $memberStatus.find('.active').removeClass('hide');
                    $memberStatus.find('.inactive').addClass('hide');
                    $self.remove();
                    $.notify('您已加入群組', { type: 'success' });
                });
            });

            $memberActions.on('click', '.btn-remove', function() {
                if (memberTypes.OWNER === groups[groupId].members[memberId].type) {
                    $.notify('群組擁有者無法刪除', { type: 'warning' });
                    return;
                } else if (!confirm('確定刪除此成員嗎？')) {
                    return;
                }

                return api.groupsMembers.remove(groupId, memberId, userId).then(function() {
                    // 成功更新後刪除本地端的資料
                    $memberRow.remove();
                    delete groups[groupId].members[memberId];
                });
            });
        };

        var instance = new GroupPanelCtrl();
        return instance;
    })();

    $('a[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
        if ('#create-internal-room' !== ev.target.hash) {
            // 非內部群組頁面不處理
            return;
        }

        groupCtrl.clearAll();
        Promise.all([
            api.groups.getUserGroups(userId),
            api.auth.getUsers(userId)
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
    return api.groups.getUserGroups(userId).then(function(resJson) {
        let groups = resJson.data;
        if (groups instanceof Object && 0 === Object.values(groups).length) {
            $('#add-group-name-app-btn').attr('disabled', false);
            return;
        };

        for (let groupId in groups) {
            if (groups[groupId].isDeleted) {
                continue;
            }
            loadGroups(groups[groupId], groupId);
            $('#add-group-name-app-btn').attr('disabled', false);
        }
    });
}

function insertOneGroup() {
    let name = $('[name="add_group_name_app"]').val();
    let groupName = { name };
    return api.groups.insert(userId, groupName).then(function(resJson) {
        let groupData = resJson.data;
        $('#add_group_name_app_modal').modal('hide');
        for (let groupId in groupData) {
            loadGroups(groupData[groupId], groupId);
        }
    });
}

function findAllApps() {
    return api.app.getAll(userId).then(function(resJson) {
        let apps = resJson.data;

        for (let appId in apps) {
            if (apps[appId].isDeleted || CHATSHIER === apps[appId].type) {
                continue;
            }
            groupType(appId, apps[appId]);
        }
        $('#add-new-btn').attr('disabled', false);
    });
}

function findOneApp(appId) {
    return api.app.getOne(appId, userId).then(function(resJson) {
        let apps = resJson.data;
        formModalBody(appId, apps[appId]);
    });
}

function insertType(type, groupId, callback) {
    let app = {};
    switch (type) {
        case LINE:
            let lineName = $('#line-name').val();
            let lineId = $('#channel-id').val();
            let lineSecret = $('#channel-secret').val();
            let lineToken = $('#channel-token').val();
            app = {
                name: lineName,
                id1: lineId,
                secret: lineSecret,
                token1: lineToken,
                type: type,
                groupid: groupId
            };
            break;
        case FACEBOOK:
            let fbName = $('#facebook-name').val();
            let fbPageId = $('#facebook-page-id').val();
            let fbAppId = $('#facebook-app-id').val();
            let fbSecret = $('#facebook-app-secret').val();
            let fbValidToken = $('#facebook-valid-token').val();
            let fbPageToken = $('#facebook-page-token').val();
            app = {
                name: fbName,
                id1: fbPageId,
                id2: fbAppId,
                secret: fbSecret,
                token1: fbValidToken,
                token2: fbPageToken,
                type: type,
                groupid: groupId
            };
            break;
    }
    callback(app);
}

function insertOneApp(appData) {
    return api.app.insert(userId, appData).then(function(resJson) {
        $('#setting-modal').modal('hide');
        clearAppModalBody();

        var str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
        $('#app-group').html(str);

        $.notify('新增成功!', { type: 'success' });
        let apps = resJson.data;
        for (let appId in apps) {
            groupType(appId, apps[appId]);
        }
    }).catch((resJson) => {
        if (undefined === resJson.status) {
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
    return api.app.update(appId, userId, appData).then(function(resJson) {
        $('#setting-modal').modal('hide');
        clearAppModalBody();

        var str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
        $('#app-group').html(str);

        $.notify('修改成功!', { type: 'success' });
        let apps = resJson.data;
        var app = apps[appId];
        switch (app.type) {
            case LINE:
                $('.' + appId + ' #prof-name1').html(app.name);
                $('.' + appId + ' #prof-channelId_1').html(app.id1);
                $('.' + appId + ' #prof-channelSecret_1').html(app.secret);
                $('.' + appId + ' #prof-channelAccessToken_1').html(app.token1);
                break;
            case FACEBOOK:
                $('.' + appId + ' #prof-fbPageName').html(app.name);
                $('.' + appId + ' #prof-fbPageId').html(app.id1);
                $('.' + appId + ' #prof-fbAppId').html(app.id2);
                $('.' + appId + ' #prof-fbAppSecret').html(app.secret);
                $('.' + appId + ' #prof-fbValidToken').html(app.token1);
                $('.' + appId + ' #prof-fbPageToken').html(app.token2);
                break;
        };
    }).catch((resJson) => {
        if (undefined === resJson.status) {
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

        return api.app.remove(appId, userId).then(function(resJson) { // 強烈建議這裡也放resJson這樣才可以清空table，table的id會掛group id不然會出現重複資料
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            $('#app-group').html(str);
            $.notify('成功刪除!', { type: 'success' });
            $('tr.' + appId).remove();
        }).catch((resJson) => {
            if (undefined === resJson.status) {
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
 * @param {*} groupData
 * @param {*} groupId
 */
function loadGroups(groupData, groupId) {
    let groupStr =
        '<div class="group-tab" role="tab">' +
            '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '-group" aria-expanded="true" aria-controls="' + groupId + '-group">' +
                (groupData.name || '') +
            '</a>' +
        '</div>' +
        '<div id="' + groupId + '-group" class="panel-collapse collapse" role="tabpanel">' +
            '<div class="app-table-space">' +
                '<button type="button" class="btn btn-default" id="add-new-btn" rel="' + groupId + '" data-toggle="modal" data-target="#setting-modal">' +
                    '<span class="fa fa-plus"></span> 新增APP' +
                '</button>' +
                '<br/><br/>' +
                '<table class="table chsr-group chsr-table">' +
                    '<tbody id="' + groupId + '-body"></tbody>' +
                '</table>' +
            '</div>' +
        '</div>';
    $('#menu2 .panel-body .row .col-md-12.col-lg-12').append(groupStr);
}

function groupType(index, app) {
    var baseWebhookUrl = urlConfig.webhookUrl;
    let appStr;
    switch (app.type) {
        case LINE:
            appStr =
                '<tr class="active ' + index + '">' +
                    '<th class="col-md-3 col-lg-3">LINE</th>' +
                    '<th class="col-md-9 col-lg-9">' +
                        '<div id="group1" class="line">' +
                            '<button class="btn btn-danger pull-right" id="del" rel="' + index + '"><span class="fa fa-trash-o"></span> 刪除</button>' +
                            '<button type="button" class="btn btn-grey pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil"></span> 編輯</button>' +
                        '</div>' +
                    '</th>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>LINE應用程式名稱:</td>' +
                    '<td class="long-token" id="prof-name1">' + app.name + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Channel Id 1: </td>' +
                    '<td class="long-token" id="prof-channelId_1">' + app.id1 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Channel Secret 1: </td>' +
                    '<td class="long-token" id="prof-channelSecret_1">' + app.secret + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Channel Access Token 1: </td>' +
                    '<td class="long-token" id="prof-channelAccessToken_1">' + app.token1 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Webhook URL: </td>' +
                    '<td class="long-token">' +
                        '<span id="prof-webhookUrl-1">' + createWebhookUrl(baseWebhookUrl, app.webhook_id) + '</span>' +
                    '</td>' +
                '</tr>';
            $('#' + app.group_id + '-body').append(appStr);
            break;
        case FACEBOOK:
            appStr =
                '<tr class="active ' + index + '">' +
                    '<th class="col-md-3 col-lg-3">Facebook</th>' +
                    '<th class="col-md-9 col-lg-9">' +
                        '<div id="group3" class="fb">' +
                            '<button class="btn btn-danger pull-right" id="del" rel="' + index + '"><span class="fa fa-trash-o"></span> 刪除</button>' +
                            '<button type="button" class="btn btn-grey pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil"></span> 編輯</button>' +
                        '</div>' +
                    '</th>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Facebook應用程式名稱:</td>' +
                    '<td class="long-token" id="prof-fbPageName">' + app.name + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Page Id: </td>' +
                    '<td class="long-token" id="prof-fbPageId">' + app.id1 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>App Id: </td>' +
                    '<td class="long-token" id="prof-fbAppId">' + app.id2 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>App Secret: </td>' +
                    '<td class="long-token" id="prof-fbAppSecret">' + app.secret + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Validation Token: </td>' +
                    '<td class="long-token" id="prof-fbValidToken">' + app.token1 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Page Token: </td>' +
                    '<td class="long-token" id="prof-fbPageToken">' + app.token2 + '</td>' +
                '</tr>' +
                '<tr class="' + index + '">' +
                    '<td>Webhook URL: </td>' +
                    '<td class="long-token">' +
                        '<span id="prof-fbwebhookUrl">' + createWebhookUrl(baseWebhookUrl, app.webhook_id) + '</span>' +
                    '</td>' +
                '</tr>';
            $('#' + app.group_id + '-body').append(appStr);
            break;
    }
}

function formModalBody(id, app) {
    let appStr;
    switch (app.type) {
        case LINE:
            appStr =
                '<form>' +
                    '<div id="type" hidden>updateApp</div>' +
                    '<div class="form-group" hidden>' +
                        '<label for="edit-id" class="col-2 col-form-label">ID</label>' +
                        '<span id="webhook-id">' + id + '</span>' +
                        '<span id="groupId">' + app.group_id + '</span>' +
                    '</div>' +
                    '<div id="prof-edit-line-1">' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">Channel Name 1: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.name + '" id="name"/>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="prof-edit-channelId_1" class="col-2 col-form-label">Channel Id 1: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.id1 + '" id="channel-id"/>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="prof-edit-channelSecret_1" class="col-2 col-form-label">Channel Secret 1: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.secret + '" id="channel-secret"/>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label for="prof-edit-channelAccessToken_1" class="col-2 col-form-label">Channel Access Token 1: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.token1 + '" id="channel-token"/>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</form>';
            $appModal.append(appStr);
            break;
        case FACEBOOK:
            appStr =
                '<form>' +
                    '<div id="type" hidden>updateApp</div>' +
                    '<div class="form-group" hidden>' +
                        '<label class="col-2 col-form-label">ID</label>' +
                        '<span id="webhook-id">' + id + '</span>' +
                        '<span id="groupId">' + app.group_id + '</span>' +
                    '</div>' +
                    '<div id="prof-edit-fb">' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">Facebook Page Name: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.name + '" id="facebook-name">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">Page Id: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.id1 + '" id="facebook-page-id">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">App ID: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.id2 + '" id="facebook-app-id">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">App Secret: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.secret + '" id="facebook-app-secret">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">Validation Token: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.token1 + '" id="facebook-valid-token">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-2 col-form-label">Page Token: </label>' +
                            '<div class="col-4">' +
                                '<input class="form-control" type="tel" value="' + app.token2 + '" id="facebook-page-token">' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</form>';
            $appModal.append(appStr);
            break;
    }
}

function clearAppModalBody() {
    $appModal.empty();
}
function findAuthUserProfile() {
    return api.auth.getUsers(userId).then(function(resJson) {
        let users = resJson.data;
        let user = users[userId];
        if (userId) {
            // User 已登入
            $('h3.panel-title').text(user.displayName);
            $('#prof-email').text(user.email);
            $('#prof-id').text(userId);
        };
    });
}

function findUserProfile() {
    return api.users.getUser(userId).then(function(resJson) {
        var profile = resJson.data;
        $('#prof-id').text(userId);
        $('#prof-IDnumber').text(userId);
        $('#prof-company').text(profile.company);
        $('#prof-phonenumber').text(profile.phone);
        $('#prof-address').text(profile.address);
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
    if (!phone.match(phoneRule)) {
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
