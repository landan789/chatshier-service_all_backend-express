/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;
    var nowSelectAppId = '';
    var size = {};
    var imageFile = '';

    var $modal = $('#imagemap-modal');

    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = imagemap-form]', photoFormShow);
    $jqDoc.on('click', '.box', contentBarShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '#insert-btn', insertImagemap);
    $modal.on('hidden.bs.modal', function() {
        cleanmodal();
    });

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
            $.notify('請上傳圖檔');
            return;
        }
        if (file.type.indexOf('image') >= 0 && file.size > (config.imageFileMaxSize / 2)) {
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000 * 2)) + ' MB');
            return;
        }

        // 將檔案轉 base64 的 URL
        reader.onloadend = function(e) {
            let url = e.target.result;
            // 取得圖檔的長 寬
            let image = new Image();
            image.onload = function() {
                if (1040 !== image.width || 1040 !== image.height) {
                    $.notify('圖檔尺寸不符，須為: 1040 * 1040 px');
                    return;
                }
                size.width = image.width;
                size.height = image.height;
                $('.show-imagemap-form')
                    .css('background', 'url(' + url + ') center no-repeat')
                    .css('background-size', 'cover')
                    .css('background-color', 'none');
                imageFile = file;
            };
            image.src = url;
        };
        reader.readAsDataURL(file);
    }

    function photoFormShow() {
        let width = $modal.find('.show-imagemap-form').width();
        let height = $modal.find('.show-imagemap-form').height();
        let boxWidth = width / 3;
        let boxHeight = height / 2;
        $('.content-input').addClass('d-none');
        $('.form-group.col-sm-12').addClass('d-none');
        $modal.find('.show-imagemap-form').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-imagemap-form').find('.box').remove();
        let checked = $('input[name = imagemap-form]:checked').val();
        let box1 = '';
        let box2 = '';
        let box3 = '';
        let box4 = '';
        let box5 = '';
        let box6 = '';
        let box1Input = '';
        let box2Input = '';
        let box3Input = '';
        let box4Input = '';
        let box5Input = '';
        let box6Input = '';
        switch (checked) {
            case 'form8':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0"></div>';
                box2 = '<div class="box" id="box2" data-x="' + boxWidth + '" data-y="0"></div>';
                box3 = '<div class="box" id="box3" data-x="' + boxWidth * 2 + '" data-y="0"></div>';
                box4 = '<div class="box" id="box4" data-x="0" data-y="' + boxHeight + '"></div>';
                box5 = '<div class="box" id="box5" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>';
                box6 = '<div class="box" id="box6" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-imagemap-form').append(box1 + box2 + box3 + box4 + box5 + box6);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                box3Input = showBoxInputs('box3');
                box4Input = showBoxInputs('box4');
                box5Input = showBoxInputs('box5');
                box6Input = showBoxInputs('box6');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input + box3Input + box4Input + box5Input + box6Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form7':
                let heightForm7 = boxHeight;
                heightForm7 = heightForm7 / 2;
                box1 = `<div class="box" id="box1" data-x="0" data-y="0" style="width: ${width}px"></div>`;
                box2 = `<div class="box" id="box2" data-x="0" data-y="${boxHeight}" style="width: ${width}px; height: ${heightForm7}px"></div>`;
                box3 = `<div class="box" id="box3" data-x="0" data-y="${heightForm7}" style="width: ${width}px; height: ${heightForm7}px"></div>`;
                $modal.find('.show-imagemap-form').append(box1 + box2 + box3);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                box3Input = showBoxInputs('box3');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input + box3Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form6':
                let widthForm6 = boxWidth;
                widthForm6 = (widthForm6 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = `<div class="box" id="box2" data-x="0" data-y="${boxHeight}" style="width: ${(width / 2)}px"></div>`;
                box3 = `<div class="box" id="box3" data-x="${widthForm6}" data-y="${boxHeight}" style="width: ${(width / 2)}px"></div>`;
                $modal.find('.show-imagemap-form').append(box1 + box2 + box3);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                box3Input = showBoxInputs('box3');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input + box3Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form5':
                let widthForm5 = boxWidth;
                widthForm5 = (widthForm5 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm5 + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthForm5 + '" data-y="0" style="width:' + widthForm5 + 'px"></div>';
                box3 = '<div class="box" id="box3" data-x="0" data-y="' + boxHeight + '" style="width:' + widthForm5 + 'px"></div>';
                box4 = '<div class="box" id="box4" data-x="' + widthForm5 + '" data-y="' + boxHeight + '" style="width:' + widthForm5 + 'px"></div>';
                $modal.find('.show-imagemap-form').append(box1 + box2 + box3 + box4);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                box3Input = showBoxInputs('box3');
                box4Input = showBoxInputs('box4');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input + box3Input + box4Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form4':
                let heightForm4 = boxHeight * 2 / 3;
                box1 = `<div class="box" id="box1" data-x="0" data-y="0" style="width: ${width}px; height: ${heightForm4}px"></div>`;
                box2 = `<div class="box" id="box2" data-x="0" data-y="${heightForm4}" style="width: ${width}px; height: ${heightForm4}px"></div>`;
                box3 = `<div class="box" id="box3" data-x="0" data-y="${heightForm4 * 2}" style="width: ${width}px; height: ${heightForm4}px"></div>`;
                $modal.find('.show-imagemap-form').append(box1 + box2 + box3);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                box3Input = showBoxInputs('box3');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input + box3Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form3':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '" style="width:' + width + 'px"></div>';
                $modal.find('.show-imagemap-form').append(box1 + box2);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form2':
                let widthForm2 = boxWidth;
                widthForm2 = (widthForm2 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm2 + 'px; height:' + height + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthForm2 + '" data-y="0" style="width:' + widthForm2 + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-imagemap-form').append(box1 + box2);
                box1Input = showBoxInputs('box1');
                box2Input = showBoxInputs('box2');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input + box2Input);
                $('.content-bar').addClass('d-none');
                break;
            case 'form1':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-imagemap-form').append(box1);
                box1Input = showBoxInputs('box1');
                $modal.find('.boxes-inputs').empty();
                $modal.find('.boxes-inputs').append(box1Input);
                $('.content-bar').addClass('d-none');
                break;
            default:
                break;
        }
    }

    function contentBarShow() {
        let id = $(this).attr('id');
        $(this).siblings().removeClass('checked');
        $('.content-input').addClass('d-none');
        $(`#${id} input[name = content]`).removeAttr('checked');
        $(`.boxes-inputs .content-bar`).removeClass('d-none');
        $(`.boxes-inputs .content-bar`).addClass('d-none');
        $(`.boxes-inputs .content-bar#${id}-input`).removeClass('d-none');
        $(this).css('background-color', 'rgba(158,158,158,0.7)');
        $(this).addClass('checked');
    }

    function contentInputShow() {
        let boxInput = $(this).parent().parent().parent().attr('id');
        let contentInputId = $('input[name = content]:checked').val();
        let contentInputValue = $('#' + contentInputId).val();
        if (!contentInputValue) {
            $('.content-input').val('');
        }
        $('.content-input').addClass('d-none');
        $(`.form-group.col-sm-12#${boxInput}`).removeClass('d-none');
        $(`#${boxInput} #${contentInputId}`).removeClass('d-none');
        $(`#${boxInput} #${contentInputId}`).change(function() {
            var val = $(this).val();
            if (val) {
                let boxId = $('.box.checked').attr('id');
                $('#' + boxId).attr('ref', val);
                $('#' + boxId).removeClass('checked');
                $(this).siblings().val();
            }
        });
    }

    function cleanmodal() {
        $('#insert-btn').removeClass('d-none');
        $('#update-btn').addClass('d-none');
        $('.form-group.col-sm-12').addClass('d-none');
        $modal.find('input[type = text]').val('');
        $modal.find('input[type = datetime-local]').val('');
        $modal.find('input[type = url]').val('');
        $modal.find('input[type = file]').val('');
        $modal.find('.show-imagemap-form').removeAttr('style');
        $modal.find('.show-imagemap-form').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-imagemap-form').find('.box').remove();
        $modal.find('input[value = "form1"]').prop('checked', true);
        $modal.find('input[name = "content"]').prop('checked', false);
        photoFormShow();
    }

    function insertImagemap() {
        let appId = $appSelector.find('option:selected').val();
        let title = $('#title').val();
        let form = $('input[name = imagemap-form]:checked').val();
        let originalFilePath = '';

        if (!appId || !title) {
            return $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        }

        let actions = composeActions();

        Promise.resolve().then(() => {
            return api.bot.uploadFile(appId, userId, imageFile);
        }).then((resJson) => {
            let url = resJson.data.url;
            originalFilePath = resJson.data.originalFilePath;

            let postImagemap = {
                type: 'imagemap',
                baseUri: url,
                altText: 'imagemap create by chatshier via line',
                baseSize: {
                    height: 1040,
                    width: 1040
                },
                actions,
                form
            };
            return api.appsImagemaps.insert(appId, userId, postImagemap);
        }).then((resJson) => {
            let appsImagemaps = resJson.data;
            let imagemap = appsImagemaps[appId].richmenus;
            let imagemapId = Object.keys(imagemap)[0];
            return api.bot.moveFile(appId, imagemapId, userId, originalFilePath);
        }).then(() => {
            $('#imagemap-modal').modal('hide');
            loadImagemaps(appId, userId);
        });
    }

    function composeActions() {
        let width = $modal.find('.show-imagemap-form').width();
        let height = $modal.find('.show-imagemap-form').height();

        let imgWidth = size.width;
        let imgHeight = size.height;
        if (!imgWidth || !imgHeight) {
            return $.notify('請上傳圖片', { type: 'warning' });
        }

        // 取得 長 寬 比例尺
        let widthRate = imgWidth / width;
        let heightRate = imgHeight / height;

        let boxElements = $('.box');
        let actions = [];
        boxElements.each(function() {
            let boxWidth = $(this).width();
            let boxHeight = $(this).height();
            let x = parseInt($(this).attr('data-x'));
            let y = parseInt($(this).attr('data-y'));
            let text = $(this).attr('ref');

            // 將 長寬 及 座標 依圖片大小縮放並四捨五入
            let sacledWidth = Math.round(boxWidth * widthRate);
            let scaledHeight = Math.round(boxHeight * heightRate);
            let scaledX = Math.round(x * widthRate);
            let scaledY = Math.round(y * heightRate);

            let action;
            if (text.startsWith('https://') || text.startsWith('http://')) {
                action = {
                    type: 'uri',
                    linkUri: text,
                    area: {
                        x: scaledX,
                        y: scaledY,
                        width: sacledWidth,
                        height: scaledHeight
                    }
                };
            } else {
                action = {
                    type: 'message',
                    text: text,
                    area: {
                        x: scaledX,
                        y: scaledY,
                        width: sacledWidth,
                        height: scaledHeight
                    }
                };
            }

            actions.push(action);
        });
        return actions;
    }

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadImagemaps(nowSelectAppId, userId);
    }

    function loadImagemaps(appId, userId) {
        $('table #imagemap-list').empty();
        return api.appsImagemaps.findAll(appId, userId).then(function(resJson) {
            let appsImagemaps = resJson.data;
            let imagemaps = appsImagemaps[appId] ? appsImagemaps[appId].imagemaps : {};
            for (let imagemapId in imagemaps) {
                if (!imagemaps[imagemapId].isDeleted) {
                    groupType(imagemapId, imagemaps[imagemapId], appId);
                }
            }
        });
    }

    function groupType(imagemapId, imagemap, appId) {
        let linkText = '';
        for (let i = 0; i < imagemap.actions.length; i++) {
            if (0 === i) {
                linkText = linkText + actionType(imagemap.actions[i]);
            } else {
                linkText = linkText + '，' + actionType(imagemap.actions[i]);
            }
        }
        var trGrop =
            '<tr id="' + imagemapId + '" rel="' + appId + '">' +
                '<th>' + imagemap.title + '</th>' +
                '<td id="photoForm" data-form="' + imagemap.form + '" data-url="' + imagemap.baseUri + '">種類 ' + imagemap.form.slice(-1) + '</td>' +
                '<td>' + linkText + '</td>' +
                '<td>' +
                    '<button type="button" id="update-btn" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" data-toggle="modal" data-target="#imagemap-modal" aria-hidden="true"></button>' +
                    '<button type="button" id="remove-btn" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove"></button>' +
                '</td>' +
            '</tr>';
        $('table #imagemap-list').append(trGrop);
    }

    function actionType(action) {
        switch (action.type) {
            case 'uri':
                return action.linkUri;
            case 'message':
                return action.text;
            default:
                return '';
        }
    }

    function showBoxInputs(className) {
        return '<div class="row col-sm-12 content-bar" id="' + className + '-input">' +
            '<div class="form-group px-3">' +
                '<label class="col-form-label">' +
                    '<input type="radio" name="content" value="url">' +
                    '<strong>網址</strong>' +
                '</label>' +
            '</div>' +
            '<div class="form-group px-3">' +
                '<label class="col-form-label">' +
                    '<input type="radio" name="content" value="text">' +
                    '<strong>文字</strong>' +
                '</label>' +
            '</div>' +
        '</div>';
    }

    return api.apps.findAll(userId).then(function(resJson) {
        var appsData = resJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        $('.content-bar').addClass('d-none');
        $('.content-input').addClass('d-none');
        cleanmodal();

        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }
            $dropdownMenu.append('<li><a  class="dropdown-item" id="' + appId + '">' + app.name + '</a></li>');
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadImagemaps(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });
})();
