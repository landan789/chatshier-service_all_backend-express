/// <reference path='../../typings/client/index.d.ts' />

(function() {
    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };
    const TEMPLATE_TYPE_DISPLAY_TEXT = Object.freeze({
        'BUTTON': '單一按鈕',
        'BUTTON_IMAGE': '按鈕+圖片',
        'CAROUSEL': '輪播式卡片'
    });

    let nowSelectAppId = '';

    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsKeywordreplies} */
    let appsKeywordreplies = {};
    /** @type {Chatshier.Models.AppsImagemaps} */
    let appsImagemaps = {};
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

            let $templateForm = $templateModal.find('#templateForm');
            let $templateName = $templateForm.find('input[name="templateName"]');
            let $templateAltText = $templateForm.find('input[name="templateAltText"]');

            let $templateRow = $relatedBtn.parents('tr');
            let appId = (0 !== $templateRow.length && $templateRow.attr('app-id')) || nowSelectAppId;
            let templateId;
            let template;
            let app = apps[appId];
            $appSelector.val(appId);

            if ($relatedBtn.hasClass('insert-btn')) {
                elementShow($appSelector.parents('.app-select-bar'));
                elementShow($insertTemplateBtn);
                elementHide($updateTemplateBtn);

                $templateModal.find('#templateId').val('');
                $templateName.val('');
                $templateAltText.val('');
            } else {
                elementHide($appSelector.parents('.app-select-bar'));
                elementHide($insertTemplateBtn);
                elementShow($updateTemplateBtn);

                $templateRow = $relatedBtn.parents('tr');
                templateId = $templateRow.attr('template-id');
                $templateModal.find('#templateId').val(templateId);

                template = appsTemplates[appId].templates[templateId];
                $templateName.val(template.name || '');
                $templateAltText.val(template.altText || '');
            }

            if (api.apps.TYPES.FACEBOOK === app.type) {
                $templateAltText.parents('.form-group').addClass('d-none');
                templateBuilder.disableButtonAction(TemplateBuilder.BUTTON_ACTIONS.IMAGEMAP);
            } else {
                $templateAltText.parents('.form-group').removeClass('d-none');
                templateBuilder.enableButtonAction(TemplateBuilder.BUTTON_ACTIONS.IMAGEMAP);
            }

            return Promise.all([
                getKeywordreplies(appId),
                getImagemaps(appId),
                getTemplates(appId)
            ]).then(([ keywordreplies, imagemaps, templates ]) => {
                templateBuilder.keywordreplies = keywordreplies;
                templateBuilder.imagemaps = imagemaps;

                if (templateId && template) {
                    let _templates = Object.assign({}, templates);
                    delete _templates[templateId];
                    templateBuilder.templates = _templates;
                    templateBuilder.initTemplate(template);
                } else {
                    templateBuilder.templates = templates;
                    templateBuilder.initTemplate();
                }
            });
        }

        function replaceTemplate() {
            let $templateForm = $templateModal.find('#templateForm');
            let templateName = $templateForm.find('input[name="templateName"]').val();
            if (!templateName) {
                $.notify('範本名稱不可為空', { type: 'warning' });
                return;
            }

            let appId = $appSelector.val();
            let app = apps[appId];
            let templateAltText = $templateForm.find('input[name="templateAltText"]').val() || '';
            if (!templateAltText && api.apps.TYPES.LINE === app.type) {
                $.notify('範本訊息標題文字不可為空', { type: 'warning' });
                return;
            }

            let templateId = $templateModal.find('#templateId').val();
            let isUpdate = !!templateId;
            let fileMoveTasks = [];

            elementDisabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, handleMessages.working);
            return templateBuilder.getTemplateJSON().then((templateMessage) => {
                templateMessage.name = templateName;
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
                elementEnabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, isUpdate ? handleMessages.editFinished : handleMessages.addFinished);
                $.notify(isUpdate ? '更新成功！' : '新增成功！', { type: 'success' });
            }).catch((err) => {
                elementEnabled(isUpdate ? $updateTemplateBtn : $insertTemplateBtn, isUpdate ? handleMessages.editFinished : handleMessages.addFinished);
                if (!err) {
                    return;
                }

                if (NO_PERMISSION_CODE === err.code) {
                    $templateModal.modal('hide');
                    return $.notify('無此權限', { type: 'danger' });
                }

                switch (err.message) {
                    case TemplateBuilder.ERRORS.TEMPLATES_EMPTY:
                        return $.notify('範本訊息內容不能為空', { type: 'warning' });
                    case TemplateBuilder.ERRORS.TITLE_AND_TEXT_IS_REQUIRED:
                        return $.notify('有附加圖像時，範本訊息必須要有標題及描述文字', { type: 'warning' });
                    case TemplateBuilder.ERRORS.TEXT_IS_REQUIRED:
                        return $.notify('每個範本訊息必須要有描述文字', { type: 'warning' });
                    case TemplateBuilder.ERRORS.IMAGE_IS_REQUIRED:
                        return $.notify('當其中一個卡片有設定圖像時，所以卡片均需設定圖像', { type: 'warning' });
                    case TemplateBuilder.ERRORS.AT_LEAST_ONE_ACTION:
                        return $.notify('每個範本訊息至少要設定 1 個按鈕動作', { type: 'warning' });
                    case TemplateBuilder.ERRORS.MUST_UPLOAD_A_IMAGE:
                        return $.notify('如果設置了圖片網址鏈接，則必須上傳圖片', { type: 'warning' });
                    case TemplateBuilder.ERRORS.INVALID_URL:
                        return $.notify('訊息中的設定連結，含有不合法的連結', { type: 'warning' });
                    case TemplateBuilder.ERRORS.ACTIONS_COUNT_SHOULD_SAME:
                        return $.notify('使用多個範本卡片時，設定的動作按鈕數量必須一致', { type: 'warning' });
                    case TemplateBuilder.ERRORS.HAS_UNCHECKED_ACTION:
                        return $.notify('你有尚未完成的按鈕編輯', { type: 'warning' });
                    default:
                        return $.notify(isUpdate ? '更新失敗！' : '新增失敗！', { type: 'danger' });
                }
            });
        }
    })();

    let $appDropdown = $('#appsDropdown');
    let $appSelector = $('#appSelector');
    let $templateTable = $('#templateTable');

    $jqDoc.on('click', '.template-row .remove-btn', removeTemplate);

    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;
        let $dropdownMenu = $appDropdown.find('.dropdown-menu');
        let config = window.chatshier.config;
        $jqDoc.find('.insert-btn').attr('disabled', true);
        $('.template-image-warning').empty().text(`圖片大小不能超過${(Math.floor(config.imageFileMaxSize / (1024 * 1024)))}MB`);

        for (let appId in apps) {
            let app = apps[appId];

            if (app.isDeleted ||
                app.type === api.apps.TYPES.CHATSHIER) {
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
            loadTemplates(nowSelectAppId);
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $jqDoc.find('.insert-btn').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadTemplates(nowSelectAppId);
    }

    function getKeywordreplies(appId) {
        return Promise.resolve().then(() => {
            if (!appsKeywordreplies[appId]) {
                return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
                    let _appsKeywordreplies = resJson.data;
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                    if (!(_appsKeywordreplies && _appsKeywordreplies[appId])) {
                        return appsKeywordreplies[appId].keywordreplies;
                    }
                    Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);
                    return appsKeywordreplies[appId].keywordreplies;
                });
            }
            return appsKeywordreplies[appId].keywordreplies;
        });
    }

    function getImagemaps(appId) {
        return Promise.resolve().then(() => {
            if (!appsImagemaps[appId]) {
                return api.appsImagemaps.findAll(appId, userId).then((resJson) => {
                    let _appsImagemaps = resJson.data;
                    appsImagemaps[appId] = { imagemaps: {} };
                    if (!(_appsImagemaps && _appsImagemaps[appId])) {
                        return appsImagemaps[appId].imagemaps;
                    }
                    Object.assign(appsImagemaps[appId].imagemaps, _appsImagemaps[appId].imagemaps);
                    return appsImagemaps[appId].imagemaps;
                });
            }
            return appsImagemaps[appId].imagemaps;
        });
    }

    function getTemplates(appId) {
        return Promise.resolve().then(() => {
            if (!appsTemplates[appId]) {
                return api.appsTemplates.findAll(appId, userId).then((resJson) => {
                    let _appsTemplates = resJson.data;
                    appsTemplates[appId] = { templates: {} };
                    if (!(_appsTemplates && _appsTemplates[appId])) {
                        return appsTemplates[appId].templates;
                    }
                    Object.assign(appsTemplates[appId].templates, _appsTemplates[appId].templates);
                    return appsTemplates[appId].templates;
                });
            }
            return appsTemplates[appId].templates;
        });
    }

    function loadTemplates(appId) {
        let $templateTableBody = $templateTable.find('tbody').empty();
        let app = apps[appId];

        let $colOfAltText = $templateTable.find('#colOfAltText');
        if (app.type === api.apps.TYPES.LINE) {
            $colOfAltText.removeClass('d-none');
        } else {
            $colOfAltText.addClass('d-none');
        }

        return getTemplates(appId).then(function(templates) {
            for (let templateId in templates) {
                let template = templates[templateId];
                let templateName = template.name || '未命名';

                let displayType = '';
                if ('buttons' === template.template.type) {
                    if (template.template.thumbnailImageUrl) {
                        displayType = 'BUTTON_IMAGE';
                    } else {
                        displayType = 'BUTTON';
                    }
                } else if ('carousel' === template.template.type && template.template.columns) {
                    displayType = 'CAROUSEL';
                }

                $templateTableBody.append(
                    '<tr class="template-row" app-id="' + appId + '" template-id="' + templateId + '">' +
                        '<td data-title="' + templateName + '">' + templateName + '</td>' +
                        (app.type === api.apps.TYPES.LINE ? '<td data-title="' + template.altText + '">' + template.altText + '</td>' : '') +
                        '<td>' + (TEMPLATE_TYPE_DISPLAY_TEXT[displayType] || '未知版型') + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" data-toggle="modal" data-backdrop="static" data-target="#templateModal" aria-hidden="true"></button>' +
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
