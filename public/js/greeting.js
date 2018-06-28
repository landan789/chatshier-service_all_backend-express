/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var userId;
    var nowSelectAppId = '';
    var apps = {};
    var appsGreetings = {};

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

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

    $(document).on('click', '#modal-insert-btn', insertGreeting);
    $(document).on('click', '#modal-update-btn', updateGreeting);
    $(document).on('click', '#delete-btn', removeGretting);
    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    $modal.on('show.bs.modal', function(ev) {
        let $relatedBtn = $(ev.relatedTarget);
        $('#modal-greeting-id').val('');
        $('#modal-greeting-text').val('');

        if ('add-btn' === $relatedBtn.attr('id')) {
            $appSelector.val(nowSelectAppId);
            $('#modal-insert-btn').removeClass('d-none');
            $('#modal-update-btn').addClass('d-none');
            return;
        }

        $('#modal-insert-btn').addClass('d-none');
        $('#modal-update-btn').removeClass('d-none');

        let $greetingRow = $relatedBtn.parents('tr');
        let appId = $greetingRow.attr('rel');
        let greetingId = $greetingRow.attr('id');
        let greetingText = appsGreetings[appId].greetings[greetingId].text;
        $appSelector.val(appId);

        $(`[name="greeting-app-name"] option[value="${appId}"]`).attr('selected', true);
        $('#modal-greeting-id').val(greetingId);
        $('#modal-greeting-text').val(greetingText);
    });

    $modal.on('hidden.bs.modal', function() {
        let modalAppId = $appSelector.val();
        if (nowSelectAppId !== modalAppId) {
            $appDropdown.find('#' + modalAppId).trigger('click');
        }
    });

    function insertGreeting() {
        let appId = $appSelector.val();

        return Promise.resolve().then(() => {
            if (!appsGreetings[appId]) {
                if (!appsGreetings[appId]) {
                    appsGreetings[appId] = { greetings: {} };
                }

                return api.appsGreetings.findAll(appId, userId).then((resJson) => {
                    let _appsGreetings = resJson.data;
                    Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);
                });
            }
        }).then(() => {
            if (Object.keys(appsGreetings[appId].greetings).length >= 5) {
                return $.notify('訊息則數已達上限', { type: 'warning' });
            }

            let text = $('#modal-greeting-text').val();
            if (!text) {
                return $.notify('文字欄位不可空白', { type: 'warning' });
            }

            let greeting = {
                type: 'text',
                text: text
            };

            return api.appsGreetings.insert(appId, userId, greeting).then(function(resJson) {
                let _appsGreetings = resJson.data;
                Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);

                $appDropdown.find('#' + appId).trigger('click');
                $modal.modal('hide');
                return $.notify('新增成功', { type: 'success' });
            }).catch((err) => {
                $modal.modal('hide');
                if (undefined === err.status) {
                    return $.notify('新增失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === err.code) {
                    return $.notify('無此權限', { type: 'danger' });
                }
                return $.notify('新增失敗', { type: 'danger' });
            });
        });
    }

    function updateGreeting() {
        let appId = $appSelector.val();
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

    function removeGretting(ev) {
        let $removeBtn = $(this);
        let $greetingRow = $removeBtn.parents('tr');
        let appId = $greetingRow.attr('rel');
        let greetingId = $greetingRow.attr('id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            return api.appsGreetings.remove(appId, greetingId, userId).then(function() {
                $('#' + greetingId).remove();
                delete appsGreetings[appId].greetings[greetingId];
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

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadGreetings(nowSelectAppId, userId);
    }

    function loadGreetings(appId, userId) {
        $('#MsgCanvas').empty();

        return api.appsGreetings.findAll(appId, userId).then(function(resJson) {
            appsGreetings = resJson.data;

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
                }
            }
        });
    }

    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');
        $appSelector.empty();

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted ||
                app.type !== api.apps.enums.type.LINE) {
                delete apps[appId];
                continue;
            }

            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $('#add-btn').removeAttr('app-id').attr('app-id', nowSelectAppId);
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $(document).find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
            return loadGreetings(nowSelectAppId, userId);
        }
    });
})();
