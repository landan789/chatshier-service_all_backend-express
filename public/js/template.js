/// <reference path='../../typings/client/index.d.ts' />

(function() {
    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };
    let nowSelectAppId = '';

    /** @type {Chatshier.Models.AppsTemplates} */
    let appsTemplates = {};

    const NO_PERMISSION_CODE = '3.16';

    let $jqDoc = $(document);
    let api = window.restfulAPI;
    let userId;
    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    const TemplateBuilder = window.TemplateBuilder;
    let templateBuilder = new TemplateBuilder(document.getElementById('templateWrapper'));

    (function modelProcess() {
        const handleMessages = {
            working: '<i class="fas fa-circle-notch fa-spin"></i>處理中',
            addFinished: '新增',
            editFinished: '修改'
        };

        let $templateModal = $('#templateModal');
        $templateModal.on('click', '#insertTemplateBtn, #updateTemplateBtn', replaceTemplate);

        let $insertTemplateBtn = $templateModal.find('#insertTemplateBtn');
        let $updateTemplateBtn = $templateModal.find('#updateTemplateBtn');

        $templateModal.on('show.bs.modal', initTemplateModal);
        $templateModal.on('shown.bs.modal', () => templateBuilder && templateBuilder.updateSwiper());
        $templateModal.on('hide.bs.modal', function() {
            let modalAppId = $appSelector.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        function initTemplateModal(ev) {
            let $relatedBtn = $(ev.relatedTarget);

            if ($relatedBtn.hasClass('insert-btn')) {
                elementShow($appSelector.parents('.app-select-bar'));
                elementShow($insertTemplateBtn);
                elementHide($updateTemplateBtn);

                $appSelector.val(nowSelectAppId);
                $templateModal.find('#templateId').val('');
                templateBuilder.initTemplate();
                return;
            }

            elementHide($appSelector.parents('.app-select-bar'));
            elementHide($insertTemplateBtn);
            elementShow($updateTemplateBtn);

            let $templateRow = $relatedBtn.parents('tr');
            let appId = $templateRow.attr('app-id');
            let templateId = $templateRow.attr('template-id');
            $appSelector.val(appId);
            $templateModal.find('#templateId').val(templateId);

            let template = appsTemplates[appId].templates[templateId];
            $('#templateForm input[name="templateAltText"]').val(template.altText || '');
            templateBuilder.initTemplate(template);
        }

        function replaceTemplate() {
            let templateAltText = $('#templateForm input[name="templateAltText"]').val();
            if (!templateAltText) {
                $.notify('模板顯示文字不可為空', { type: 'warning' });
                return;
            }

            let appId = $appSelector.val();
            let templateId = $templateModal.find('#templateId').val();
            let isUpdate = !!templateId;
            let fileMoveTasks = [];

            elementDisabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, isUpdate ? handleMessages.addFinished : handleMessages.working);
            return templateBuilder.getTemplateJSON().then((templateMessage) => {
                templateMessage.altText = templateAltText;

                return Promise.resolve().then(() => {
                    if (templateMessage.template.thumbnailImageUrl instanceof File) {
                        let imageUrl = templateMessage.template.thumbnailImageUrl;
                        return api.image.uploadFile(userId, imageUrl).then((resJson) => {
                            let url = resJson.data.url;
                            templateMessage.template.thumbnailImageUrl = url;
                            fileMoveTasks.push(resJson.data.originalFilePath);
                            return templateMessage;
                        });
                    } else if (templateMessage.template.columns) {
                        let columns = templateMessage.template.columns;
                        let _columns = [];

                        let nextColumn = (i) => {
                            if (i >= columns.length) {
                                return Promise.resolve(_columns);
                            }

                            let column = columns[i];
                            if (column.thumbnailImageUrl instanceof File) {
                                let imageUrl = column.thumbnailImageUrl;
                                return api.image.uploadFile(userId, imageUrl).then((resJson) => {
                                    let url = resJson.data.url;
                                    column.thumbnailImageUrl = url;
                                    fileMoveTasks[i] = resJson.data.originalFilePath;
                                    _columns[i] = column;
                                    return nextColumn(i + 1);
                                });
                            }
                            _columns[i] = column;
                            return nextColumn(i + 1);
                        };

                        return nextColumn(0).then((_columns) => {
                            templateMessage.template.columns = _columns;
                            return templateMessage;
                        });
                    }
                    return templateMessage;
                });
            }).then((templateMessage) => {
                if (isUpdate) {
                    return api.appsTemplates.update(appId, templateId, userId, templateMessage);
                }
                return api.appsTemplates.insert(appId, userId, templateMessage);
            }).then((resJson) => {
                let _appsTemplates = resJson.data;
                if (!appsTemplates[appId]) {
                    appsTemplates[appId] = { templates: {} };
                }
                Object.assign(appsTemplates[appId].templates, _appsTemplates[appId].templates);
                let templateId = Object.keys(_appsTemplates[appId].templates).shift();

                return Promise.all(fileMoveTasks.map((fromPath) => {
                    let fileName = fromPath.split('/').pop();
                    let toPath = `/apps/${appId}/template/${templateId}/src/${fileName}`;
                    return api.image.moveFile(userId, fromPath, toPath);
                }));
            }).then(() => {
                $templateModal.modal('hide');
                $appDropdown.find('#' + appId).trigger('click');
                elementEnabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, isUpdate ? handleMessages.addFinished : handleMessages.working);
                $.notify(isUpdate ? '更新成功！' : '新增成功！', { type: 'success' });
            }).catch((err) => {
                elementEnabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, isUpdate ? handleMessages.addFinished : handleMessages.working);
                if (!err) {
                    return;
                }

                if (NO_PERMISSION_CODE === err.code) {
                    $templateModal.modal('hide');
                    return $.notify('無此權限', { type: 'danger' });
                }

                switch (err.message) {
                    case TemplateBuilder.ERRORS.TEMPLATES_EMPTY:
                        return $.notify('模板訊息內容不能為空', { type: 'warning' });
                    case TemplateBuilder.ERRORS.TITLE_AND_TEXT_IS_REQUIRED:
                        return $.notify('有附加圖像時，模板訊息必須要有標題及描述文字', { type: 'warning' });
                    case TemplateBuilder.ERRORS.TEXT_IS_REQUIRED:
                        return $.notify('每個模板訊息必須要有描述文字', { type: 'warning' });
                    case TemplateBuilder.ERRORS.AT_LEAST_ONE_ACTION:
                        return $.notify('每個模板訊息至少要設定 1 個按鈕動作', { type: 'warning' });
                    case TemplateBuilder.ERRORS.MUST_UPLOAD_A_IMAGE:
                        return $.notify('如果設置了圖片網址鏈接，則必須上傳圖片', { type: 'warning' });
                    case TemplateBuilder.ERRORS.INVALID_URL:
                        return $.notify('訊息中的設定連結，含有不合法的連結', { type: 'warning' });
                    default:
                        return $.notify('新增失敗', { type: 'danger' });
                }
            });
        }
    })();

    let $appDropdown = $('#appsDropdown');
    let $appSelector = $('#appSelector');

    $jqDoc.on('click', '.template-row .remove-btn', removeTemplate);

    return api.apps.findAll(userId).then(function(respJson) {
        let apps = respJson.data;
        let $dropdownMenu = $appDropdown.find('.dropdown-menu');
        let config = window.chatshier.config;
        $jqDoc.find('.insert-btn').attr('disabled', true);
        $('.template-image-warning').empty().text(`圖片大小不能超過${(Math.floor(config.imageFileMaxSize / (1024 * 1024)))}MB`);

        for (let appId in apps) {
            let app = apps[appId];

            // 目前只有 LINE 支援此功能
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
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            loadTemplates(nowSelectAppId, userId);
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $jqDoc.find('.insert-btn').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadTemplates(nowSelectAppId, userId);
    }

    function loadTemplates(appId, userId) {
        $('#template-tables').empty();
        if (!appsTemplates[appId]) {
            appsTemplates[appId] = { templates: {} };
        }

        return api.appsTemplates.findAll(appId, userId).then(function(resJson) {
            let _appsTemplates = resJson.data;
            if (!(_appsTemplates && _appsTemplates[appId])) {
                return;
            }
            Object.assign(appsTemplates[appId].templates, _appsTemplates[appId].templates);

            let templates = appsTemplates[appId].templates;
            for (let templateId in templates) {
                let template = templates[templateId];

                $('#template-tables').append(
                    '<tr class="template-row" app-id="' + appId + '" template-id="' + templateId + '">' +
                        '<th id="altText" data-title="data-title">' + template.altText + '</th>' +
                        '<td id="type">' + template.template.type + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" data-toggle="modal" data-target="#templateModal" aria-hidden="true"></button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );
            }
        });
    }

    function removeTemplate() {
        let $removeBtn = $(this);
        let $templateRow = $removeBtn.parents('tr');
        let appId = $templateRow.attr('app-id');
        let templateId = $templateRow.attr('template-id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsTemplates.remove(appId, templateId, userId);
        }).then(function(resJson) {
            if (resJson) {
                $('#' + templateId).remove();
                return $.notify('刪除成功！', { type: 'success' });
            }
            $.notify('取消刪除', { type: 'primary' });
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $.notify('失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
            }
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            let isOK = false;
            let $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').off('click').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.find('.btn-secondary').off('click').on('click', function() {
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }

    function elementDisabled(element, message) {
        element.attr('disabled', true).html(message);
    }

    function elementEnabled(element, message) {
        element.removeAttr('disabled').html(message);
    }

    function elementShow(element) {
        element.removeClass('d-none');
    }

    function elementHide(element) {
        element.addClass('d-none');
    }
})();
