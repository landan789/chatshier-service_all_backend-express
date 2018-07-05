/// <reference path='../../typings/client/index.d.ts' />

(function() {
    let nowSelectAppId = '';
    let apps = {};
    let appsGreetings = {};

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    const api = window.restfulAPI;
    const NO_PERMISSION_CODE = '3.16';
    const $appDropdown = $('.app-dropdown');

    let userId;
    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $(document).on('click', '.btn.remove', removeGretting);
    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    // 封裝 modal 的處理
    (function() {
        let $greetingModal = $('#greetingModal');
        $greetingModal.on('click', '#modalInsertBtn', insertGreeting);
        $greetingModal.on('click', '#modalUpdateBtn', updateGreeting);

        let $modalAppSelect = $greetingModal.find('#greetingAppId');
        let ReplyMessageSelector = window.ReplyMessageSelector;
        let replyMessageSelect = new ReplyMessageSelector($greetingModal.find('#rowOfAppSelect').get(0));
        replyMessageSelect.userId = userId;

        let modalAppId;
        let modalGreetingId;
        /** @type {Chatshier.Models.Greeting} */
        let modalGreeting;

        replyMessageSelect.onReplyItemChange = function(replyType) {
            if (!modalGreeting) {
                return;
            }

            'text' === replyType && modalGreeting.text && replyMessageSelect.setMessageText(modalGreeting.text);
            'image' === replyType && modalGreeting.src && replyMessageSelect.setImageSrc(modalGreeting.src);
            'imagemap' === replyType && modalGreeting.imagemap_id && replyMessageSelect.setImageMap(modalGreeting.imagemap_id);
            'template' === replyType && modalGreeting.template_id && replyMessageSelect.setTemplate(modalGreeting.template_id);
        };

        $modalAppSelect.on('change', function() {
            replyMessageSelect.appId = modalAppId = $modalAppSelect.val();
            replyMessageSelect.reset();
        });

        $greetingModal.on('show.bs.modal', function(ev) {
            let $relatedBtn = $(ev.relatedTarget);
            let $modalInsertBtn = $greetingModal.find('#modalInsertBtn');
            let $modalUpdateBtn = $greetingModal.find('#modalUpdateBtn');

            if ($relatedBtn.hasClass('btn-insert')) {
                $modalAppSelect.empty();
                for (let _appId in apps) {
                    let app = apps[_appId];
                    $modalAppSelect.append('<option value="' + _appId + '">' + app.name + '</option>');
                }

                modalAppId = nowSelectAppId;
                $modalAppSelect.val(nowSelectAppId).parents('.form-group').removeClass('d-none');

                $modalInsertBtn.removeClass('d-none');
                $modalUpdateBtn.addClass('d-none');
                return;
            }

            $modalInsertBtn.addClass('d-none');
            $modalUpdateBtn.removeClass('d-none');

            let $greetingRow = $relatedBtn.parents('tr');
            modalAppId = $greetingRow.attr('app-id') || '';
            modalGreetingId = $greetingRow.attr('greeting-id') || '';
            modalGreeting = appsGreetings[modalAppId].greetings[modalGreetingId];
            $modalAppSelect.val(modalAppId).parents('.form-group').addClass('d-none');

            replyMessageSelect.appId = modalAppId;
            replyMessageSelect.reset(modalGreeting.type);
        });

        $greetingModal.on('hide.bs.modal', function() {
            let modalAppId = $modalAppSelect.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        function insertGreeting() {
            let appId = modalAppId;
            let filePath = '';

            let $modalInsertBtn = $greetingModal.find('#modalInsertBtn');
            $modalInsertBtn.attr('disabled', true);

            return Promise.resolve().then(() => {
                if (!appsGreetings[appId]) {
                    return api.appsGreetings.findAll(appId, userId).then((resJson) => {
                        let _appsGreetings = resJson.data;
                        appsGreetings[appId] = { greetings: {} };
                        if (!_appsGreetings[appId]) {
                            return;
                        }
                        Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);
                    });
                }
            }).then(() => {
                if (Object.keys(appsGreetings[appId].greetings).length >= 5) {
                    $.notify('訊息則數已達上限', { type: 'warning' });
                    return;
                }
                return replyMessageSelect.getJSON();
            }).then((json) => {
                if (!json) {
                    return;
                }

                if ('text' === json.type && !json.text) {
                    return $.notify('文字欄位不可空白', { type: 'warning' });
                } else if ('image' === json.type && !json.src) {
                    return $.notify('必須上傳回覆圖像', { type: 'warning' });
                } else if ('imagemap' === json.type && !json.imagemap_id) {
                    return $.notify('必須設定一個圖文訊息', { type: 'warning' });
                } else if ('template' === json.type && !json.template_id) {
                    return $.notify('必須設定一個模板訊息', { type: 'warning' });
                }

                filePath = json.originalFilePath;
                let postGreeting = Object.assign({}, json);
                delete postGreeting.originalFilePath;

                return api.appsGreetings.insert(appId, userId, postGreeting).then(function(resJson) {
                    let _appsGreetings = resJson.data;
                    if (!appsGreetings[appId]) {
                        appsGreetings[appId] = { greetings: {} };
                    }
                    Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);

                    let greetingId = Object.keys(appsGreetings[appId].greetings).shift() || '';
                    if (filePath && greetingId) {
                        let fileName = filePath.split('/').pop();
                        let toPath = '/apps/' + appId + '/greetings/' + greetingId + '/src/' + fileName;
                        return api.image.moveFile(userId, filePath, toPath);
                    }
                }).then(() => {
                    $modalInsertBtn.removeAttr('disabled');
                    $greetingModal.modal('hide');
                    $.notify('新增成功', { type: 'success' });
                    return loadGreetings(appId, userId);
                });
            }).catch((err) => {
                $modalInsertBtn.removeAttr('disabled');
                if (NO_PERMISSION_CODE === err.code) {
                    $.notify('無此權限', { type: 'danger' });
                } else {
                    $.notify('新增失敗', { type: 'danger' });
                }
            });
        }

        function updateGreeting() {
            let appId = modalAppId;
            let greetingId = modalGreetingId;
            let filePath = '';

            return replyMessageSelect.getJSON().then((json) => {
                if (!json) {
                    return;
                }

                if ('text' === json.type && !json.text) {
                    return $.notify('文字欄位不可空白', { type: 'warning' });
                } else if ('image' === json.type && !json.src) {
                    return $.notify('必須上傳回覆圖像', { type: 'warning' });
                } else if ('imagemap' === json.type && !json.imagemap_id) {
                    return $.notify('必須設定一個圖文訊息', { type: 'warning' });
                } else if ('template' === json.type && !json.template_id) {
                    return $.notify('必須設定一個模板訊息', { type: 'warning' });
                }

                filePath = json.originalFilePath;
                let putGreeting = Object.assign({}, modalGreeting, json);
                delete putGreeting.originalFilePath;

                return api.appsGreetings.update(appId, greetingId, userId, putGreeting).then((resJson) => {
                    let _appsGreetings = resJson.data;
                    Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);

                    let greetingId = Object.keys(appsGreetings[appId].greetings).shift() || '';
                    if (filePath && greetingId) {
                        let fileName = filePath.split('/').pop();
                        let toPath = '/apps/' + appId + '/greetings/' + greetingId + '/src/' + fileName;
                        return api.image.moveFile(userId, filePath, toPath);
                    }
                }).then(() => {
                    $greetingModal.modal('hide');
                    $.notify('修改成功', { type: 'success' });
                    return loadGreetings(appId, userId);
                });
            }).catch((resJson) => {
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                } else {
                    $.notify('修改失敗', { type: 'danger' });
                }
            });
        }
    })();

    function removeGretting(ev) {
        let $removeBtn = $(this);
        let $greetingRow = $removeBtn.parents('tr');
        let appId = $greetingRow.attr('app-id');
        let greetingId = $greetingRow.attr('greeting-id');

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

            let isOK = false;
            let $dialogModal = $('#dialog_modal');

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
        return Promise.resolve().then(() => {
            if (!appsGreetings[appId]) {
                return api.appsGreetings.findAll(appId, userId).then((resJson) => {
                    let _appsGreetings = resJson.data;
                    appsGreetings[appId] = { greetings: {} };
                    if (!_appsGreetings[appId]) {
                        return appsGreetings[appId].greetings;
                    }
                    Object.assign(appsGreetings[appId].greetings, _appsGreetings[appId].greetings);
                    return appsGreetings[appId].greetings;
                });
            }
            return appsGreetings[appId].greetings;
        }).then((greetings) => {
            let $greetingsBody = $('#greetingsBody').empty();

            for (let greetingId in greetings) {
                let greeting = greetings[greetingId];

                $greetingsBody.append(
                    '<tr app-id="' + appId + '" greeting-id="' + greetingId + '">' +
                        (function() {
                            if ('text' === greeting.type) {
                                return '<td class="text-pre" data-title="' + greeting.text + '">' + greeting.text + '</td>';
                            } else if ('image' === greeting.type) {
                                return (
                                    '<td class="text-pre">' +
                                        '<label>圖像</label>' +
                                        '<div class="position-relative image-container" style="width: 6rem; height: 6rem;">' +
                                            '<img class="image-fit" src="' + greeting.src + '" alt="" />' +
                                        '</div>' +
                                    '</td>'
                                );
                            } else if ('imagemap' === greeting.type) {
                                return '<td class="text-pre" data-title="圖文訊息">圖文訊息</td>';
                            } else if ('template' === greeting.type) {
                                return '<td class="text-pre" data-title="模板訊息">模板訊息</td>';
                            }
                            return '<td class="text-pre" data-title=""></td>';
                        })() +
                        '<td>' + new Date(greetings[greetingId].createdTime).toLocaleString() + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-light btn-border update" data-toggle="modal" data-target="#greetingModal" aria-hidden="true">' +
                                '<i class="fas fa-edit"></i>' +
                            '</button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger remove">' +
                                '<i class="fas fa-trash-alt"></i>' +
                            '</button>' +
                        '</td>' +
                    '</tr>'
                );
            }
        });
    }

    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;
        let $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (let appId in apps) {
            let app = apps[appId];
            if (app.isDeleted ||
                app.type !== api.apps.TYPES.LINE) {
                delete apps[appId];
                continue;
            }

            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            let $insertBtn = $('#insertBtn');
            $insertBtn.attr('app-id', nowSelectAppId).removeAttr('disabled');
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            return loadGreetings(nowSelectAppId, userId);
        }
    });
})();
