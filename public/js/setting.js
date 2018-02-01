/// <reference path='../../typings/client/index.d.ts' />

// ===============
// 標籤 Tab 代碼區塊
(function() {
    // 宣告用來處理整個標籤容器的控制類別
    var TagPanelCtrl = (function() {
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
                _this.addTagItem(appId, 'temp_tag_id' + Date.now(), {
                    name: '新標籤'
                });
            });

            $tagCollapse.find('.btn.all-confirm').on('click', function(ev) {
                var $tagRows = $tagTableBody.find('tr.tag-content');
                var uiData = {};
                for (var i = 0; i < $tagRows.length; i++) {
                    var $row = $($tagRows[i]);
                    var data = {
                        name: $row.find('.tag-name input').val(),
                        setsType: $row.find('.tag-type select option:selected').val(),
                        order: i
                    };
                    var setsValue = 0;

                    switch (data.setsType) {
                        case tagEnums.setsType.MULTI_SELECT:
                        case tagEnums.setsType.CHECKBOX:
                            // 多選的資料由之後的應用端處理
                            break;
                        case tagEnums.setsType.SELECT:
                        case tagEnums.setsType.RADIO:
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
                    uiData[$row.prop('id')] = data;
                }

                for (var idx in _this.saveListeners) {
                    _this.saveListeners[idx]({
                        appId: appId,
                        uiData: uiData
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
                    case tagEnums.setsType.RADIO:
                        return '<textarea class= "sets-item form-control" rows="3" columns="10" style="resize: vertical" placeholder="以換行區隔資料">' + setsData.join('\n') + '</textarea>';
                    case tagEnums.setsType.MULTI_SELECT:
                    case tagEnums.setsType.CHECKBOX:
                        return '<input class="sets-item form-control" value="無設定" disabled />';
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
                        '<input class="form-control" type="text" value="' + (tagData.name || '') + '" />' +
                    '</td>' +
                    '<td class="tag-type">' +
                        '<select class="form-control">' +
                            '<option value="' + tagEnums.setsType.TEXT + '">文字</option>' +
                            '<option value="' + tagEnums.setsType.NUMBER + '">數字</option>' +
                            '<option value="' + tagEnums.setsType.DATE + '">時間</option>' +
                            '<option value="' + tagEnums.setsType.SELECT + '">單項選擇</option>' +
                            '<option value="' + tagEnums.setsType.MULTI_SELECT + '">多項選擇</option>' +
                            '<option value="' + tagEnums.setsType.CHECKBOX + '">多項勾選</option>' +
                            '<option value="' + tagEnums.setsType.RADIO + '">單項圈選</option>' +
                        '</select>' +
                    '</td>' +
                    '<td class="tag-sets">' +
                        getSetsHtml(tagData.setsType, tagData.sets) +
                    '</td>' +
                    '<td class="tag-delete">' +
                        '<button type="button" class="btn btn-default btn-sm btn-danger tag-delete-btn">' +
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

            if (tagData.type === tagEnums.type.DEFAULT) {
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

        return TagPanelCtrl;
    })();

    var userId = '';
    var api = window.restfulAPI;
    var tagEnums = api.tag.enums;
    var tagPanelCtrl = new TagPanelCtrl();

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;
    });

    // 設定頁面中 tab 切換時的事件監聽
    // 切換到標籤頁面時，再抓取標籤資料
    $('a[data-toggle="pill"').on('shown.bs.tab', function(ev) {
        if ('#menu3' !== ev.target.hash) {
            // 非標籤頁面不處理
            return;
        }

        var firstAppId = '';
        tagPanelCtrl.$tagPanel.empty();
        return api.chatshierApp.getAll(userId).then(function(resJson) {
            var appsData = resJson.data;
            tagPanelCtrl.saveListeners.length = 0;
            tagPanelCtrl.deleteListeners.length = 0;

            for (var appId in appsData) {
                var appData = appsData[appId] || {};
                var tagsData = appData.tags || {};
                tagPanelCtrl.addAppItem(appId, appData);
                firstAppId = firstAppId || appId;

                // 將標籤資料依照設定的 order 進行排序，根據順序擺放到 UI 上
                var tagIds = Object.keys(tagsData);
                tagIds.sort(function(a, b) {
                    return tagsData[a].order - tagsData[b].order;
                });

                for (var i in tagIds) {
                    var tagId = tagIds[i];
                    var tagData = tagsData[tagId];
                    if (tagData.isDeleted) {
                        continue;
                    }
                    tagPanelCtrl.addTagItem(appId, tagId, tagData);
                }
            }

            // 監聽每行標籤的儲存事件，根據 UI 上資料的變更
            // 檢查哪些資料需要更新哪些資料需要新增
            tagPanelCtrl.onSave(function(ev) {
                var tagsData = appsData[ev.appId].tags;
                var tagIds = Object.keys(tagsData);

                /**
                 * 深層比對目標物件中的資料在來源物件中是否具有相同資料
                 */
                var hasSameData = function(srcTag, destTag) {
                    for (var key in destTag) {
                        if (destTag[key] === srcTag[key]) {
                            continue;
                        } else if (!(destTag[key] instanceof Array && srcTag[key] instanceof Array)) {
                            return false;
                        } else if (destTag[key].length !== srcTag[key].length) {
                            return false;
                        }

                        for (var i in destTag[key]) {
                            if (destTag[key][i] !== srcTag[key][i]) {
                                return false;
                            }
                        }
                    }
                    return true;
                };

                return Promise.all(tagIds.map(function(tagId) {
                    var tagData = tagsData[tagId];

                    // 需對照 UI 上目前每個標籤的順序，更新至對應的標籤
                    if (ev.uiData[tagId] && !hasSameData(tagData, ev.uiData[tagId])) {
                        // 只允許非系統預設的欄位可進行資料變更動作
                        if (tagData.type !== tagEnums.type.DEFAULT) {
                            tagData.name = ev.uiData[tagId].name;
                            tagData.setsType = ev.uiData[tagId].setsType;
                            tagData.sets = ev.uiData[tagId].sets;
                        }
                        tagData.order = ev.uiData[tagId].order;
                        tagData.updatedTime = Date.now();
                        delete ev.uiData[tagId];
                        return api.tag.update(ev.appId, tagId, userId, tagData);
                    } else if (tagData.isDeleted) {
                        return api.tag.remove(ev.appId, tagId, userId);
                    }
                    delete ev.uiData[tagId]; // 確認完用的 UI 資料直接刪除，不需再處理
                    return Promise.resolve();
                })).then(function() {
                    // 將剩下的 id 檢查是否為新增的標籤
                    var newTagIds = Object.keys(ev.uiData);
                    return Promise.all(newTagIds.map(function(tagId) {
                        // 新增的標籤 id 前綴設定為 temp_tag_id
                        // 非新增的標籤資料不進行資料插入動作
                        if (tagId.indexOf('temp_tag_id') !== 0) {
                            return Promise.resolve();
                        }

                        var tagData = {
                            name: ev.uiData[tagId].name,
                            type: tagEnums.type.CUSTOM,
                            sets: ev.uiData[tagId].sets,
                            setsType: ev.uiData[tagId].setsType,
                            order: ev.uiData[tagId].order,
                            createdTime: Date.now(),
                            updatedTime: Date.now()
                        };
                        return api.tag.insert(ev.appId, userId, tagData);
                    }));
                }).then(function() {
                    // 標籤資料處理完成後顯示訊息在 UI 上
                    $.notify('標籤更新成功', { type: 'success' });
                });
            });

            // 監聽每行標籤的刪除事件，刪除時在原始資料上標記刪除
            tagPanelCtrl.onDelete(function(ev) {
                var tagsData = appsData[ev.appId].tags[ev.tagId];
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
// 標籤 Tab 代碼區塊
// ===============

var domain = location.host;
if (!window.urlConfig) {
    console.warn('Please set up the configuration file of /config/url-config.js');
}

$.notifyDefaults({
    delay: 2000,
    placement: {
        from: 'top',
        align: 'center'
    },
    animate: {
        enter: 'animated fadeInDown',
        exit: 'animated fadeOutUp'
    }
});

$(document).ready(function() {
    var loadSetting = setInterval(() => {
        if (auth.currentUser) {
            clearInterval(loadSetting);
            findAllApps(); // 列出所有設定的APPs
            findUserProfile();
        }
    }, 1000);

    var DEFAULT_INTERNAL_PHOTO = "https://firebasestorage.googleapis.com/v0/b/shield-colman.appspot.com/o/internal-group.png?alt=media&token=4294f99e-42b7-4b2d-8a24-723785ec1a2b";
    var socket = io.connect();

    // 內部聊天室
    socket.emit('get agentIdToName list');
    socket.on('send agentIdToName list', data => {
        // console.log("send!");
        // console.log(data);
        let select = $('#create-internal-owner');
        let ul = $("#create-internal-agents").parent().siblings('ul').empty();
        for (let id in data) {
            ul.append('<li><input type="checkbox" value="' + id + '">' + data[id] + '</li>');
            select.append('<option value="' + id + '">' + data[id] + '</option>');
        }
        select.val('');
    });
    $(document).on('click', '#prof-submit-create-internal-room', profSubmitCreateInternalRoom); // 完成編輯-新增內部聊天室
    $(document).on('change', '.multi-select-container', multiSelectChange); // 複選選項改變
    $(document).on('change', '.multi-select-container[rel="create-internal-agents"]', checkInternalAgents); // 檢查內部群聊的擁有者是否為群組成員
    $(document).on('change', 'select#create-internal-owner', checkInternalOwner); // 檢查內部群聊的擁有者是否為群組成員

    function multiSelectChange() {
        changeMultiSelectText($(this));
    }

    function changeMultiSelectText(container) {
        let valArr = [];
        let textArr = [];
        let boxes = container.find('input');
        boxes.each(function() {
            if ($(this).is(':checked')) {
                valArr.push($(this).val());
                textArr.push($(this).parents('li').text());
            }
        });
        // console.log(valArr);
        // console.log(textArr);
        valArr = valArr.join(',');
        if (textArr.length === boxes.length) textArr = "全選";
        else if (textArr.length == 0) textArr = "未選擇";
        else textArr = textArr.join(',');
        container.parent().find($('.multi-select-text')).text(textArr).attr('rel', valArr);
    } //end of changeMultiSelectText
    function checkInternalAgents() {
        //編輯內部群聊的成員名單時
        //檢查擁有者是否為群組成員
        let $textArea = $('.multi-select-text#create-internal-agents');
        let $owner = $('#create-internal-owner');
        let rel = $textArea.attr('rel');
        let ownerId = $owner.val();
        if (rel.indexOf(ownerId) === -1) {
            $owner.val(''); //若owner沒在名單內，則將owner值變empty
        }
    }

    function checkInternalOwner() {
        //編輯內部群聊的擁有者時
        //檢查擁有者是否為群組成員
        let $multiSelect = $('.multi-select-container[rel="create-internal-agents"]');
        let $owner = $('#create-internal-owner');
        let ownerId = $owner.val();
        let $checkBox = $multiSelect.find('input[type="checkbox"][value="' + ownerId + '"]');
        if (!$checkBox.prop('checked')) {
            $checkBox.prop('checked', true);
            changeMultiSelectText($multiSelect);
        }
    }

    function profSubmitCreateInternalRoom() {
        if (confirm("確認新建內部聊天室?")) {
            let roomName = $('#create-internal-room-name').val();
            let description = $('#create-internal-description').val();
            let photo = $('#create-internal-photo').val();
            let owner = $('#create-internal-owner').val();
            let agent = $('#create-internal-agents').attr('rel');
            let agents = agent.split(",");

            if (!roomName) $.notify('群組名稱不可為空', { type: 'warning' });
            else if (!owner || owner == "0") $.notify('請指定擁有者', { type: 'warning' }); //如果擁有者為ID=="0"的System，一樣不給過
            else if (!agent) $.notify('群組成員需至少一位', { type: 'warning' });
            else {
                let data = {
                    "roomName": roomName,
                    "description": description,
                    "photo": photo ? photo : DEFAULT_INTERNAL_PHOTO,
                    "owner": owner,
                    "agent": agents,
                    "type": "chatshier"
                }
                socket.emit('create internal room', data);
                $.notify('成功!', { type: 'success' });
                clearCreateInternalRoomInput();
            }
        }
    }
    $('#clear-create-internal-room').on('click', clearCreateInternalRoomInput);

    function clearCreateInternalRoomInput() {
        $('#create-internal-room-name').val('');
        $('#create-internal-description').val('');
        $('#create-internal-photo .file-reset').click();
        $('#create-internal-owner').val('');
        $('#create-internal-agents').attr('rel', '').text('未選擇');
    }

    $(document).on('change', '.file-container input.file-ghost', function() {
        if (0 < this.files.length) {
            let fileContainer = $(this).parents('.file-container');
            let fileText = fileContainer.find('.file-text');
            fileText.text(($(this).val()).split('\\').pop());

            let file = this.files[0];
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                let url = snapshot.downloadURL;
                fileContainer.val(url);
            });
        }
    });
    $(document).on('click', '.file-container button.file-choose', function() {
        let fileContainer = $(this).parents('.file-container');
        let fileGhost = fileContainer.find('.file-ghost');
        fileGhost.click();
    });
    $(document).on('click', '.file-container button.file-reset', function() {
        let fileContainer = $(this).parents('.file-container');
        let fileGhost = fileContainer.find('.file-ghost');
        let fileText = fileContainer.find('.file-text');
        fileGhost.val(null);
        fileContainer.val('');
        fileText.text('');
    });
    // 內部聊天室
    // ACTIONS
    $('#setting-modal').on('hidden.bs.modal', function() {
        clearModalBody();
    });
    $(document).on('click', '#edit', function() {
        let appId = $(this).attr('rel');
        findOneApp(appId); // 點選編輯後根據appId列出指定的APP
    });
    $('#setting-modal-submit-btn').click(function(event) {
        event.preventDefault();
        let type = $(this).parent().parent().find('#type').text();
        // insertNewApp, updateProfile, updateApp
        switch (type) {
            case 'insertNewApp':
                let app = $(this).parent().parent().find('#app-group-select option:selected').val();
                insertType(app, (data) => {
                    insertOneApp(data);
                });
                break;
            case 'updateProfile':
                profSubmitBasic();
                break;
            case 'updateApp':
                let appId = $(this).parent().parent().find('#webhook-id').text();
                // console.log($('#facebook-name').val())
                if ($('#facebook-name').val() === undefined) {
                    let name = $('#name').val();
                    let id1 = $('#channel-id').val();
                    let secret = $('#channel-secret').val();
                    let token1 = $('#channel-token').val();
                    let type = 'LINE';
                    let updateObj = {
                        name,
                        id1,
                        secret,
                        token1,
                        type
                    }
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                } else {
                    let name = $('#facebook-name').val();
                    let id1 = $('#facebook-page-id').val();
                    let id2 = $('#facebook-app-id').val();
                    let secret = $('#facebook-app-secret').val();
                    let token1 = $('#facebook-valid-token').val();
                    let token2 = $('#facebook-page-token').val();
                    let type = 'FACEBOOK';
                    let updateObj = {
                        name,
                        id1,
                        id2,
                        secret,
                        token1,
                        token2,
                        type
                    }
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                }
                break;
        }
    });
    $(document).on('click', '#del', function() {
        let autoreplyId = $(this).attr('rel');
        let confirmDelete = confirm('確定刪除?');
        // console.log(autoreplyId);
        if (confirmDelete) {
            removeOneApp(autoreplyId);
        }
    });
    $('#add-new-btn').click(function() {
        let formStr =
            '<form>' +
            '<div id="type" hidden>insertNewApp</div>' +
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
            '<label class="col-2 col-form-label">Validation Token:: </label>' +
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
        $('.modal-body').append(formStr);
    });
    $(document).on('change', '#app-group-select', function() { // 切換模式 LINE或是臉書
        // console.log($(this).find('option:selected').val());
        let type = $(this).find('option:selected').val();
        switch (type) {
            case 'LINE':
                $('#line-form').hide();
                $('#facebook-form').hide();
                $('#line-form').show();
                break;
            case 'FACEBOOK':
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
            '<label class="col-2 col-form-label">地區: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + location + '" id="location"/>' +
            '</div>' +
            '</div>' +
            '</div>';
        $('.modal-body').append(str);
    });
});

function findAllApps() {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps/users/' + id,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            if (data !== null && data !== undefined) {
                let appIds = data.data;
                let appKeyArr = Object.keys(appIds);
                for (let i in appIds) {
                    if (false === appIds[i].hasOwnProperty('isDeleted') || 0 === appIds[i].isDeleted) {
                        $('#prof-id').append(appIds[i].user_id);
                        // groupType(appKeyArr[i],appIds[i]);
                        groupType(i, appIds[i]);
                    }
                }
                $('#add-new-btn').attr('disabled', false);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function findOneApp(appId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            if (data !== null && data !== undefined) {
                let appInfo = data.data;
                formModalBody(appId, appInfo[appId]);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function insertType(type, callback) {
    switch (type) {
        case 'LINE':
            let lineName = $('#line-name').val();
            let lineId = $('#channel-id').val();
            let lineSecret = $('#channel-secret').val();
            let lineToken = $('#channel-token').val();
            let lineObj = {
                name: lineName,
                id1: lineId,
                secret: lineSecret,
                token1: lineToken,
                type: type
            }
            console.log(lineObj);
            callback(lineObj);
            break;
        case 'FACEBOOK':
            let fbName = $('#facebook-name').val();
            let fbPageId = $('#facebook-page-id').val();
            let fbAppId = $('#facebook-app-id').val();
            let fbSecret = $('#facebook-app-secret').val();
            let fbValidToken = $('#facebook-valid-token').val();
            let fbPageToken = $('#facebook-page-token').val();
            let fbObj = {
                name: fbName,
                id1: fbPageId,
                id2: fbAppId,
                secret: fbSecret,
                token1: fbValidToken,
                token2: fbPageToken,
                type: type
            }
            callback(fbObj);
            break;
    }
}

function insertOneApp(data) { // 未完成
    console.log(data);
    console.log(JSON.stringify(data));
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'POST',
        url: '/api/apps/users/' + id,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            $.notify('新增成功!', { type: 'success' });
            $('#setting-modal').modal('hide');
            clearModalBody();
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function updateOneApp(appId, data) { // 未完成
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            $.notify('修改成功!', { type: 'success' });
            $('#setting-modal').modal('hide');
            clearModalBody();
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {}
    });
}

function removeOneApp(appId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            $.notify('成功刪除!', { type: 'success' });
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {}
    });
}

function groupType(index, item) {
    var baseWebhookUrl = urlConfig.webhookUrl;
    let appStr
    switch (item.type) {
        case 'LINE':
            appStr =
                '<tr class="active">' +
                '<th class="col-md-3 col-lg-3">LINE</th>' +
                '<th class="col-md-9 col-lg-9">' +
                '<div id="group1" class="line">' +
                '<button class="btn btn-danger pull-right" id="del" rel="' + index + '">刪除</button>' +
                '<button type="button" class="btn btn-default pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil-square-o"></span> 編輯</button>' +
                '</div>' +
                '</th>' +
                '</tr>' +
                '<tr>' +
                '<td>LINE應用程式名稱:</td>' +
                '<td class="long-token" id="prof-name1">' + item.name + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Id 1: </td>' +
                '<td class="long-token" id="prof-channelId_1">' + item.id1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Secret 1: </td>' +
                '<td class="long-token" id="prof-channelSecret_1">' + item.secret + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Access Token 1: </td>' +
                '<td class="long-token" id="prof-channelAccessToken_1">' + item.token1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Webhook URL: </td>' +
                '<td class="long-token">' +
                '<span id="prof-webhookUrl-1">' + createWebhookUrl(baseWebhookUrl, item.webhook_id) + '</span>' +
                '</td>' +
                '</tr>';
            $('#app-group').append(appStr);
            break;
        case 'FACEBOOK':
            appStr =
                '<tr class="active">' +
                '<th class="col-md-3 col-lg-3">Facebook</th>' +
                '<th class="col-md-9 col-lg-9">' +
                '<div id="group3" class="fb">' +
                '<button class="btn btn-danger pull-right" id="del" rel="' + index + '">刪除</button>' +
                '<button type="button" class="btn btn-default pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil-square-o"></span> 編輯</button>' +
                '</div>' +
                '</th>' +
                '</tr>' +
                '<tr>' +
                '<td>Facebook應用程式名稱:</td>' +
                '<td class="long-token" id="prof-fbPageName">' + item.name + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Page Id: </td>' +
                '<td class="long-token" id="prof-fbPageId">' + item.id1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>App Id: </td>' +
                '<td class="long-token" id="prof-fbAppId">' + item.id2 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>App Secret: </td>' +
                '<td class="long-token" id="prof-fbAppSecret">' + item.secret + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Validation Token: </td>' +
                '<td class="long-token" id="prof-fbValidToken">' + item.token1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Page Token: </td>' +
                '<td class="long-token" id="prof-fbPageToken">' + item.token2 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Webhook URL: </td>' +
                '<td class="long-token">' +
                '<span id="prof-fbwebhookUrl">' + createWebhookUrl(baseWebhookUrl, item.webhook_id) + '</span>' +
                '</td>' +
                '</tr>';
            $('#app-group').append(appStr);
            break;
    }
}

function formModalBody(id, item) {
    let appStr
    switch (item.type) {
        case 'LINE':
            appStr =
                '<form>' +
                '<div id="type" hidden>updateApp</div>' +
                '<div class="form-group" hidden>' +
                '<label for="edit-id" class="col-2 col-form-label">ID</label>' +
                '<span id="webhook-id">' + id + '</span>' +
                '</div>' +
                '<div id="prof-edit-line-1">' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Channel Name 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.name + '" id="name"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelId_1" class="col-2 col-form-label">Channel Id 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id1 + '" id="channel-id"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelSecret_1" class="col-2 col-form-label">Channel Secret 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.secret + '" id="channel-secret"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelAccessToken_1" class="col-2 col-form-label">Channel Access Token 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token1 + '" id="channel-token"/>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</form>';
            $('.modal-body').append(appStr);
            break;
        case 'FACEBOOK':
            appStr =
                '<form>' +
                '<div id="type" hidden>updateApp</div>' +
                '<div class="form-group" hidden>' +
                '<label class="col-2 col-form-label">ID</label>' +
                '<span id="webhook-id">' + id + '</span>' +
                '</div>' +
                '<div id="prof-edit-fb">' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Facebook Page Name: </label>' +
                ' <div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.name + '" id="facebook-name">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Page Id: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id1 + '" id="facebook-page-id">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">App ID: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id2 + '" id="facebook-app-id">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">App Secret: </label>' +
                ' <div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.secret + '" id="facebook-app-secret">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Validation Token:: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token1 + '" id="facebook-valid-token">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Page Token: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token2 + '" id="facebook-page-token">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</form>';
            $('.modal-body').append(appStr);
            break;
    }
}

function clearModalBody() {
    $('.modal-body').empty();
}

function findUserProfile() {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/users/users/' + id,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let profile = data.data;
            $('#prof-id').text(id);
            $('h3.panel-title').text(profile.name);
            $('#prof-email').text(profile.email);
            $('#prof-IDnumber').text(id);
            $('#prof-company').text(profile.company);
            $('#prof-phonenumber').text(profile.phonenumber);
            $('#prof-address').text(profile.address);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function updateUserProfile(data) {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/users/' + id,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            $('#prof-company').text(data.company);
            $('#prof-phonenumber').text(data.phonenumber);
            $('#prof-address').text(data.address);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function profSubmitBasic() {
    let userId = auth.currentUser.uid;
    let company = $('#company').val();
    let phonenumber = $('#phone').val();
    let address = $('#location').val();
    let obj = {
        company,
        phonenumber,
        address
    }
    phoneRule = /^09\d{8}$/;
    if (!phonenumber.match(phoneRule)) {
        $('#prof-edit-phonenumber').tooltip('show'); //show
        setTimeout(function() {
            $('#prof-edit-phonenumber').tooltip('destroy');
        }, 3000);
    } else {
        updateUserProfile(obj)
        $('#setting-modal').modal('hide');
    }
}

function createWebhookUrl(baseWebhookUrl, webhookId) {
    let webhookUrl;
    baseWebhookUrl = baseWebhookUrl.replace(/^https?\:\/\//, '');
    baseWebhookUrl = baseWebhookUrl.replace(/\/+$/, '');
    webhookUrl = 'https://' + baseWebhookUrl + "/" + webhookId;
    return webhookUrl;
}