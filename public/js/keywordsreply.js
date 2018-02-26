/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var userId = '';
    var nowSelectAppId = '';
    var appsData = {};
    var keywordrepliesData = {};
    var api = window.restfulAPI;

    var $jqDoc = $(document);
    var $keywordreplyAddModal = $('#keywordreply_add_modal');
    var $keywordreplyEditModal = $('#keywordreply_edit_modal');
    var $appDropdown = $('.app-dropdown');
    var $searchBar = $('.search-bar');

    var $openTableElem = null;
    var $draftTableElem = null;
    var $appSelector = null;

    const unpermittedCode = '3.16';

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;

        $searchBar.on('change paste keyup', function() {
            let searchText = $(this).val().toLocaleLowerCase();
            if (!searchText) {
                $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().removeAttr('style');
                return;
            }
            $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().css('display', 'none');
        });
        // ==========
        // 設定關鍵字新增 modal 相關 element 與事件
        $appSelector = $keywordreplyAddModal.find('.modal-body select[name="keywordreply-app-name"]');
        $keywordreplyAddModal.on('show.bs.modal', function() {
            $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val('');
            $keywordreplyAddModal.find('textarea[name="keywordreply-text"]').val('');
            $keywordreplyAddModal.find('input[name="keywordreply-is-draft"]').prop('checked', false);
            // 新增 modal 即將顯示事件發生時，將 App 清單更新
            $appSelector.empty();
            for (var appId in appsData) {
                var app = appsData[appId];
                $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
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
                $keywordreplyEditModal.find('button.btn-update-submit').attr('disabled', 'disabled');
                targetData.keyword = $editForm.find('input[name="keywordreply-keyword"]').val();
                targetData.text = $editForm.find('textarea[name="keywordreply-text"]').val();
                targetData.status = $editForm.find('input[name="keywordreply-is-draft"]').prop('checked') ? 0 : 1;
                targetData.updatedTime = Date.now();

                return api.keywordreply.update(appId, keywordreplyId, userId, targetData).then(function() {
                    $keywordreplyEditModal.modal('hide');
                    $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                    return loadKeywordsReplies(appId, userId);
                }).catch((resJson) => {
                    if (undefined === resJson.status) {
                        $keywordreplyEditModal.modal('hide');
                        $.notify('失敗', { type: 'danger' });
                        $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                        return loadKeywordsReplies(appId, userId);
                    }
                    if (unpermittedCode === resJson.code) {
                        $keywordreplyEditModal.modal('hide');
                        $.notify('無此權限', { type: 'danger' });
                        $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                        return loadKeywordsReplies(appId, userId);
                    }
                });
            });
        });
        // ==========

        $openTableElem = $('#keywordreply_open_table tbody');
        $draftTableElem = $('#keywordreply_draft_table tbody');
        return api.app.getAll(userId);
    }).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.app.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a id="' + appId + '">' + app.name + '</a></li>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadKeywordsReplies(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
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
        return api.keywordreply.getAll(userId, appId).then(function(resJson) {
            keywordrepliesData = resJson.data;
            $openTableElem.empty();
            $draftTableElem.empty();

            for (var keywordreplyId in keywordrepliesData) {
                var keywordreplyData = keywordrepliesData[keywordreplyId];
                if (keywordreplyData.isDeleted) {
                    continue;
                }

                var list = new TableObj();
                var keyword = list.th.attr('data-title', keywordreplyData.keyword).text(keywordreplyData.keyword);
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
                    }).catch((resJson) => {
                        if (undefined === resJson.status) {
                            $.notify('失敗', { type: 'danger' });
                        }
                        if (unpermittedCode === resJson.code) {
                            $.notify('無此權限', { type: 'danger' });
                        }
                    });
                });
            });
        });
    }

    function insertSubmit() {
        $keywordreplyAddModal.find('button.btn-insert-submit').attr('disabled', 'disabled');
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
            $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
            return loadKeywordsReplies(appId, userId);
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $keywordreplyAddModal.modal('hide');
                $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
                $.notify('失敗', { type: 'danger' });
                return loadKeywordsReplies(appId, userId);
            }
            if (unpermittedCode === resJson.code) {
                $keywordreplyAddModal.modal('hide');
                $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return loadKeywordsReplies(appId, userId);
            }
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
})();