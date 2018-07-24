/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;

    /** @type {Chatshier.Models.Apps} */
    var apps = {};
    /** @type {Chatshier.Models.AppsKeywordreplies} */
    var appsKeywordreplies = {};
    /** @type {Chatshier.Models.AppsRichmenus} */
    var appsRichmenus = {};
    /** @type {Chatshier.Models.AppsTemplates} */
    var appsTemplates = {};

    var nowSelectAppId = '';
    var size = {};

    /** @type {File} */
    var imageFile;

    const NO_PERMISSION_CODE = '3.16';
    const BOT_UPLOAD_IMAGE_TOO_LARGE = '19.2';
    const BOT_MENU_IMAGE_FAILED_TO_FIND = '8.62';

    const handleMessages = {
        working: '<i class="mr-1 fas fa-circle-notch fa-spin fa-fw"></i>處理中',
        addFinished: '新增',
        editFinished: '修改'
    };

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    const ACTION_TYPES = Object.freeze({
        TEXT: 'text',
        URI: 'uri',
        TEMPLATE: 'template',
        RICHMENU: 'richmenu',
        CONSUMER_FORM: 'consumerForm',
        DONATION: 'donation'
    });

    const POSTBACK_DATA_TYPES = Object.freeze({
        CHANGE_RICHMENU: 'CHANGE_RICHMENU',
        SEND_TEMPLATE: 'SEND_TEMPLATE',
        SEND_CONSUMER_FORM: 'SEND_CONSUMER_FORM',
        PAYMENT_CONFIRM: 'PAYMENT_CONFIRM'
    });

    elementHide($('.action-input'));
    elementHide($('.content-input'));
    $jqDoc.on('click', '#remove-btn', removeRichmenu);
    $jqDoc.on('click', '.activate-btn', activateRichmenu);
    $jqDoc.on('click', '.deactivate-btn', deactivateRichmenu);
    $jqDoc.on('click', '.set-default-btn', setDefaultRichmenu);
    // 停用所有 form 的提交
    $jqDoc.on('submit', 'form', function(ev) { return ev.preventDefault(); });

    (function modalProcess() {
        var $modal = $('#richmenu-modal');
        $modal.on('change', '.image-ghost', uploadImage);
        $modal.on('click', '.box', onClickActionBox);
        $modal.on('click', '#modal-save', insertRichmenu); // add richmenu, not activated.
        $modal.on('click', '#add-btn', cleanModal); // cleaning the options in modal.
        $modal.on('click', 'input[name="richmenu-form"]', photoFormShow);
        $modal.on('click', '.uri-input .dropdown-item', onUriPrefixChange);
        $modal.on('input', '.action-content .content-input', onActionDataChange);
        $modal.on('click', '.action-input .action-item ', onActionTypeChange);
        $modal.on('change', '.action-input .keyword-select', onKeywordSelect);

        var $richmenuForm = $modal.find('.richmenu-form');
        var $actionInputs = $modal.find('.action-inputs');

        $modal.on('show.bs.modal', function(ev) {
            let $relatedBtn = $(ev.relatedTarget);
            $('#keyword').empty();
            imageFile = void 0;
            cleanModal();

            if ('add-btn' === $relatedBtn.attr('id')) {
                $appSelector.val(nowSelectAppId);
                $appSelector.parents('.form-group').removeClass('d-none');
                $modal.find('#richmenuId').val('');
                return;
            }

            $appSelector.parents('.form-group').addClass('d-none');
            let $richmenuRow = $relatedBtn.parents('tr');
            let appId = $richmenuRow.attr('rel');
            let richmenuId = $richmenuRow.attr('id');
            let src;
            $appSelector.val(appId);
            $modal.find('#richmenuId').val(richmenuId);

            elementHide($('#modal-save'));
            elementShow($('#modal-update-save'));
            $modal.find('#modal-update-save').off('click').on('click', () => updateRichmenu(appId, richmenuId));

            return Promise.resolve().then(() => {
                let richmenu = appsRichmenus[appId] ? appsRichmenus[appId].richmenus[richmenuId] : void 0;
                if (!richmenu) {
                    return api.appsRichmenus.findOne(appId, richmenuId, userId).then((resJson) => {
                        let _appsRichmenus = resJson.data;
                        if (!appsRichmenus[appId]) {
                            appsRichmenus[appId] = { richmenus: {} };
                        }
                        let richmenus = _appsRichmenus[appId].richmenus;
                        Object.assign(appsRichmenus[appId].richmenus, richmenus);
                        richmenu = richmenus[richmenuId];
                        return richmenu;
                    });
                }
                return richmenu;
            }).then((richmenu) => {
                let areas = richmenu.areas;
                let photoForm = richmenu.form;
                size = richmenu.size;
                src = richmenu.src;

                $richmenuForm.find('.richmenu-select').val(richmenu.selected + '');
                $richmenuForm.find('input[name="richmenuName"]').val(richmenu.name);
                $richmenuForm.find('input[name="chatbarText"]').val(richmenu.chatBarText);
                $richmenuForm.find('input[value=' + photoForm + ']').prop('checked', true);

                richmenu.src && $('.show-richmenu-form')
                    .css('background', 'url(' + richmenu.src + ') center no-repeat')
                    .css('background-size', '100% 100%');

                photoFormShow();

                let $showRichmenuForm = $richmenuForm.find('.show-richmenu-form');
                let $boxes = $showRichmenuForm.find('.box');

                $boxes.each(function(i) {
                    let $box = $($boxes[i]);
                    let action = areas[i].action || {};
                    let actionType = '';
                    let actionData = 'string' === typeof action.data && action.data.startsWith('{') ? JSON.parse(action.data) : {};

                    switch (action.type) {
                        case 'postback':
                            if (action.data.indexOf('{') < 0) {
                                break;
                            }

                            let actionJson = JSON.parse(action.data);
                            if (POSTBACK_DATA_TYPES.CHANGE_RICHMENU === actionJson.action) {
                                actionType = ACTION_TYPES.RICHMENU;
                            } else if (POSTBACK_DATA_TYPES.SEND_TEMPLATE === actionJson.action) {
                                actionType = ACTION_TYPES.TEMPLATE;
                            } else if (POSTBACK_DATA_TYPES.SEND_CONSUMER_FORM === actionJson.action) {
                                actionType = ACTION_TYPES.CONSUMER_FORM;
                            } else if (POSTBACK_DATA_TYPES.PAYMENT_CONFIRM === actionJson.action) {
                                actionType = ACTION_TYPES.DONATION;
                            }
                            break;
                        case 'uri':
                            actionType = ACTION_TYPES.URI;
                            actionData.uri = action.uri;
                            break;
                        default:
                            actionType = ACTION_TYPES.TEXT;
                            actionData.text = action.text;
                            break;
                    }

                    $box.addClass('marked');
                    $box.attr('action-type', actionType);
                    $box.data('action', actionData);
                });
            });
        });

        $modal.on('hide.bs.modal', function() {
            let modalAppId = $appSelector.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        function cleanModal() {
            elementShow($('#modal-save'));
            elementHide($('#modal-update-save'));
            elementEnabled($('#modal-save'), handleMessages.addFinished);
            elementEnabled($('#modal-update-save'), handleMessages.editFinished);

            $modal.find('textarea').val('');
            $modal.find('input[type="text"]').val('');
            $modal.find('input[type="url"]').val('');

            let $showRichmenuForm = $modal.find('.show-richmenu-form');
            $showRichmenuForm.removeAttr('style');
            $showRichmenuForm.css('background-color', '#CBCBCB');
            $showRichmenuForm.empty();

            $modal.find('input[value="form1"]').prop('checked', true);
            $modal.find('input[name="content"]').prop('checked', false);
            photoFormShow();
        }

        function uploadImage() {
            let input = this;
            let reader = new FileReader();
            if (!input.files.length) {
                input.value = '';
                return;
            }

            /** @type {File} */
            let file = input.files[0];
            input.value = ''; // 把 input file 值清空，使 change 事件對同一檔案可重複觸發

            let config = window.CHATSHIER.CONFIG;
            if (file.type.indexOf('image') < 0) {
                $('#modal-save').removeAttr('disabled');
                $('#modal-update-save').removeAttr('disabled');
                $.notify('請上傳圖檔');
                return;
            }

            let kiloByte = 1024;
            let megaByte = kiloByte * 1024;
            if (file.type.indexOf('image') >= 0 && file.size > config.richmenuImageFileMaxSize) {
                $('#modal-save').removeAttr('disabled');
                $('#modal-update-save').removeAttr('disabled');
                $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.richmenuImageFileMaxSize / megaByte) + ' MB');
                return;
            }

            // 將檔案轉 base64 的 URL
            reader.onloadend = function(e) {
                let url = e.target.result;
                // 取得圖檔的長 寬
                let image = new Image();
                image.onload = function() {
                    if (2500 !== image.width && (1686 !== image.height || 843 !== image.height)) {
                        $('#modal-save').removeAttr('disabled');
                        $('#modal-update-save').removeAttr('disabled');
                        $.notify('圖檔尺寸不符，須為: 2500 * 1686 px 或 2500 * 843 px');
                        return;
                    }
                    size.width = image.width;
                    size.height = image.height;
                    $('.show-richmenu-form')
                        .css('background', 'url(' + url + ') center no-repeat')
                        .css('background-size', '100% 100%')
                        .css('background-color', 'none');
                    imageFile = file;
                };
                image.src = url;
            };
            reader.readAsDataURL(file);
        }

        function generateActionInput(boxId) {
            return (
                '<div class="px-1 flex-wrap action-input" id="' + boxId + '-input">' +
                    '<div class="w-100 form-group">' +
                        '<label class="col-form-label font-weight-bold">設定執行動作:</label>' +
                        '<div class="w-100 btn-group action-select" role="group" action-type="">' +
                            '<button type="button" class="btn btn-light action-item" action-type="" data-toggle="tooltip" data-placement="top" title="不設定">' +
                                '<i class="fas fa-times"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.TEXT + '" data-toggle="tooltip" data-placement="top" title="發出固定文字訊息">' +
                                '<i class="fas fa-text-height"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.URI + '" data-toggle="tooltip" data-placement="top" title="前往指定連結">' +
                                '<i class="fas fa-link"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.TEMPLATE + '" data-toggle="tooltip" data-placement="top" title="發送指定範本訊息">' +
                                '<i class="fas fa-clipboard-list"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.RICHMENU + '" data-toggle="tooltip" data-placement="top" title="切換圖文選單">' +
                                '<i class="fas fa-exchange-alt"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.CONSUMER_FORM + '" data-toggle="tooltip" data-placement="top" title="填寫個人資料">' +
                                '<i class="fas fa-id-badge"></i>' +
                            '</button>' +
                            '<button type="button" class="btn btn-light action-item" action-type="' + ACTION_TYPES.DONATION + '" data-toggle="tooltip" data-placement="top" title="候選人捐款功能">' +
                                '<i class="fas fas fa-donate"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="position-relative w-100 form-group action-content"></div>' +
                '</div>'
            );
        }

        function onActionDataChange(ev) {
            let $contentInput = $(ev.target);
            let actionProperty = $contentInput.attr('action-property');

            let $actionInput = $contentInput.parents('.action-input');
            let boxId = $actionInput.attr('id').replace('-input', '');
            let $box = $('.show-richmenu-form #' + boxId);

            let actionType = $box.attr('action-type');
            let actionValue = $contentInput.val() || '';
            let actionData = $box.data('action') || {};

            if (ACTION_TYPES.URI === actionType) {
                let uriPrefix = $actionInput.find('.uri-prefix').text();
                actionValue = uriPrefix + actionValue.replace(/(http:\/\/|https:\/\/|tel:)/, '');
            }
            actionData[actionProperty] = actionValue;
            $box.data('action', actionData);
        }

        function onActionTypeChange(ev) {
            let $actionItem = $(ev.target);
            $actionItem = $actionItem.hasClass('action-item') ? $actionItem : $actionItem.parents('.action-item');

            let actionType = $actionItem.attr('action-type');
            let $actionSelect = $actionItem.parents('.action-select');
            let $actionInput = $actionSelect.parents('.action-input');

            let boxId = $actionInput.attr('id').replace('-input', '');
            let $box = $('.show-richmenu-form #' + boxId);
            $box.attr('action-type', actionType);
            $actionItem.parents('.action-select').attr('action-type', actionType);
            $actionItem.addClass('active').siblings().removeClass('active');

            return Promise.resolve().then(() => {
                let appId = $appSelector.val();
                switch (actionType) {
                    case ACTION_TYPES.TEXT:
                        return Promise.resolve().then(() => {
                            if (!appsKeywordreplies[appId]) {
                                return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
                                    let _appsKeywordreplies = resJson.data;
                                    if (!_appsKeywordreplies[appId]) {
                                        return {};
                                    }

                                    if (!appsKeywordreplies[appId]) {
                                        appsKeywordreplies[appId] = { keywordreplies: {} };
                                    }
                                    Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);
                                    return _appsKeywordreplies[appId].keywordreplies;
                                });
                            }
                            return appsKeywordreplies[appId].keywordreplies;
                        }).then((keywordreplies) => {
                            return (
                                '<textarea class="form-control content-input action-data" action-property="text" style="resize: vertical"></textarea>' +
                                '<select class="form-control keyword-select" value="">' +
                                    '<option value="" disabled selected>-- 選擇可用的關鍵字 --</option>' +
                                    (function() {
                                        return Object.keys(keywordreplies).map((keywordreplyId) => {
                                            let keyword = keywordreplies[keywordreplyId].keyword;
                                            return '<option value="' + keyword + '">' + keyword + '</option>';
                                        }).join('');
                                    })() +
                                '</select>'
                            );
                        });
                    case ACTION_TYPES.URI:
                        return (
                            '<div class="input-group uri-input">' +
                                '<div class="input-group-prepend">' +
                                    '<button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" style="border-color: #cbcbcb;" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                                        '<span class="mr-1 uri-prefix">http://</span>' +
                                    '</button>' +
                                    '<div class="dropdown-menu">' +
                                        '<a class="dropdown-item">http://</a>' +
                                        '<a class="dropdown-item">https://</a>' +
                                        '<a class="dropdown-item">tel:</a>' +
                                    '</div>' +
                                '</div>' +
                                '<input class="form-control content-input action-data" action-property="uri" type="url" />' +
                            '</div>'
                        );
                    case ACTION_TYPES.TEMPLATE:
                        return Promise.resolve().then(() => {
                            if (!appsTemplates[appId]) {
                                return api.appsTemplates.findAll(appId, userId).then((resJson) => {
                                    let _appsTemplates = resJson.data;
                                    if (!_appsTemplates[appId]) {
                                        return {};
                                    }

                                    if (!appsTemplates[appId]) {
                                        appsTemplates[appId] = { templates: {} };
                                    }
                                    Object.assign(appsTemplates[appId].templates, _appsTemplates[appId].templates);
                                    return _appsTemplates[appId].templates;
                                });
                            }
                            return appsTemplates[appId].templates;
                        }).then((templates) => {
                            return (
                                '<select class="form-control content-input action-data" action-property="templateId" value="">' +
                                    '<option value="" disabled selected>-- 請選擇目標範本 --</option>' +
                                    (function() {
                                        return Object.keys(templates).map((templateId) => {
                                            return '<option value="' + templateId + '">' + templates[templateId].altText + '</option>';
                                        }).join('');
                                    })() +
                                '</select>'
                            );
                        });
                    case ACTION_TYPES.RICHMENU:
                        return Promise.resolve().then(() => {
                            if (!appsRichmenus[appId]) {
                                return api.appsRichmenus.findAll(appId, userId).then((resJson) => {
                                    let _appsRichmenus = resJson.data;
                                    if (!_appsRichmenus[appId]) {
                                        return {};
                                    }

                                    if (!appsRichmenus[appId]) {
                                        appsRichmenus[appId] = { richmenus: {} };
                                    }
                                    Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                                    return _appsRichmenus[appId].richmenus;
                                });
                            }
                            return appsRichmenus[appId].richmenus;
                        }).then((richmenus) => {
                            var currentRichmenuId = $modal.find('#richmenuId').val();
                            return (
                                '<label class="w-100 font-weight-bold col-form-label">' +
                                    '<span class="text-danger">提醒: 目標圖文選單必須啟用，否則此功能將無作用</span>' +
                                '</label>' +
                                '<select class="form-control content-input action-data" action-property="richmenuId" value="">' +
                                    '<option value="" disabled selected>-- 請選擇目標圖文選單 --</option>' +
                                    (function() {
                                        let richmenuIds = Object.keys(richmenus).filter((richmenuId) => richmenuId !== currentRichmenuId);
                                        return richmenuIds.map((richmenuId) => {
                                            return '<option value="' + richmenuId + '">' + richmenus[richmenuId].chatBarText + '</option>';
                                        }).join('');
                                    })() +
                                '</select>'
                            );
                        });
                    case ACTION_TYPES.DONATION:
                        return (
                            '<label class="w-100 font-weight-bold col-form-label">' +
                                '<span class="text-danger">提醒: 機器人必須完成金流設定，否則此功能將無作用</span>' +
                            '</label>'
                        );
                    case ACTION_TYPES.CONSUMER_FORM:
                        return (
                            '<label class="w-100 font-weight-bold col-form-label">' +
                                '<span>無須設定</span>' +
                            '</label>'
                        );
                    default:
                        break;
                }
            }).then((html) => {
                let $actionContent = $actionInput.find('.action-content');
                $actionContent.html(html || '');

                let actionData = $box.data('action') || {};
                let $actionData = $actionInput.find('.action-data');
                switch (actionType) {
                    case ACTION_TYPES.TEXT:
                        $actionData.val(actionData.text || '');
                        break;
                    case ACTION_TYPES.URI:
                        let uri = actionData.uri || '';
                        let uriSplits = uri.split(':');
                        let uriPrefix = uriSplits.shift() || '';
                        uriPrefix && (uriPrefix += ':');
                        uri = uriSplits.pop() || '';

                        if (uriPrefix.startsWith('http')) {
                            uriPrefix = uriPrefix + '//';
                            uri = uri.substring(2);
                        }
                        $actionInput.find('.uri-prefix').text(uriPrefix || 'http://');
                        $actionData.val(uri || '');
                        break;
                    case ACTION_TYPES.TEMPLATE:
                        $actionData.val(actionData.templateId || '');
                        break;
                    case ACTION_TYPES.RICHMENU:
                        $actionData.val(actionData.richmenuId || '');
                        break;
                    case ACTION_TYPES.CONSUMER_FORM:
                    case ACTION_TYPES.DONATION:
                    default:
                        break;
                }
            });
        }

        function onUriPrefixChange(ev) {
            let $uriDropdownItem = $(ev.target);
            let $uriInput = $uriDropdownItem.parents('.uri-input');
            let $uriPrefix = $uriInput.find('.uri-prefix');
            let uriPrefix = $uriDropdownItem.text();
            $uriPrefix.text(uriPrefix);

            let $actionData = $uriInput.find('.action-data');
            let $actionInput = $uriInput.parents('.action-input');
            let boxId = $actionInput.attr('id').replace('-input', '');
            let $box = $('.show-richmenu-form #' + boxId);

            let uri = uriPrefix + $actionData.val();
            $box.data('action', { uri: uri });
        }

        function onKeywordSelect(ev) {
            let $keywordSelect = $(ev.target);
            let keyword = $keywordSelect.val();
            let $actionData = $keywordSelect.siblings('.action-data');
            onActionDataChange({ target: $actionData.val(keyword).get(0) });
        }

        function onClickActionBox() {
            let $box = $(this);
            let $actionInputs = $('.action-inputs');

            let boxId = $box.attr('id');
            let actionType = $box.attr('action-type') || '';

            $box.siblings().removeClass('checked').css('background-color', '');
            $box.addClass('checked').css('background-color', 'rgba(158, 158, 158, .7)');

            let $actionInput = $actionInputs.find('.action-input#' + boxId + '-input');
            $actionInput.removeClass('d-none').siblings().addClass('d-none');

            let $actionSelect = $actionInput.find('.action-select');
            $actionSelect.attr('action-type', actionType);

            let $actionItem = $actionSelect.find('.action-item[action-type="' + actionType + '"]');
            return onActionTypeChange({ target: $actionItem.get(0) });
        }

        function photoFormShow() {
            let $showRichmenuForm = $modal.find('.show-richmenu-form');
            let width = $showRichmenuForm.width();
            let height = $showRichmenuForm.height();
            let boxWidth = width / 3;
            let boxHeight = height / 2;

            elementHide($('.content-input'));
            $showRichmenuForm.css('background-color', '#cbcbcb');
            $showRichmenuForm.find('.box').remove();
            let checked = $('input[name="richmenu-form"]:checked').val();

            switch (checked) {
                case 'form1':
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px; height:' + height + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form2':
                    let widthForm6 = (boxWidth * 3) / 2;
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>' +
                        '<div class="box" id="box2" data-x="' + widthForm6 + '" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form3':
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>' +
                        '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '" style="width:' + width + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form4':
                    let widthForm4 = boxWidth * 2;
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm4 + 'px; height:' + height + 'px"></div>' +
                        '<div class="box" id="box2" data-x="' + widthForm4 + '" data-y="0"></div>' +
                        '<div class="box" id="box3" data-x="' + widthForm4 + '" data-y="' + boxHeight + '"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form5':
                    let widthForm2 = boxWidth;
                    widthForm2 = (widthForm2 * 3) / 2;
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm2 + 'px"></div>' +
                        '<div class="box" id="box2" data-x="' + widthForm2 + '" data-y="0" style="width:' + widthForm2 + 'px"></div>' +
                        '<div class="box" id="box3" data-x="0" data-y="' + boxHeight + '" style="width:' + widthForm2 + 'px"></div>' +
                        '<div class="box" id="box4" data-x="' + widthForm2 + '" data-y="' + boxHeight + '" style="width:' + widthForm2 + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3') +
                        generateActionInput('box4')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form6':
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>' +
                        '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '"></div>' +
                        '<div class="box" id="box3" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>' +
                        '<div class="box" id="box4" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3') +
                        generateActionInput('box4')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form7':
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0"></div>' +
                        '<div class="box" id="box2" data-x="' + boxWidth + '" data-y="0"></div>' +
                        '<div class="box" id="box3" data-x="' + boxWidth * 2 + '" data-y="0"></div>' +
                        '<div class="box" id="box4" data-x="0" data-y="' + boxHeight + '"></div>' +
                        '<div class="box" id="box5" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>' +
                        '<div class="box" id="box6" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3') +
                        generateActionInput('box4') +
                        generateActionInput('box5') +
                        generateActionInput('box6')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form8':
                    let widthForm8 = (boxWidth * 3) / 4;
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box2" data-x="' + widthForm8 + '" data-y="0" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box3" data-x="' + widthForm8 * 2 + '" data-y="0" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box4" data-x="' + widthForm8 * 3 + '" data-y="0" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box5" data-x="0" data-y="' + boxHeight + '" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box6" data-x="' + widthForm8 + '" data-y="' + boxHeight + '" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box7" data-x="' + widthForm8 * 2 + '" data-y="' + boxHeight + '" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>' +
                        '<div class="box" id="box8" data-x="' + widthForm8 * 3 + '" data-y="' + boxHeight + '" style="width:' + widthForm8 + 'px; height:' + boxHeight + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3') +
                        generateActionInput('box4') +
                        generateActionInput('box5') +
                        generateActionInput('box6') +
                        generateActionInput('box7') +
                        generateActionInput('box8')
                    );
                    elementHide($('.action-input'));
                    break;
                case 'form9':
                    let heightForm9 = (boxHeight * 2) / 3;
                    $showRichmenuForm.append(
                        '<div class="box" id="box1" data-x="0" data-y="0" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box2" data-x="' + boxWidth + '" data-y="0" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box3" data-x="' + boxWidth * 2 + '" data-y="0" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box4" data-x="0" data-y="' + heightForm9 + '" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box5" data-x="' + boxWidth + '" data-y="' + heightForm9 + '" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box6" data-x="' + boxWidth * 2 + '" data-y="' + heightForm9 + '" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box7" data-x="0" data-y="' + (heightForm9 * 2) + '" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box8" data-x="' + boxWidth + '" data-y="' + (heightForm9 * 2) + '" style="height: ' + heightForm9 + 'px"></div>' +
                        '<div class="box" id="box9" data-x="' + boxWidth * 2 + '" data-y="' + (heightForm9 * 2) + '" style="height: ' + heightForm9 + 'px"></div>'
                    );
                    $actionInputs.html(
                        generateActionInput('box1') +
                        generateActionInput('box2') +
                        generateActionInput('box3') +
                        generateActionInput('box4') +
                        generateActionInput('box5') +
                        generateActionInput('box6') +
                        generateActionInput('box7') +
                        generateActionInput('box8') +
                        generateActionInput('box9')
                    );
                    elementHide($('.action-input'));
                    break;
                default:
                    break;
            }
            $actionInputs.find('[data-toggle="tooltip"]').tooltip();
        }

        function getActionBoxAreas() {
            let $showRichmenuForm = $richmenuForm.find('.show-richmenu-form');
            let width = $showRichmenuForm.width();
            let height = $showRichmenuForm.height();

            let imgWidth = size.width;
            let imgHeight = size.height;
            if (!imgWidth || !imgHeight) {
                elementEnabled($('#modal-save'), handleMessages.addFinished);
                elementEnabled($('#modal-update-save'), handleMessages.editFinished);
                $.notify('請上傳圖片', { type: 'warning' });
                return;
            }

            // 取得 長 寬 比例尺
            let widthRate = imgWidth / width;
            let heightRate = imgHeight / height;

            let $boxes = $showRichmenuForm.find('.box');
            let areas = [];
            for (let i = 0; i < $boxes.length; i++) {
                let $box = $($boxes[i]);
                let actionType = $box.attr('action-type');
                let actionData = $box.data('action');

                let boxWidth = $box.width();
                let boxHeight = $box.height();
                let x = parseInt($box.data('x'));
                let y = parseInt($box.data('y'));
                let action = getRichmenuAction(actionType, actionData);

                if (!action) {
                    return;
                }

                let area = {
                    // 將 長寬 及 座標 依圖片大小縮放並四捨五入
                    bounds: {
                        x: Math.round(x * widthRate),
                        y: Math.round(y * heightRate),
                        width: Math.round(boxWidth * widthRate),
                        height: Math.round(boxHeight * heightRate)
                    },
                    action: getRichmenuAction(actionType, actionData)
                };

                areas.push(area);
            }
            return areas;
        }

        function getRichmenuAction(actionType, actionData) {
            actionData = actionData || {};
            let richmenuAction = {};
            switch (actionType) {
                case ACTION_TYPES.TEXT:
                    if (!actionData.text) {
                        $.notify('設定為文字時，文字不可為空', { type: 'warning' });
                        return;
                    }
                    richmenuAction.type = 'message';
                    richmenuAction.text = actionData.text || '';
                    break;
                case ACTION_TYPES.URI:
                    if (!actionData.uri) {
                        $.notify('設定為連結時，連結不可為空', { type: 'warning' });
                        return;
                    }
                    richmenuAction.type = 'uri';
                    richmenuAction.uri = actionData.uri || '';
                    break;
                case ACTION_TYPES.RICHMENU:
                    let richmenuData = {
                        action: POSTBACK_DATA_TYPES.CHANGE_RICHMENU,
                        richmenuId: actionData.richmenuId
                    };
                    richmenuAction.type = 'postback';
                    richmenuAction.data = JSON.stringify(richmenuData);
                    break;
                case ACTION_TYPES.TEMPLATE:
                    let templateData = {
                        action: POSTBACK_DATA_TYPES.SEND_TEMPLATE,
                        templateId: actionData.templateId
                    };
                    richmenuAction.type = 'postback';
                    richmenuAction.data = JSON.stringify(templateData);
                    break;
                case ACTION_TYPES.CONSUMER_FORM:
                    let userFormData = {
                        action: POSTBACK_DATA_TYPES.SEND_CONSUMER_FORM
                    };
                    richmenuAction.type = 'postback';
                    richmenuAction.data = JSON.stringify(userFormData);
                    break;
                case ACTION_TYPES.DONATION:
                    let donateData = {
                        action: POSTBACK_DATA_TYPES.PAYMENT_CONFIRM
                    };
                    richmenuAction.type = 'postback';
                    richmenuAction.data = JSON.stringify(donateData);
                    break;
                default:
                    richmenuAction.type = 'postback';
                    richmenuAction.data = 'none';
                    break;
            }
            return richmenuAction;
        }

        function insertRichmenu() {
            let appId = $appSelector.val();
            let chatBarText = $('input[name="chatbarText"]').val();
            if (!appId) {
                return $.notify('必須選擇一個機器人', { type: 'warning' });
            } else if (!chatBarText) {
                return $.notify('標題不可為空', { type: 'warning' });
            } else if (!imageFile) {
                return $.notify('必須設定圖像', { type: 'warning' });
            }

            let selected = 'true' === $('.richmenu-select').val();
            let form = $('input[name="richmenu-form"]:checked').val();
            elementDisabled($(this), handleMessages.working);

            let areas = getActionBoxAreas();
            if (!areas) {
                return;
            }

            let postRichmenu = {
                selected: selected,
                chatBarText: chatBarText,
                name: chatBarText,
                form: form,
                src: '',
                size: size,
                areas: areas
            };

            $(this).attr('disabled', true).html('<i class="mr-1 fas fa-circle-notch fa-spin fa-fw"></i>處理中');
            return api.appsRichmenus.insert(appId, userId, postRichmenu, imageFile).then((resJson) => {
                let _appsRichmenus = resJson.data;
                if (!appsRichmenus[appId]) {
                    appsRichmenus[appId] = { richmenus: {} };
                }
                Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

                $('#richmenu-modal').modal('hide');
                $.notify('新增成功', { type: 'success' });
                $appDropdown.find('#' + appId).trigger('click');
            }).catch((err) => {
                elementEnabled($('#modal-save'), handleMessages.addFinished);
                if (BOT_UPLOAD_IMAGE_TOO_LARGE === err.code) {
                    return $.notify('上傳的圖像大小過大 (限制 1 MB)', { type: 'danger' });
                }
                $.notify('新增失敗', { type: 'danger' });
            });
        }

        function updateRichmenu(appId, richmenuId) {
            let richmenu = appsRichmenus[appId].richmenus[richmenuId];
            let chatBarText = $('input[name="chatbarText"]').val();

            if (!chatBarText) {
                return $.notify('標題不可為空', { type: 'warning' });
            } else if (!richmenu.src && !imageFile) {
                return $.notify('必須設定圖像', { type: 'warning' });
            }

            let areas = getActionBoxAreas();
            if (!areas) {
                return;
            }

            let selected = 'true' === $('.richmenu-select').val();
            let form = $('input[name="richmenu-form"]:checked').val();
            let putRichmenu = {
                selected: selected,
                chatBarText: chatBarText,
                name: chatBarText,
                form: form || richmenu.form,
                src: richmenu.src,
                size: size || richmenu.size,
                areas: areas
            };

            let $modalUpdateSave = $('#modal-update-save');
            elementDisabled($modalUpdateSave, handleMessages.working);
            $modalUpdateSave.html('<i class="mr-1 fas fa-circle-notch fa-spin fa-fw"></i>處理中');
            return api.appsRichmenus.update(appId, richmenuId, userId, putRichmenu, imageFile).then((resJson) => {
                let _appsRichmenus = resJson.data;
                Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                $('#richmenu-modal').modal('hide');

                $('#modal-update-save').removeAttr('disabled');
                $.notify('修改成功', { type: 'success' });
                $appDropdown.find('#' + appId).click();
            }).catch((err) => {
                elementEnabled($('#modal-update-save'), handleMessages.editFinished);
                if (BOT_UPLOAD_IMAGE_TOO_LARGE === err.code) {
                    return $.notify('上傳的圖像大小過大 (限制 1 MB)', { type: 'danger' });
                }
                $.notify('修改失敗', { type: 'danger' });
            });
        }
    })();

    return api.apps.findAll(userId).then(function(resJson) {
        apps = resJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');
        let config = window.CHATSHIER.CONFIG;
        $('.richmenu-image-warning').empty().text(`圖片大小不能超過${(Math.floor(config.richmenuImageFileMaxSize / (1024 * 1024)))}MB`);

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];

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
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            return reloadRichmenus(nowSelectAppId, userId).then(() => {
                $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
            });
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return reloadRichmenus(nowSelectAppId, userId);
    }

    function activateRichmenu() {
        let $activateBtn = $(this);
        $activateBtn.attr('disabled', 'disabled').text('啟用中...');

        let $richmenuRow = $activateBtn.parents('tr');
        let appId = $richmenuRow.attr('rel');
        let richmenuId = $richmenuRow.attr('id');

        return api.bot.activateRichmenu(appId, richmenuId, userId).then((resJson) => {
            $activateBtn.removeAttr('disabled');
            $('#' + richmenuId).remove();

            let _appsRichmenus = resJson.data;
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

            return reloadRichmenus(appId, userId);
        }).then(() => {
            $.notify('成功啟用', { type: 'success' });
        }).catch((err) => {
            $activateBtn.removeAttr('disabled').text('未啟用');
            if (BOT_MENU_IMAGE_FAILED_TO_FIND === err.code) {
                $.notify('未設定圖像的圖文選單無法被啟用', { type: 'danger' });
                return;
            }

            $.notify('啟用失敗', { type: 'danger' });
        });
    }

    function deactivateRichmenu() {
        let $deactivateBtn = $(this);
        $deactivateBtn.attr('disabled', 'disabled').text('取消啟用...');

        let $richmenuRow = $deactivateBtn.parents('tr');
        let appId = $richmenuRow.attr('rel');
        let richmenuId = $richmenuRow.attr('id');

        return api.bot.deactivateRichmenu(appId, richmenuId, userId).then((resJson) => {
            $deactivateBtn.removeAttr('disabled');

            let _appsRichmenus = resJson.data;
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

            $.notify('成功取消啟用', { type: 'success' });
            return reloadRichmenus(appId, userId);
        }).catch(() => {
            $deactivateBtn.removeAttr('disabled').text('未啟用');
            $.notify('取消啟用失敗', { type: 'danger' });
        });
    }

    function setDefaultRichmenu() {
        let $setDefaultBtn = $(this);
        $setDefaultBtn.attr('disabled', 'disabled').text('設定中...');

        let $richmenuRow = $setDefaultBtn.parents('tr');
        let appId = $richmenuRow.attr('rel');
        let richmenuId = $richmenuRow.attr('id');

        return api.bot.setDefaultRichmenu(appId, richmenuId, userId).then((resJson) => {
            $setDefaultBtn.removeAttr('disabled').addClass('d-none');
            $.notify('已成功設定', { type: 'success' });

            let _appsRichmenus = resJson.data;
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
            return reloadRichmenus(appId, userId);
        }).catch(() => {
            $setDefaultBtn.removeAttr('disabled').text('設為預設');
            $.notify('設定失敗', { type: 'danger' });
        });
    }

    function generateRichmenuRow(richmenuId, richmenu, appId) {
        let linkText = '';
        for (let i = 0; i < richmenu.areas.length; i++) {
            if (0 === i) {
                linkText += getRichmenuActionType(richmenu.areas[i].action);
            } else {
                linkText = linkText + '，' + getRichmenuActionType(richmenu.areas[i].action);
            }
        }

        var richmenuRow = (
            '<tr id="' + richmenuId + '" rel="' + appId + '">' +
                '<td>' + richmenu.chatBarText + '</td>' +
                '<td id="photoForm" data-form="' + richmenu.form + '" data-url="' + richmenu.src + '">版型 ' + richmenu.form.slice(-1) + '</td>' +
                '<td>' + linkText + '</td>' +
                (() => {
                    if (richmenu.isActivated) {
                        return (
                            '<td>' +
                                '<button type="button" class="btn btn-success btn-border deactivate-btn' + (richmenu.isDefault ? ' is-default' : '') + '" data-status="true">已啟用' + (richmenu.isDefault ? ' (預設)' : '') + '</button>' +
                            '</td>' +
                            '<td>' +
                                '<button type="button" class="mb-1 mr-1 btn btn-light set-default-btn' + (richmenu.isDefault ? ' d-none' : '') + '">設為預設</button>' +
                            '</td>'
                        );
                    }

                    return (
                        '<td>' +
                            '<button type="button" class="btn btn-light btn-border activate-btn' + (richmenu.isDefault ? ' is-default' : '') + '" data-status="false" data-isDefault="' + richmenu.isDefault + '">未啟用</button>' +
                        '</td>' +
                        '<td>' +
                            '<button type="button" id="update-btn" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" data-toggle="modal" data-target="#richmenu-modal" aria-hidden="true"></button>' +
                            '<button type="button" id="remove-btn" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove"></button>' +
                        '</td>'
                    );
                })() +
            '</tr>'
        );

        if (richmenu.isActivated) {
            $('table #activated-richmenu').append(richmenuRow);
            return;
        }
        $('table #richmenu').append(richmenuRow);
    }

    function getRichmenuActionType(action) {
        switch (action.type) {
            case 'postback':
                let actionData = action.data || '';
                if (actionData.indexOf(POSTBACK_DATA_TYPES.CHANGE_RICHMENU) >= 0) {
                    return '切換圖文選單';
                } else if (actionData.indexOf(POSTBACK_DATA_TYPES.SEND_TEMPLATE) >= 0) {
                    return '發送範本';
                } else if (actionData.indexOf(POSTBACK_DATA_TYPES.SEND_CONSUMER_FORM) >= 0) {
                    return '填寫個人資料';
                } else if (actionData.indexOf(POSTBACK_DATA_TYPES.PAYMENT_CONFIRM) >= 0) {
                    return '候選人捐款功能';
                }
                return '未設定';
            case 'uri':
                return action.uri;
            default:
                return action.text;
        }
    }

    function reloadRichmenus(appId, userId) {
        $('table #richmenu').empty();
        $('table #activated-richmenu').empty();

        return Promise.resolve().then(() => {
            if (!appsRichmenus[appId]) {
                appsRichmenus[appId] = { richmenus: {} };
                return api.appsRichmenus.findAll(appId, userId).then((resJson) => {
                    let _appsRichmenus = resJson.data;
                    if (_appsRichmenus[appId]) {
                        Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                    }
                    return syncRichmenus(appId);
                }).then(() => {
                    return appsRichmenus;
                });
            }
            return appsRichmenus;
        }).then(function() {
            let richmenus = appsRichmenus[appId].richmenus;

            for (let richmenuId in richmenus) {
                let richmenu = richmenus[richmenuId];
                if (richmenu.isDeleted) {
                    continue;
                }
                generateRichmenuRow(richmenuId, richmenu, appId);
            }
        });
    }

    function syncRichmenus(appId) {
        let app = apps[appId];
        if (app.type !== api.apps.TYPES.LINE) {
            return Promise.resolve();
        }

        let $dropdownText = $appDropdown.find('.dropdown-toggle .dropdown-text');
        let bakAppName = $dropdownText.html();
        $dropdownText.html(bakAppName + '<i class="ml-2 fas fa-circle-notch fa-spin fa-fw"></i>');

        let richmenus = appsRichmenus[appId].richmenus;
        let richmenuIds = Object.keys(richmenus);
        return api.bot.getRichmenuList(appId, userId).then((resJson) => {
            let platformRichmenuList = resJson.data || [];
            let platformRichmenuMap = platformRichmenuList.reduce((output, platfromRichmenu) => {
                output[platfromRichmenu.richMenuId] = platfromRichmenu;
                return output;
            }, {});

            let shouldRemoveIds = [];
            let shouldSyncRichmenus = {};
            richmenuIds.forEach((richmenuId) => {
                let richmenu = richmenus[richmenuId];
                let platformRichmenu = platformRichmenuMap[richmenu.platformMenuId];
                if (!platformRichmenu) {
                    shouldRemoveIds.push(richmenuId);
                    return;
                }

                if (richmenu.name !== platformRichmenu.name ||
                    richmenu.size.width !== platformRichmenu.size.width ||
                    richmenu.size.height !== platformRichmenu.size.height ||
                    richmenu.chatBarText !== platformRichmenu.chatBarText ||
                    richmenu.selected !== platformRichmenu.selected ||
                    richmenu.areas.length !== platformRichmenu.areas.length) {
                    let putRichmenu = {
                        selected: platformRichmenu.selected,
                        chatBarText: platformRichmenu.chatBarText,
                        name: platformRichmenu.name,
                        form: richmenu.form,
                        src: richmenu.src,
                        size: platformRichmenu.size,
                        areas: platformRichmenu.areas
                    };
                    shouldSyncRichmenus[richmenuId] = putRichmenu;
                    delete platformRichmenuMap[richmenu.platformMenuId];
                    return;
                }

                for (let i in richmenu.areas) {
                    let area = richmenu.areas[i];
                    let platformArea = platformRichmenu.areas[i];

                    if (area.bounds.x !== platformArea.bounds.x ||
                        area.bounds.y !== platformArea.bounds.y ||
                        area.bounds.width !== platformArea.bounds.width ||
                        area.bounds.height !== platformArea.bounds.height ||
                        area.action.data !== platformArea.action.data ||
                        area.action.type !== platformArea.action.type ||
                        area.action.uri !== platformArea.action.uri ||
                        area.action.text !== platformArea.action.text) {
                        let putRichmenu = {
                            selected: platformRichmenu.selected,
                            chatBarText: platformRichmenu.chatBarText,
                            name: platformRichmenu.name,
                            form: richmenu.form,
                            src: richmenu.src,
                            size: platformRichmenu.size,
                            areas: platformRichmenu.areas
                        };
                        shouldSyncRichmenus[richmenuId] = putRichmenu;
                        delete platformRichmenuMap[richmenu.platformMenuId];
                        break;
                    }
                }
                delete platformRichmenuMap[richmenu.platformMenuId];
            });

            let insertPromise = Promise.all(Object.keys(platformRichmenuMap).map((platformMenuId) => {
                let platformRichmenu = platformRichmenuMap[platformMenuId];
                let form = 'form' + platformRichmenu.areas.length;

                if (2 === platformRichmenu.areas.length) {
                    if (platformRichmenu.areas[0].width < platformRichmenu.areas[0].height) {
                        form = 'form2';
                    } else {
                        form = 'form3';
                    }
                } else if (3 === platformRichmenu.areas.length) {
                    form = 'form4';
                } else if (4 === platformRichmenu.areas.length) {
                    if (platformRichmenu.areas[0].width === platformRichmenu.areas[1].width &&
                        platformRichmenu.areas[0].width === platformRichmenu.areas[2].width &&
                        platformRichmenu.areas[0].width === platformRichmenu.areas[3].width) {
                        form = 'form5';
                    } else {
                        form = 'form6';
                    }
                } else if (6 === platformRichmenu.areas.length) {
                    form = 'form7';
                }

                let postRichmenu = {
                    selected: platformRichmenu.selected,
                    chatBarText: platformRichmenu.chatBarText,
                    name: platformRichmenu.name,
                    form: form,
                    src: '',
                    size: platformRichmenu.size,
                    areas: platformRichmenu.areas,
                    platformMenuId: platformMenuId
                };
                return api.appsRichmenus.insert(appId, userId, postRichmenu).then((resJson) => {
                    let _appsRichmenus = resJson.data;
                    if (!appsRichmenus[appId]) {
                        appsRichmenus[appId] = { richmenus: {} };
                    }
                    Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                });
            }));

            let updatePromise = Promise.all(Object.keys(shouldSyncRichmenus).map((richmenuId) => {
                let putRichmenu = shouldSyncRichmenus[richmenuId];
                return api.appsRichmenus.update(appId, richmenuId, userId, putRichmenu).then((resJson) => {
                    let _appsRichmenus = resJson.data;
                    if (!appsRichmenus[appId]) {
                        appsRichmenus[appId] = { richmenus: {} };
                    }
                    Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                });
            }));

            let removePromise = Promise.all(shouldRemoveIds.map((richmenuId) => {
                return api.appsRichmenus.remove(appId, richmenuId, userId).then(() => {
                    if (!appsRichmenus[appId] && appsRichmenus[appId].richmenus[richmenuId]) {
                        delete appsRichmenus[appId].richmenus[richmenuId];
                    }
                });
            }));

            return Promise.all([ insertPromise, updatePromise, removePromise ]);
        }).catch(() => {
            $.notify('同步資料失敗', { type: 'danger' });
        }).then(() => {
            $dropdownText.html(bakAppName);
        });
    }

    function removeRichmenu() {
        let $removeBtn = $(this);
        let $richmenuRow = $removeBtn.parents('tr');
        let appId = $richmenuRow.attr('rel');
        let richmenuId = $richmenuRow.attr('id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                let cancelDelete = '取消刪除';
                return Promise.reject(cancelDelete);
            }
            return api.appsRichmenus.remove(appId, richmenuId, userId);
        }).then((resJson) => {
            delete appsRichmenus[appId].richmenus[richmenuId];
            $('#' + richmenuId).remove();
            $.notify('刪除成功！', { type: 'success' });
        }).catch((ERR) => {
            $('#modal-update-save').removeAttr('disabled').empty().text('修改');
            if (NO_PERMISSION_CODE === ERR.code) {
                return $.notify('無此權限', { type: 'danger' });
            }
            if ('取消刪除' === ERR) {
                return $.notify(ERR, { type: 'warning' });
            }
            return $.notify('失敗', { type: 'danger' });
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

    function elementDisabled(element, message) {
        element.attr('disabled', true).empty().append(message);
    }

    function elementEnabled(element, message) {
        element.removeAttr('disabled').empty().text(message);
    }

    function elementShow(element) {
        element.removeClass('d-none');
    }

    function elementHide(element) {
        element.addClass('d-none');
    }
})();
