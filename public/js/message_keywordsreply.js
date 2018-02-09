/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var userId = '';
    var appId = '';
    var nowSelectAppId = '';
    var allKeywordreplyData = {};
    var keywordrepliesData = {};
    var api = window.restfulAPI;

    var $jqDoc = $(document);
    var $keywordreplyAddModal = $('#keywordreply_add_modal');
    var $keywordreplyEditModal = $('#keywordreply_edit_modal');
    var $appDropdown = $('.app-dropdown');
    var $dropdownMenu = $appDropdown.find('.dropdown-menu');
    var $openTableElem = null;
    var $draftTableElem = null;
    var $appSelector = null;

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;

        // ==========
        // 設定關鍵字新增 modal 相關 element 與事件
        $appSelector = $keywordreplyAddModal.find('.modal-body select[name="keywordreply-app-name"]');
        $keywordreplyAddModal.on('show.bs.modal', function() {
            $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val('');
            $keywordreplyAddModal.find('textarea[name="keywordreply-text"]').val('');

            // 新增 modal 即將顯示事件發生時，將 App 清單更新
            $appSelector.empty();
            for (var appId in allKeywordreplyData) {
                var appData = allKeywordreplyData[appId];
                $appSelector.append('<option value="' + appId + '">' + appData.name + '</option>');
            }
        });
        $keywordreplyAddModal.find('button.btn-insert-submit').on('click', insertSubmit);
        // ==========

        // ==========
        // 設定關鍵字編輯 modal 相關 element 與事件
        $keywordreplyEditModal.on('show.bs.modal', function(event) {
            // 編輯 modal 即將顯示事件發生時，將欄位資料更新
            var targetRow = $(event.relatedTarget).parent().parent();
            var appId = targetRow.prop('title');
            var keywordreplyId = targetRow.prop('id');
            var targetData = keywordrepliesData[keywordreplyId];

            var $editForm = $keywordreplyEditModal.find('.modal-body form');
            $editForm.find('input[name="keywordreply-keyword"]').val(targetData.keyword);
            $editForm.find('textarea[name="keywordreply-text"]').val(targetData.text);

            // 如果是屬於草稿則顯示 checkbox 否則隱藏
            var checkboxIsDraft = $editForm.find('.form-check.checkbox-is-draft');
            checkboxIsDraft.find('input[name="keywordreply-is-draft"]').prop('checked', !targetData.status);
            if (!targetData.status) {
                checkboxIsDraft.show();
            } else {
                checkboxIsDraft.hide();
            }

            $keywordreplyEditModal.find('button.btn-update-submit').off('click').on('click', function() {
                targetData.keyword = $editForm.find('input[name="keywordreply-keyword"]').val();
                targetData.text = $editForm.find('textarea[name="keywordreply-text"]').val();
                targetData.status = $editForm.find('input[name="keywordreply-is-draft"]').prop('checked') ? 0 : 1;
                targetData.updatedTime = Date.now();

                return api.keywordreply.update(appId, keywordreplyId, userId, targetData).then(function() {
                    $keywordreplyEditModal.modal('hide');
                    return loadKeywordsReplies(appId, userId);
                });
            });
        });
        // ==========

        $openTableElem = $('#keywordreply_open_table tbody');
        $draftTableElem = $('#keywordreply_draft_table tbody');
        return api.chatshierApp.getAll(userId);
    }).then(function(respJson) {
        allKeywordreplyData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in allKeywordreplyData) {
            $dropdownMenu.append('<li><a id="' + appId + '">' + allKeywordreplyData[appId].name + '</a></li>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        $appDropdown.find('.dropdown-text').text(allKeywordreplyData[nowSelectAppId].name);
        loadKeywordsReplies(nowSelectAppId, userId);
        $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadKeywordsReplies(nowSelectAppId, userId);
    }

    var TableObj = function() {
        this.tr = $('<tr>');
        this.th = $('<th>');
        this.td1 = $('<td>');
        this.td2 = $('<td>');
        this.td3 = $('<td>');
        this.UpdateBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-pencil')
            .attr('id', 'edit-btn')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#keywordreply_edit_modal')
            .attr('aria-hidden', 'true');
        this.DeleteBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-trash-o')
            .attr('id', 'delete-btn');
    };

    function loadKeywordsReplies(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        return api.keywordreply.getOne(appId, userId).then(function(resJson) {
            keywordrepliesData = resJson.data;
            $openTableElem.empty();
            $draftTableElem.empty();

            for (var keywordreplyId in keywordrepliesData) {
                var keywordreplyData = keywordrepliesData[keywordreplyId];
                if (keywordreplyData.isDeleted) {
                    continue;
                }

                var list = new TableObj();
                var keyword = list.th.text(keywordreplyData.keyword);
                var text = list.td1.text(keywordreplyData.text);
                var replyCount = list.td2.text(keywordreplyData.replyCount);
                var btns = list.td3.append(list.UpdateBtn, list.DeleteBtn);
                var trGrop = list.tr.attr('id', keywordreplyId).attr('title', appId).append(keyword, text, replyCount, btns);
                if (!keywordreplyData.status) {
                    $draftTableElem.append(trGrop);
                } else {
                    $openTableElem.append(trGrop);
                }
            }

            $jqDoc.find('td #delete-btn').off('click').on('click', function(event) {
                var targetRow = $(event.target).parent().parent();
                var appId = targetRow.prop('title');
                var keywordreplyId = targetRow.prop('id');

                return showDialog('確定要刪除嗎？').then(function(isOK) {
                    if (!isOK) {
                        return;
                    }

                    return api.keywordreply.remove(appId, keywordreplyId, userId).then(function() {
                        return loadKeywordsReplies(appId, userId);
                    });
                });
            });
        });
    }

    function insertSubmit() {
        var appId = $appSelector.find('option:selected').val();
        var keyword = $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val();
        var textContent = $keywordreplyAddModal.find('textarea[name="keywordreply-text"]').val();
        var isDraft = $keywordreplyAddModal.find('input[name="keywordreply-is-draft"]').prop('checked');
        var $errorMsgElem = $keywordreplyAddModal.find('.text-danger.error-msg');

        // ==========
        // 檢查資料有無輸入
        $errorMsgElem.empty().hide();
        if (!appId) {
            $errorMsgElem.text('請選擇目標App').show();
            return;
        } else if (!keyword) {
            $errorMsgElem.text('請輸入關鍵字').show();
            return;
        } else if (!textContent) {
            $errorMsgElem.text('請輸入關鍵字回覆的內容').show();
            return;
        }
        // ==========

        var keywordreplyData = {
            keyword: keyword,
            subKeywords: '',
            text: textContent,
            replyCount: 0,
            status: isDraft ? 0 : 1,
            createdTime: Date.now(),
            updatedTime: Date.now()
        };

        return api.keywordreply.insert(appId, userId, keywordreplyData).then(function(resJson) {
            $keywordreplyAddModal.modal('hide');
            $appDropdown.find('#' + appId).click();
            return loadKeywordsReplies(appId, userId);
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            var dialogModalTemplate =
                '<div id="dialog_modal" class="modal fade" tabindex="-1" role="dialog">' +
                '<div class="modal-dialog" role="document">' +
                '<div class="modal-content">' +
                '<div class="modal-body">' +
                '<h4>' + textContent + '</h4>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-primary">確定</button>' +
                '<button type="button" class="btn btn-secondary">取消</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
            $('body').append(dialogModalTemplate);
            dialogModalTemplate = void 0;

            var isOK = false;
            var $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.remove();
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.remove();
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }
})();