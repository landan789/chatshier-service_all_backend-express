/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var rowCount = 0;
    var userId;
    var nowSelectAppId = '';
    var appsData = {};
    var findedGreetingIds = {};

    const api = window.restfulAPI;
    const NO_PERMISSION_CODE = '3.16';

    const $appDropdown = $('.app-dropdown');
    const $modal = $('#greeting_modal');
    const $appSelector = $('.modal-body select[name="greeting-app-name"]');

    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $(document).on('click', '#add-btn', turnOnAddModal);
    $(document).on('click', '#modal-insert-btn', insertGreeting);
    $(document).on('click', '#edit-btn', turnOnEdit);
    $(document).on('click', '#modal-update-btn', updateGreeting);
    $(document).on('click', '#delete-btn', removeGretting);

    $modal.on('show.bs.modal', function() {
        $appSelector.empty();
        for (var appId in appsData) {
            var app = appsData[appId];
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
        }
    });

    $modal.on('hidden.bs.modal', function() {
        $('#modal-insert-btn').removeClass('d-none');
        $('#modal-update-btn').removeClass('d-none');
        $('#modal-greeting-text').val('');
        $('#modal-greeting-id').val('');
    });

    function turnOnAddModal() {
        $('#modal-update-btn').addClass('d-none');
    }

    function insertGreeting() {
        if (rowCount >= 5) {
            return $.notify('訊息則數已達上限', { type: 'warning' });
        }
        rowCount++;
        let appId = $appSelector.find('option:selected').val();
        let text = $('#modal-greeting-text').val();
        if (!text) {
            return $.notify('文字欄位不可空白', { type: 'warning' });
        }
        let greeting = {
            type: 'text',
            text
        };
        return api.appsGreetings.insert(appId, userId, greeting).then(function(resJson) {
            let greeting = resJson.data[appId].greetings;
            let greetingId = Object.keys(greeting)[0];
            findedGreetingIds[greetingId] = greetingId;
            $appDropdown.find('#' + appId).click();
            $modal.modal('hide');
            return $.notify('新增成功', { type: 'success' });
        }).catch((resJson) => {
            $modal.modal('hide');
            if (undefined === resJson.status) {
                return $.notify('新增失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                return $.notify('無此權限', { type: 'danger' });
            }
            return $.notify('新增失敗', { type: 'danger' });
        });
    }

    function turnOnEdit() {
        $('#modal-insert-btn').addClass('d-none');
        let appId = $(this).parent().parent().attr('rel');
        let greetingId = $(this).parent().parent().attr('id');
        let text = $(this).parent().siblings('td:first').text();
        $(`[name="greeting-app-name"] option[value="${appId}"]`).attr('selected', true);
        $('#modal-greeting-id').val(greetingId);
        $('#modal-greeting-text').val(text);
    }

    function updateGreeting() {
        let appId = $appSelector.find('option:selected').val();
        let greetingId = $('#modal-greeting-id').val();
        let text = $('#modal-greeting-text').val();
        if ('' === text.trim()) {
            return $.notify('請填入文字內容', { type: 'warning' });
        }
        let greeting = {
            type: 'text',
            text
        };
        return api.appsGreetings.update(appId, greetingId, userId, greeting).then((resJson) => {
            let appsgreetings = resJson.data;
            let modifiedText = appsgreetings[appId].greetings[greetingId].text;
            $(`#${greetingId}[rel=${appId}]`).find('td:first').text(modifiedText);
            $modal.modal('hide');
            return $.notify('修改成功', { type: 'success' });
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                return $.notify('修改失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                return $.notify('無此權限', { type: 'danger' });
            }
            return $.notify('修改失敗', { type: 'danger' });
        });
    }

    function removeGretting() {
        let appId = $(this).parent().parent().attr('rel');
        let greetingId = $(this).parent().parent().attr('id');
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsGreetings.remove(appId, greetingId, userId).then(function(resJson) {
                $('#' + greetingId).remove();
                delete findedGreetingIds[greetingId];
                rowCount--;
                return $.notify('刪除成功', { type: 'success' });
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    return $.notify('刪除失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    return $.notify('無此權限', { type: 'danger' });
                }

                return $.notify('刪除失敗', { type: 'danger' });
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

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        findedGreetingIds = {};
        loadGreetings(nowSelectAppId, userId);
    }

    function loadGreetings(appId, userId) {
        $('#MsgCanvas').empty();
        rowCount = 0;
        return api.appsGreetings.findAll(appId, userId).then(function(resJson) {
            let appsGreetings = resJson.data;
            if (appsGreetings && appsGreetings[appId]) {
                let greeting = appsGreetings[appId].greetings;
                for (let greetingId in greeting) {
                    $('table #MsgCanvas').append(
                        '<tr id="' + greetingId + '" rel="' + appId + '">' +
                            '<td class="text-pre">' + greeting[greetingId].text + '</td>' +
                            '<td>' + new Date(greeting[greetingId].createdTime).toLocaleString() + '</td>' +
                            '<td>' +
                                '<button type="button" class="mb-1 mr-1 btn btn-light btn-border check" id="edit-btn" data-toggle="modal" data-target="#greeting_modal" aria-hidden="true"><i class="fas fa-edit update"></i></button>' +
                                '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>' +
                            '</td>' +
                        '</tr>'
                    );

                    rowCount++;
                    findedGreetingIds[greetingId] = greetingId;
                }
            }
        });
    }

    return api.apps.findAll(userId).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a class="dropdown-item" id="' + appId + '">' + app.name + '</a></li>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $('#add-btn').removeAttr('app-id').attr('app-id', nowSelectAppId);
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadGreetings(nowSelectAppId, userId);
            $(document).find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });
})();
