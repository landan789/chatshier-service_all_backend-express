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
    var imageFile = '';

    var $modal = $('#richmenu-modal');

    const NO_PERMISSION_CODE = '3.16';

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

    $jqDoc.on('click', '#remove-btn', remove);

    $('.content-bar').addClass('d-none');
    $('.content-input').addClass('d-none');
    $jqDoc.on('click', '#modal-save', insertRichmenu); // add richmenu, not activated.
    $jqDoc.on('click', '#add-btn', cleanModal); // cleaning the options in modal.
    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = richmenu-form]', photoFormShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '.box', contentBarShow);
    $jqDoc.on('click', '#deactivate-btn', activateMenu);
    $jqDoc.on('click', '#activate-btn', deactivateMenu);
    $jqDoc.on('click', '#update-btn', appendRichmenu);

    $modal.on('hidden.bs.modal', function() {
        $appSelector.parent().parent().removeClass('d-none');
        $('#modal-save').removeAttr('disabled').empty().text('新增');
        $('#modal-update-save').removeAttr('disabled').empty().text('修改');
        $(`.form-inputs input`).val('');
        imageFile = '';
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
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
            return loadRichmenus(nowSelectAppId, userId);
        }
    });

    function appSourceChanged(ev) {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadRichmenus(nowSelectAppId, userId);
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

        // // 將檔案轉 blob 的 URL
        // // URL 沒有用到後，要呼叫 URL.revokeObjectURL()，將 create 的 URl 釋放
        // let url = URL.createObjectURL(file) || webkitURL.createObjectURL(file);
        // // 取得圖檔的長 寬
        // reader.onload = function(e) {
        //     let binaryString = e.target.result;
        //     let image = new Image();
        //     image.onload = function() {
        //         imgWidth = image.width;
        //         imgHeight = image.height;
        //         size.width = imgWidth;
        //         size.height = imgHeight;
        //     };
        //     image.src = url;
        //     $('.show-richmenu-type')
        //         .css('background', 'url(' + url + ') center no-repeat')
        //         .css('background-size', 'cover')
        //         .css('background-color', 'none');
        //     imageFile = binaryString;
        // };
        // reader.readAsBinaryString(file);

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

        $('.content-input').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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
                $('.content-bar').addClass('d-none');
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

        $('.content-input').addClass('d-none');
        $(`#${boxInputId} #${contentInputId}`).removeClass('d-none');
        $(`#${boxInputId} #${contentInputId}`).change(function() {
            var val = $(this).val();
            if (val) {
                let boxId = $('.box.checked').attr('id');
                $('#' + boxId).attr('ref', val);
                $('#' + boxId).removeClass('checked');
                $(this).siblings().val();
            }
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

        $('.content-input').addClass('d-none');
        $('#' + boxId + ' input[name="content"]').removeAttr('checked');
        $boxesInputs.find('.content-bar').addClass('d-none').trigger('click');
        $boxesInputs.find('#' + boxId + '-input').removeClass('d-none');

        $formInputs.find('input').val('');
        $formInputs.find('.content-bar').addClass('d-none');

        let $formInput = $formInputs.find('#' + boxId + '-input');
        $formInput.removeClass('d-none').siblings().addClass('d-none');

        if (inputValue) {
            $formInputs.removeClass('d-none');
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

    function cleanModal() {
        $('#modal-save').removeClass('d-none');
        $('#modal-update-save').addClass('d-none');

        $modal.find('input[type="text"]').val('');
        $modal.find('input[type="datetime-local"]').val('');
        $modal.find('input[type="url"]').val('');
        $modal.find('input[type="file"]').val('');

        let $showRichmenuForm = $modal.find('.show-richmenu-form');
        $showRichmenuForm.removeAttr('style');
        $showRichmenuForm.css('background-color', '#CBCBCB');
        $showRichmenuForm.empty();

        $modal.find('input[value="form1"]').prop('checked', true);
        $modal.find('input[name="content"]').prop('checked', false);
        photoFormShow();
    }

    function activateMenu() {
        $(this).attr('disabled', 'disabled').text('啟用中...');
        let appId = $(this).parents().parents().attr('rel');
        let richmenuId = $(this).parents().parents().attr('id');

        return api.bot.activateMenu(appId, richmenuId, userId).then(() => {
            $(this).removeAttr('disabled');
            $('#' + richmenuId).remove();
            return loadRichmenus(appId, userId);
        }).then(() => {
            $.notify('成功啟用', { type: 'success' });
        }).catch(() => {
            $(this).removeAttr('disabled').text('未啟用');
            $.notify('失敗', { type: 'danger' });
        });
    }

    function deactivateMenu() {
        $(this).attr('disabled', 'disabled').text('取消啟用...');
        let appId = $(this).parents().parents().attr('rel');
        let richmenuId = $(this).parents().parents().attr('id');
        return api.bot.deactivateMenu(appId, richmenuId, userId).then(() => {
            return loadRichmenus(appId, userId);
        }).then(() => {
            $(this).removeAttr('disabled');
            return $.notify('成功取消啟用', { type: 'success' });
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
                    if (richmenu.platformMenuId) {
                        return (
                            '<td>' +
                                '<button type="button" id="activate-btn" class="btn btn-success btn-border" data-status="true">已啟用</button>' +
                            '</td>' +
                            '<td></td>'
                        );
                    }

                    return (
                        '<td>' +
                            '<button type="button" id="deactivate-btn" class="btn btn-light btn-border" data-status="false">未啟用</button>' +
                        '</td>' +
                        '<td>' +
                            '<button type="button" id="update-btn" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" data-toggle="modal" data-target="#richmenu-modal" aria-hidden="true"></button>' +
                            '<button type="button" id="remove-btn" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove"></button>' +
                        '</td>'
                    );
                })() +
            '</tr>'
        );

        if (richmenu.platformMenuId) {
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
        $('#modal-save').addClass('d-none');
        $('#modal-update-save').removeClass('d-none');
        $modal.find('#modal-update-save').off('click').on('click', () => updateRichmenu(appId, richmenuId, src));

        return Promise.resolve().then(() => {
            let richemnu = appsRichmenus[appId] ? appsRichmenus[appId].richmenus[richmenuId] : void 0;
            if (!richemnu) {
                return api.appsRichmenus.findOne(appId, richmenuId, userId).then((resJson) => {
                    let _appsRichmenus = resJson.data;
                    if (!appsRichmenus[appId]) {
                        appsRichmenus[appId] = { richmenus: {} };
                    }
                    Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                    richemnu = _appsRichmenus[appId].richmenus[richmenuId];
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
                let type = 'postback' === areas[i].action.type ? '未設定' : areas[i].action.type;

                $box.css('background-color', 'rgba(158,158,158, 0.7)');
                $box.text(`${type}:\n${text || ''}`);
                $box.addClass('marked');
                $box.attr('ref', text);
            });
        });
    }

    function loadRichmenus(appId, userId, noFetch) {
        $('table #richmenu').empty();
        $('table #activated-richmenu').empty();

        return Promise.resolve().then(() => {
            if (!noFetch) {
                return api.appsRichmenus.findAll(appId, userId).then((resJson) => {
                    return resJson.data;
                });
            }
            return appsRichmenus;
        }).then(function(_appsRichmenus) {
            if (!(_appsRichmenus && _appsRichmenus[appId])) {
                return;
            }

            if (!appsRichmenus[appId]) {
                appsRichmenus[appId] = { richmenus: {} };
            }
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

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

    function insertRichmenu() {
        $(this).attr('disabled', 'disabled').empty().append('<i class="fas fa-sync fa-spin"></i>處理中');
        let appId = $appSelector.find('option:selected').val();
        let selected = $('.richmenu-select').val();
        let chatBarText = $('input[name="chatbarText"]').val();
        let form = $('input[name = richmenu-form]:checked').val();
        let originalFilePath = '';

        if (!appId || !chatBarText) {
            $('#modal-save').removeAttr('disabled');
            $('#modal-update-save').removeAttr('disabled');
            return $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        }

        return api.image.uploadFile(appId, userId, imageFile).then((resJson) => {
            let url = resJson.data.url;
            originalFilePath = resJson.data.originalFilePath;

            let areas = composeAreaObject();
            let postRichmenu = {
                selected: selected,
                chatBarText: chatBarText,
                name: 'Chatshier Richmenu',
                form: form,
                src: url,
                size: size,
                areas: areas
            };
            return api.appsRichmenus.insert(appId, userId, postRichmenu);
        }).then((resJson) => {
            let _appsRichmenus = resJson.data;
            if (!appsRichmenus[appId]) {
                appsRichmenus[appId] = { richmenus: {} };
            }
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

            let richemnu = _appsRichmenus[appId].richmenus;
            let richmenuId = Object.keys(richemnu)[0];
            return api.image.moveFile(appId, richmenuId, userId, originalFilePath);
        }).then(() => {
            $('#richmenu-modal').modal('hide');
            $.notify('新增成功', { type: 'success' });
            loadRichmenus(appId, userId, true);
        }).catch(() => {
            $('#modal-save').removeAttr('disabled').empty().text('新增');
            $('#modal-update-save').removeAttr('disabled').empty().text('修改');
            $.notify('新增失敗', { type: 'danger' });
        });
    }

    function updateRichmenu(appId, richmenuId, src) {
        let selected = $('.richmenu-select').val();
        let chatBarText = $('input[name="chatbarText"]').val();
        let form = $('input[name="richmenu-form"]:checked').val();
        let areas = composeAreaObject();

        let putRichmenu = {
            selected: selected,
            chatBarText: chatBarText,
            name: 'Chatshier Richmenu',
            form: form,
            src: src,
            size: size,
            areas: areas
        };

        $('#modal-update-save').attr('disabled', 'disabled').empty().append('<i class="fas fa-sync fa-spin"></i>處理中');

        if (!imageFile) {
            return api.appsRichmenus.update(appId, richmenuId, userId, putRichmenu).then((resJson) => {
                let _appsRichmenus = resJson.data;
                Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);
                $('#richmenu-modal').modal('hide');
                return loadRichmenus(appId, userId, true);
            }).then(() => {
                $('#modal-update-save').removeAttr('disabled');
                return $.notify('修改成功', { type: 'success' });
            }).catch(() => {
                $('#modal-update-save').removeAttr('disabled').empty().text('修改');
                $.notify('修改失敗', { type: 'danger' });
            });
        }

        return api.image.uploadFile(appId, userId, imageFile).then((resJson) => {
            putRichmenu.src = resJson.data.url;
            return api.appsRichmenus.update(appId, richmenuId, userId, putRichmenu);
        }).then((resJson) => {
            let _appsRichmenus = resJson.data;
            Object.assign(appsRichmenus[appId].richmenus, _appsRichmenus[appId].richmenus);

            $('#richmenu-modal').modal('hide');
            $.notify('修改成功', { type: 'success' });
            return loadRichmenus(appId, userId, true);
        }).catch(() => {
            $('#modal-save').removeAttr('disabled').empty().text('新增');
            $('#modal-update-save').removeAttr('disabled').empty().text('修改');
            $.notify('修改失敗', { type: 'danger' });
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
            $('#modal-save').removeAttr('disabled');
            $('#modal-update-save').removeAttr('disabled');
            return $.notify('請上傳圖片', { type: 'warning' });
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
                if (!text.startsWith('http://') || !text.startsWith('https://')) {
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

    function remove() {
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        // let status = JSON.parse($(this).parent().siblings().children().attr('data-status')); // 將string轉成boolean
        // TODO
        return Promise.resolve().then(() => {
            return showDialog('確定要刪除嗎？');
        }).then(function(isOK) {
            if (!isOK) {
                let cancelDelete = '取消刪除';
                return Promise.reject(cancelDelete);
            }
            return Promise.resolve();
        }).then(() => {
            return api.appsRichmenus.remove(appId, richmenuId, userId);
        }).then((resJson) => {
            $('#' + richmenuId).remove();
            $.notify('刪除成功！', { type: 'success' });
        }).catch((ERR) => {
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
})();
