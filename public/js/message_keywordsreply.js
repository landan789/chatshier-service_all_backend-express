/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var userId = '';
    var allKeywordreplyData = {};
    var api = window.restfulAPI;

    var $jqDoc = $(document);
    var $keywordreplyAddModal = $('#keywordreply_add_modal');
    var $keywordreplyEditModal = $('#keywordreply_edit_modal');
    var $openTableElem = null;
    var $draftTableElem = null;
    var $appSelector = null;

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;

        $jqDoc.on('click', '.tablinks', function switchTable(ev) {
            var targetTableId = $(this).attr('rel');
            $('#' + targetTableId).show().siblings().hide();
            $(ev.target).addClass('enabled').siblings().removeClass('enabled');
        });

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
            var targetData = allKeywordreplyData[appId].keywordreplies[keywordreplyId];

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
                    return loadKeywordsReplies();
                });
            });
        });
        // ==========

        $openTableElem = $('#keywordreply_open_table tbody');
        $draftTableElem = $('#keywordreply_draft_table tbody');
        return loadKeywordsReplies().then(function() {
            // 資料確定載入完成後才開放新增按鈕供使用者點擊
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled');
        });
    });

    function loadKeywordsReplies() {
        // 先取得使用者所有的 AppId 清單更新至本地端
        return api.chatshierApp.getAll(userId).then(function(resJson) {
            allKeywordreplyData = resJson.data;
            $openTableElem.empty();
            $draftTableElem.empty();

            for (var appId in allKeywordreplyData) {
                var keywordrepliesData = allKeywordreplyData[appId].keywordreplies;
                if (!keywordrepliesData) {
                    continue;
                }

                for (var keywordreplyId in keywordrepliesData) {
                    var keywordreplyData = keywordrepliesData[keywordreplyId];
                    if (keywordreplyData.isDeleted) {
                        continue;
                    }

                    var htmlTemplate =
                        '<tr id="' + keywordreplyId + '" title="' + appId + '">' +
                            '<td>' + keywordreplyData.keyword + '</td>' +
                            '<td>' + keywordreplyData.text + '</td>' +
                            '<td>' + keywordreplyData.replyCount + '</td>' +
                            '<td>' + allKeywordreplyData[appId].name + '</td>' +
                            '<td>' +
                                '<a class="btn-feature" data-toggle="modal" data-target="#keywordreply_edit_modal">編輯</a>' +
                                '<a class="btn-feature btn-row-delete">刪除</a>' +
                            '</td>' +
                        '</tr>';

                    if (!keywordreplyData.status) {
                        $draftTableElem.append(htmlTemplate);
                    } else {
                        $openTableElem.append(htmlTemplate);
                    }
                }
            }

            $jqDoc.find('td .btn-row-delete').off('click').on('click', function(event) {
                var targetRow = $(event.target).parent().parent();
                var appId = targetRow.prop('title');
                var keywordreplyId = targetRow.prop('id');

                return showDialog('確定要刪除嗎？').then(function(isOK) {
                    if (!isOK) {
                        return;
                    }

                    return api.keywordreply.remove(appId, keywordreplyId, userId).then(function() {
                        return loadKeywordsReplies();
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
            return loadKeywordsReplies();
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
