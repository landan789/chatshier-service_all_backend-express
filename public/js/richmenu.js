/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;

    var apps = {};
    var appsKeywordreplies = {};
    var appsRichmenus = {};

    var nowSelectAppId = '';
    var size = {};

    /** @type {File} */
    var imageFile;

    var $modal = $('#richmenu-modal');

    const NO_PERMISSION_CODE = '3.16';
    const BOT_UPLOAD_IMAGE_TOO_LARGE = '19.2';

    const handleMessages = {
        working: '<i class="fas fa-circle-notch fa-spin"></i>處理中',
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

    $jqDoc.on('click', '#remove-btn', removeRichmenu);

    elementHide($('.content-bar'));
    elementHide($('.content-input'));
    $jqDoc.on('click', '#modal-save', insertRichmenu); // add richmenu, not activated.
    $jqDoc.on('click', '#add-btn', cleanModal); // cleaning the options in modal.
    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = richmenu-form]', photoFormShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '.box', contentBarShow);
    $jqDoc.on('click', '.activate-btn', activateRichmenu);
    $jqDoc.on('click', '.deactivate-btn', deactivateRichmenu);
    $jqDoc.on('click', '#update-btn', appendRichmenu);
    $jqDoc.on('click', '.set-default-btn', setDefaultRichmenu);

    $modal.on('hidden.bs.modal', function() {
        $appSelector.parent().parent().removeClass('d-none');
        $(`.form-inputs input`).val('');
        imageFile = void 0;
        cleanModal();
    });

    $modal.on('show.bs.modal', function() {
        $('#keyword').empty();
        let appId = $appSelector.find('option:selected').val();

        return Promise.resolve().then(() => {
            if (!appsKeywordreplies[appId]) {
                appsKeywordreplies[appId] = { keywordreplies: {} };

                return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
                    let _appsKeywordreplies = resJson.data;
                    if (!(_appsKeywordreplies && _appsKeywordreplies[appId])) {
                        return appsKeywordreplies[appId].keywordreplies;
                    }
                    Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);
                    return appsKeywordreplies[appId].keywordreplies;
                });
            }
            return appsKeywordreplies[appId].keywordreplies;
        }).then((keywordreplies) => {
            if (!keywordreplies) {
                return;
            }
            let keywordreplyStr = '<option disabled value="">-- 請選擇關鍵字 --</option>';
            for (let keywordreplyId in keywordreplies) {
                let keyword = keywordreplies[keywordreplyId].keyword;
                keywordreplyStr += '<option value="' + keyword + '">' + keyword + '</option>';
            }

            let $keywordsSelectors = $('.form-inputs select#keyword');
            $keywordsSelectors.each((i) => {
                $($keywordsSelectors[i]).html(keywordreplyStr).val('');
            });
        });
    });

    return api.apps.findAll(userId).then(function(resJson) {
        apps = resJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];

            // 目前只有 LINE 支援此功能
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
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            return reloadRichmenus(nowSelectAppId, userId).then(() => {
                $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
            });
        }
    });

    function appSourceChanged(ev) {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return reloadRichmenus(nowSelectAppId, userId);
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

        let config = window.chatshier.config;
        if (file.type.indexOf('image') < 0) {
            $('#modal-save').removeAttr('disabled');
            $('#modal-update-save').removeAttr('disabled');
            $.notify('請上傳圖檔');
            return;
        }
        if (file.type.indexOf('image') >= 0 && file.size > (config.imageFileMaxSize / 2)) {
            $('#modal-save').removeAttr('disabled');
            $('#modal-update-save').removeAttr('disabled');
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000 * 2)) + ' MB');
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

    function photoFormShow() {
        let $showRichmenuForm = $modal.find('.show-richmenu-form');
        let width = $showRichmenuForm.width();
        let height = $showRichmenuForm.height();
        let boxWidth = width / 3;
        let boxHeight = height / 2;

        elementHide($('.content-input'));
        $showRichmenuForm.css('background-color', '#CBCBCB');
        $showRichmenuForm.find('.box').remove();
        let checked = $('input[name = richmenu-form]:checked').val();

        switch (checked) {
            case 'form1':
                $showRichmenuForm.append(
                    '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px; height:' + height + 'px"></div>'
                );
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1')
                );
                elementHide($('.content-bar'));
                break;
            case 'form2':
                let widthForm6 = (boxWidth * 3) / 2;
                $showRichmenuForm.append(
                    '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>' +
                    '<div class="box" id="box2" data-x="' + widthForm6 + '" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>'
                );
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2')
                );
                elementHide($('.content-bar'));
                break;
            case 'form3':
                $showRichmenuForm.append(
                    '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>' +
                    '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '" style="width:' + width + 'px"></div>'
                );
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2')
                );
                elementHide($('.content-bar'));
                break;
            case 'form4':
                let widthForm4 = boxWidth * 2;
                $showRichmenuForm.append(
                    '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm4 + 'px; height:' + height + 'px"></div>' +
                    '<div class="box" id="box2" data-x="' + widthForm4 + '" data-y="0"></div>' +
                    '<div class="box" id="box3" data-x="' + widthForm4 + '" data-y="' + boxHeight + '"></div>'
                );
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3')
                );
                elementHide($('.content-bar'));
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
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3') +
                    generateBoxInputs('box4')
                );
                elementHide($('.content-bar'));
                break;
            case 'form6':
                $showRichmenuForm.append(
                    '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>' +
                    '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '"></div>' +
                    '<div class="box" id="box3" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>' +
                    '<div class="box" id="box4" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>'
                );
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3') +
                    generateBoxInputs('box4')
                );
                elementHide($('.content-bar'));
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
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3') +
                    generateBoxInputs('box4') +
                    generateBoxInputs('box5') +
                    generateBoxInputs('box6')
                );
                elementHide($('.content-bar'));
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
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3') +
                    generateBoxInputs('box4') +
                    generateBoxInputs('box5') +
                    generateBoxInputs('box6') +
                    generateBoxInputs('box7') +
                    generateBoxInputs('box8')
                );
                elementHide($('.content-bar'));
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
                $modal.find('.boxes-inputs').html(
                    generateBoxInputs('box1') +
                    generateBoxInputs('box2') +
                    generateBoxInputs('box3') +
                    generateBoxInputs('box4') +
                    generateBoxInputs('box5') +
                    generateBoxInputs('box6') +
                    generateBoxInputs('box7') +
                    generateBoxInputs('box8') +
                    generateBoxInputs('box9')
                );
                elementHide($('.content-bar'));
                break;
            default:
                break;
        }
    }

    function generateBoxInputs(boxId) {
        return (
            '<div class="px-1 content-bar" id="' + boxId + '-input">' +
                '<div class="form-check mx-1">' +
                    '<label class="col-form-label">' +
                        '<input class="form-check-input" type="radio" name="content" value="keyword">' +
                        '<strong>關鍵字</strong>' +
                    '</label>' +
                '</div>' +
                '<div class="form-check mx-1">' +
                    '<label class="col-form-label">' +
                        '<input class="form-check-input" type="radio" name="content" value="url">' +
                        '<strong>網址</strong>' +
                    '</label>' +
                '</div>' +
                '<div class="form-check mx-1">' +
                    '<label class="col-form-label">' +
                        '<input class="form-check-input" type="radio" name="content" value="text">' +
                        '<strong>文字</strong>' +
                    '</label>' +
                '</div>' +
                '<div class="form-check mx-1">' +
                    '<label class="col-form-label">' +
                        '<input class="form-check-input" type="radio" name="content" value="no-action">' +
                        '<strong>不設定</strong>' +
                    '</label>' +
                '</div>' +
            '</div>'
        );
    }

    function contentInputShow() {
        let boxInputId = $(this).parents('.content-bar').attr('id');
        let $formInput = $('.form-inputs .form-input#' + boxInputId);
        $formInput.removeClass('d-none').siblings().addClass('d-none');

        let contentInputId = $('input[name="content"]:checked').val();
        let contentInputValue = $('#' + contentInputId).val();
        if (!contentInputValue) {
            $('.content-input').val('');
        }

        if ('no-action' === contentInputId) {
            $('.box.checked').attr('ref', '');
            $(`#${boxInputId} #text`).val('').siblings('#url').val('');
        }

        elementHide($('.content-input'));
        let $contentInput = $(`#${boxInputId} #${contentInputId}`);
        $contentInput.removeClass('d-none');

        $contentInput.off('input').on('input', function() {
            let val = $(this).val() || '';
            let boxId = $('.box.checked').attr('id');
            $('#' + boxId).attr('ref', val);
        });
    }

    function contentBarShow() {
        let $box = $(this);
        let $boxesInputs = $('.boxes-inputs');
        let $formInputs = $('.form-inputs');

        let boxId = $box.attr('id');
        let inputValue = $box.attr('ref');
        if ($box.hasClass('marked')) {
            inputTypeCheck(boxId, inputValue);
        }

        $box.siblings().removeClass('checked').css('background-color', '');
        $box.addClass('checked').css('background-color', 'rgba(158, 158, 158, .7)');

        elementHide($('.content-input'));
        $('#' + boxId + ' input[name="content"]').removeAttr('checked');
        $boxesInputs.find('.content-bar').addClass('d-none').trigger('click');
        $boxesInputs.find('#' + boxId + '-input').removeClass('d-none');

        $formInputs.find('input').val('');
        $formInputs.find('.content-bar').addClass('d-none');

        let $formInput = $formInputs.find('#' + boxId + '-input');
        $formInput.removeClass('d-none').siblings().addClass('d-none');

        if (inputValue) {
            elementShow($formInputs);
            if (inputValue.startsWith('http://') || inputValue.startsWith('https://')) {
                $formInput.find('#url').attr('value', inputValue).val(inputValue).removeClass('d-none');
            } else {
                $formInput.find('#text').attr('value', inputValue).val(inputValue).removeClass('d-none');
            }
        }
    }

    function inputTypeCheck(id, inputValue) {
        let keywordOptionElement = $('#keyword option');
        keywordOptionElement.each(function() {
            if ($(this).val() === inputValue) {
                $(this).prop('select', true);
                $(`#${id}-input input[value = keyword]`).prop('checked', true);
            }
        });

        if (!inputValue) {
            $(`#${id}-input input[value="no-action"]`).prop('checked', true);
        } else if (inputValue.includes('http://') || inputValue.includes('https://')) {
            $(`#${id}-input #url`).val(inputValue);
            $(`#${id}-input input[value="url"]`).prop('checked', true);
        } else {
            $(`#${id}-input #text`).val(inputValue);
            $(`#${id}-input input[value="text"]`).prop('checked', true);
        }
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
        }).catch(() => {
            $activateBtn.removeAttr('disabled').text('未啟用');
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
                return '未設定';
            case 'uri':
                return action.uri;
            default:
                return action.text;
        }
    }

    function appendRichmenu() {
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        let src;
        elementHide($('#modal-save'));
        elementShow($('#modal-update-save'));
        $modal.find('#modal-update-save').off('click').on('click', () => updateRichmenu(appId, richmenuId, src));

        return Promise.resolve().then(() => {
            let richemnu = appsRichmenus[appId] ? appsRichmenus[appId].richmenus[richmenuId] : void 0;
            if (!richemnu) {
                return api.appsRichmenus.findOne(appId, richmenuId, userId).then((resJson) => {
                    let _appsRichmenus = resJson.data;
                    if (!appsRichmenus[appId]) {
                        appsRichmenus[appId] = { richmenus: {} };
                    }
                    let richmenus = _appsRichmenus[appId].richmenus;
                    Object.assign(appsRichmenus[appId].richmenus, richmenus);
                    richemnu = richmenus[richmenuId];
                    return richemnu;
                });
            }
            return richemnu;
        }).then((richemnu) => {
            let areas = richemnu.areas;
            let photoForm = richemnu.form;
            size = richemnu.size;
            src = richemnu.src;

            $appSelector.parents('.form-group').addClass('d-none');

            let $richmenuForm = $modal.find('.richmenu-form');
            $richmenuForm.find('.richmenu-select').val(richemnu.selected + '');
            $richmenuForm.find('input[name="richmenuName"]').val(richemnu.name);
            $richmenuForm.find('input[name="chatbarText"]').val(richemnu.chatBarText);
            $richmenuForm.find('input[value=' + photoForm + ']').prop('checked', true);

            richemnu.src && $('.show-richmenu-form')
                .css('background', 'url(' + richemnu.src + ') center no-repeat')
                .css('background-size', '100% 100%');

            photoFormShow();

            let $showRichmenuForm = $richmenuForm.find('.show-richmenu-form');
            let $boxes = $showRichmenuForm.find('.box');

            $boxes.each(function(i) {
                let $box = $($boxes[i]);
                let text = !areas[i].action.text ? areas[i].action.uri : areas[i].action.text;

                $box.addClass('marked');
                $box.attr('ref', text);
            });
        });
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
        if (app.type !== api.apps.enums.type.LINE) {
            return Promise.resolve();
        }

        let $dropdownText = $appDropdown.find('.dropdown-toggle .dropdown-text');
        let bakAppName = $dropdownText.html();
        $dropdownText.html(bakAppName + '<i class="ml-2 fas fa-sync fa-spin"></i>');

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

    function insertRichmenu() {
        elementDisabled($(this), handleMessages.working);
        let appId = $appSelector.find('option:selected').val();
        let selected = 'true' === $('.richmenu-select').val();
        let chatBarText = $('input[name="chatbarText"]').val();
        let form = $('input[name = richmenu-form]:checked').val();

        if (!appId || !chatBarText) {
            elementEnabled($('#modal-save'), handleMessages.addFinished);
            return $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        }

        let areas = composeAreaObject();
        if (!areas) {
            return;
        }

        let postRichmenu = {
            selected: selected,
            chatBarText: chatBarText,
            name: 'Chatshier Richmenu',
            form: form,
            src: '',
            size: size,
            areas: areas
        };

        $(this).attr('disabled', 'disabled').empty().append('<i class="fas fa-circle-notch fa-spin fa-fw"></i>處理中');
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

    function updateRichmenu(appId, richmenuId, src) {
        elementDisabled($('#modal-update-save'), handleMessages.working);
        let selected = 'true' === $('.richmenu-select').val();
        let chatBarText = $('input[name="chatbarText"]').val();
        let form = $('input[name="richmenu-form"]:checked').val();
        let areas = composeAreaObject();

        if (!areas) {
            return;
        }

        let putRichmenu = {
            selected: selected,
            chatBarText: chatBarText,
            name: 'Chatshier Richmenu',
            form: form,
            src: src,
            size: size,
            areas: areas
        };

        $('#modal-update-save').attr('disabled', 'disabled').empty().append('<i class="fas fa-circle-notch fa-spin fa-fw"></i>處理中');
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

    function removeRichmenu() {
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');

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

    function composeAreaObject() {
        let $richmenuForm = $modal.find('.richmenu-form');
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

        let $boxesInputs = $richmenuForm.find('.boxes-inputs');
        let $formInputs = $richmenuForm.find('.form-inputs');

        let $boxes = $showRichmenuForm.find('.box');
        let areas = [];
        $boxes.each(function() {
            let $box = $(this);
            let boxId = $box.attr('id');
            let textType = $boxesInputs.find('#' + boxId + '-input input[name="content"]:checked').val();
            let $textInput = $formInputs.find('#' + boxId + '-input #' + textType);
            let text = $textInput.val() || $box.attr('ref');

            if ('url' === textType && text) {
                if (!text.startsWith('http://') && !text.startsWith('https://')) {
                    text = window.location.protocol + '//' + text;
                }
            }

            let boxWidth = $box.width();
            let boxHeight = $box.height();
            let x = parseInt($box.data('x'));
            let y = parseInt($box.data('y'));

            let area = {
                // 將 長寬 及 座標 依圖片大小縮放並四捨五入
                bounds: {
                    x: Math.round(x * widthRate),
                    y: Math.round(y * heightRate),
                    width: Math.round(boxWidth * widthRate),
                    height: Math.round(boxHeight * heightRate)
                },
                action: getRichmenuTextType(text)
            };

            areas.push(area);
        });
        return areas;
    }

    function getRichmenuTextType(text) {
        let richmenuTextType = {};

        if (!text) {
            richmenuTextType.type = 'postback';
            richmenuTextType.data = 'message=none';
            return richmenuTextType;
        }

        if (text.startsWith('http://') ||
            text.startsWith('https://')) {
            richmenuTextType.type = 'uri';
            richmenuTextType.uri = text;
            return richmenuTextType;
        }

        richmenuTextType.type = 'message';
        richmenuTextType.text = text;
        return richmenuTextType;
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
})();
