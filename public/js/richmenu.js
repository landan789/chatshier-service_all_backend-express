/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;
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

    $jqDoc.on('click', '#remove-btn', remove);

    $('.content-bar').addClass('d-none');
    $('.content-input').addClass('d-none');
    $jqDoc.on('click', '#modal-save', saveRichMenus);
    $jqDoc.on('click', '#add-btn', cleanmodal);
    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = richmenu-form]', photoFormShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '.box', contentBarShow);
    $jqDoc.on('click', '#deactivate-btn', activateMenu);
    $jqDoc.on('click', '#activate-btn', deactivateMenu);
    $jqDoc.on('click', '#update-btn', appenedData);
    $jqDoc.on('click', '#modal-update-save', update);

    $modal.on('hidden.bs.modal', function() {
        $appSelector.parent().parent().removeClass('d-none');
        // $('#')
    });

    $modal.on('show.bs.modal', function() {
        $('#keyword').empty();
        let keywordreplyStr = '';
        let appId = $appSelector.find('option:selected').val();

        return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
            let appsKeywordreplies = resJson.data;
            let keywordreply = appsKeywordreplies[appId].keywordreplies;
            for (let keywordreplyId in keywordreply) {
                let keyword = keywordreply[keywordreplyId].keyword;
                keywordreplyStr += '<option value="' + keyword + '">' + keyword + '</option>';
            }
            $('#keyword').append(keywordreplyStr);
        });
    });

    return api.apps.findAll(userId).then(function(resJson) {
        var appsData = resJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

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
            loadRichmenus(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadRichmenus(nowSelectAppId, userId);
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
            $.notify('請上傳圖檔');
            return;
        }
        if (file.type.indexOf('image') >= 0 && file.size > (config.imageFileMaxSize / 2)) {
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
                    $.notify('圖檔尺寸不符，須為: 2500 * 1686 px 或 2500 * 843 px');
                    return;
                }
                size.width = image.width;
                size.height = image.height;
                $('.show-richmenu-form')
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
        let width = $modal.find('.show-richmenu-form').width();
        let height = $modal.find('.show-richmenu-form').height();
        let boxWidth = width / 3;
        let boxHeight = height / 2;
        $('.content-bar').addClass('d-none');
        $('.content-input').addClass('d-none');
        $modal.find('.show-richmenu-form').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-richmenu-form').find('.box').remove();
        let checked = $('input[name = richmenu-form]:checked').val();
        let box1 = '';
        let box2 = '';
        let box3 = '';
        let box4 = '';
        let box5 = '';
        let box6 = '';
        switch (checked) {
            case 'form1':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0"></div>';
                box2 = '<div class="box" id="box2" data-x="' + boxWidth + '" data-y="0"></div>';
                box3 = '<div class="box" id="box3" data-x="' + boxWidth * 2 + '" data-y="0"></div>';
                box4 = '<div class="box" id="box4" data-x="0" data-y="' + boxHeight + '"></div>';
                box5 = '<div class="box" id="box5" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>';
                box6 = '<div class="box" id="box6" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2 + box3 + box4 + box5 + box6);
                break;
            case 'form2':
                let widthForm2 = boxWidth;
                widthForm2 = (widthForm2 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm2 + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthForm2 + '" data-y="0" style="width:' + widthForm2 + 'px"></div>';
                box3 = '<div class="box" id="box3" data-x="0" data-y="' + boxHeight + '" style="width:' + widthForm2 + 'px"></div>';
                box4 = '<div class="box" id="box4" data-x="' + widthForm2 + '" data-y="' + boxHeight + '" style="width:' + widthForm2 + 'px"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2 + box3 + box4);
                break;
            case 'form3':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '"></div>';
                box3 = '<div class="box" id="box3" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>';
                box4 = '<div class="box" id="box4" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2 + box3 + box4);
                break;
            case 'form4':
                let widthForm4 = boxWidth;
                widthForm4 = widthForm4 * 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm4 + 'px; height:' + height + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthForm4 + '" data-y="0"></div>';
                box3 = '<div class="box" id="box3" data-x="' + widthForm4 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2 + box3);
                break;
            case 'form5':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '" style="width:' + width + 'px"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2);
                break;
            case 'form6':
                let widthForm6 = boxWidth;
                widthForm6 = (widthForm6 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthForm6 + '" data-y="0" style="width:' + widthForm6 + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-richmenu-form').append(box1 + box2);
                break;
            case 'form7':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-richmenu-form').append(box1);
                break;
            default:
                break;
        }
    }

    function contentInputShow() {
        let contentInputId = $('input[name = content]:checked').val();
        let contentInputValue = $('#' + contentInputId).val();
        if (!contentInputValue) {
            $('.content-input').val('');
        }
        $('.content-input').addClass('d-none');
        $('#' + contentInputId).removeClass('d-none');
        $('#' + contentInputId).change(function() {
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
        $(this).siblings().removeClass('checked');
        if ($(this).hasClass('marked')) {
            let inputValue = $(this).attr('ref');
            inputTypeCheck(inputValue);
        }
        $('input[name = content]').removeAttr('checked');
        $('.content-bar').removeClass('d-none');
        $(this).css('background-color', 'rgba(158,158,158,0.7)');
        $(this).addClass('checked');
    }

    function inputTypeCheck(inputValue) {
        let keywordOptionElement = $('#keyword option');
        keywordOptionElement.each(function() {
            if ($(this).val() === inputValue) {
                $(this).prop('select', true);
                $('input[value = keyword]').prop('checked', true);
            }
        });

        if (inputValue.includes('http://') || inputValue.includes('https://')) {
            $('#url').val(inputValue);
            $('input[value = url]').prop('checked', true);
        } else {
            $('#text').val(inputValue);
            $('input[value = text]').prop('checked', true);
        }
        contentInputShow();
    }

    function cleanmodal() {
        console.log('clear');
        $('#modal-save').removeClass('d-none');
        $('#modal-update-save').addClass('d-none');
        $modal.find('input[type = text]').val('');
        $modal.find('input[type = datetime-local]').val('');
        $modal.find('input[type = url]').val('');
        $modal.find('input[type = file]').val('');
        $modal.find('.show-richmenu-form').removeAttr('style');
        $modal.find('.show-richmenu-form').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-richmenu-form').find('.box').remove();
        $modal.find('input[value = "form1"]').prop('checked', true);
        $modal.find('input[name = "content"]').prop('checked', false);
        photoFormShow();
    }

    function saveRichMenus() {
        let appId = $appSelector.find('option:selected').val();
        let selected = $('#richmenu-selected').val();
        let title = $('#title').val();
        let chatBarText = $('#chatbar-text').val();
        let form = $('input[name = richmenu-form]:checked').val();

        let areas = composeAreaObject();

        return api.bot.uploadFile(appId, userId, imageFile).then((resJson) => {
            let url = resJson.data;

            let postRichmenu = {
                selected: selected,
                name: title,
                chatBarText: chatBarText,
                form: form,
                src: url,
                size: size,
                areas: areas
            };
            return api.appsRichmenus.insert(appId, userId, postRichmenu).then((resJson) => {
                let appsRichmenu = resJson.data;
                let richemnu = appsRichmenu[appId].richmenus;
                let richmenuId = Object.keys(richemnu)[0];
                $('#richmenu-modal').modal('hide');
                loadRichmenus(appId, userId);
            });
        });

        // if (!appId) {
        //     $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        // }
    }

    function activateMenu() {
        let appId = $(this).parents().parents().attr('rel');
        let richmenuId = $(this).parents().parents().attr('id');
        return api.bot.activateMenu(appId, richmenuId, userId).then((resJson) => {
            let activedMenu = resJson.data;
            console.log(activedMenu);
            loadRichmenus(appId, userId);
        });
    }

    function deactivateMenu() {
        let appId = $(this).parents().parents().attr('rel');
        let richmenuId = $(this).parents().parents().attr('id');
        return api.bot.deactivateMenu(appId, richmenuId, userId).then((resJson) => {
            let deactivedMenu = resJson.data;
            console.log(deactivedMenu);
            loadRichmenus(appId, userId);
        });
    }

    function loadRichmenus(appId, userId) {
        $('table #richmenu').empty();
        $('table #activated-richmenu').empty();
        return api.appsRichmenus.findAll(appId, userId).then(function(resJson) {
            let data = resJson.data;
            let richmenus = data[appId].richmenus;
            for (let richmenuId in richmenus) {
                if (!richmenus[richmenuId].isDeleted) {
                    groupType(richmenuId, richmenus[richmenuId], appId);
                }
            }
        });
    }

    function groupType(richmenuId, richmenu, appId) {
        let linkText = '';
        for (let i = 0; i < richmenu.areas.length; i++) {
            if (0 === i) {
                linkText = linkText + richmenu.areas[i].action.text;
            } else {
                linkText = linkText + '，' + richmenu.areas[i].action.text;
            }
        }
        var trGrop =
            '<tr id="' + richmenuId + '" rel="' + appId + '">' +
                '<th>' + richmenu.name + '</th>' +
                '<td>' + richmenu.chatBarText + '</td>' +
                '<td id="photoForm" data-form="' + richmenu.form + '">種類 ' + richmenu.form.slice(-1) + '</td>' +
                '<td>' + linkText + '</td>';
        if (!richmenu.platformMenuId) {
            trGrop +=
                '<td>' +
                    '<button type="button" id="deactivate-btn" class="btn btn-light btn-border" data-status="false">未啟用</button>' +
                '</td>' +
                '<td>' +
                    '<button type="button" id="update-btn" class="btn btn-light btn-border fas fa-edit" data-toggle="modal" data-target="#richmenu-modal" aria-hidden="true"></button>' +
                    '<button type="button" id="remove-btn" class="btn btn-danger fas fa-trash-alt"></button>' +
                '</td>' +
            '</tr>';
        } else {
            trGrop +=
                '<td>' +
                    '<button type="button" id="activate-btn" class="btn btn-success btn-border" data-status="true">已啟用</button>' +
                '</td>' +
                '<td>' +
                    '<button type="button" id="remove-btn" class="btn btn-danger fas fa-trash-alt"></button>' +
                '</td>' +
            '</tr>';
        }
        if (richmenu.platformMenuId) {
            $('table #activated-richmenu').append(trGrop);
            return;
        }
        $('table #richmenu').append(trGrop);
    }

    function appenedData() {
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        $('#modal-save').addClass('d-none');
        $('#modal-update-save').removeClass('d-none');
        let url = '';

        $modal.find('#modal-update-save').off('click').on('click', function() {
            let selected = $('#richmenu-selected').val();
            let title = $('#title').val();
            let chatBarText = $('#chatbar-text').val();
            let form = $('input[name = richmenu-form]:checked').val();

            let areas = composeAreaObject();

            let putRichmenu = {
                selected: selected,
                name: title,
                chatBarText: chatBarText,
                form: form,
                src: url,
                size: size,
                areas: areas
            };

            if (!imageFile) {
                return api.appsRichmenus.update(appId, userId, putRichmenu).then((resJson) => {
                    let appsRichmenu = resJson.data;
                    let richemnu = appsRichmenu[appId].richmenus;
                    let richmenuId = Object.keys(richemnu)[0];
                    $('#richmenu-modal').modal('hide');
                    loadRichmenus(appId, userId);
                });
            }

            return api.bot.uploadFile(appId, userId, imageFile).then((resJson) => {
                putRichmenu.src = resJson.data;

                return api.appsRichmenus.update(appId, userId, putRichmenu).then((resJson) => {
                    let appsRichmenu = resJson.data;
                    let richemnu = appsRichmenu[appId].richmenus;
                    let richmenuId = Object.keys(richemnu)[0];
                    $('#richmenu-modal').modal('hide');
                    loadRichmenus(appId, userId);
                });
            });
        });

        return api.appsRichmenus.findOne(appId, richmenuId, userId).then((resJson) => {
            let appRichmenu = resJson.data;
            let richemnu = appRichmenu[appId].richmenus[richmenuId];
            let areas = richemnu.areas;
            let photoForm = richemnu.form;

            $appSelector.parent().parent().addClass('d-none');

            $('#richmenu-selected').find('[value = "' + richemnu.selected + '"]').prop('selected', true);
            $('#title').val(richemnu.name);
            $('#chatbar-text').val(richemnu.chatBarText);
            $('input[value =' + photoForm + ']').prop('checked', true);
            $('.show-richmenu-form')
                .css('background', 'url(' + richemnu.src + ') center no-repeat')
                .css('background-size', 'cover');

            url = richemnu.src;
            photoFormShow();
            let boxElements = $('.box');
            boxElements.each(function(i) {
                let text = areas[i].action.text;
                let type = areas[i].action.type;
                $(this).css('background-color', 'rgba(158,158,158, 0.7)');
                $(this).text(type);
                $(this).addClass('marked')
                    .attr('ref', text);
            });
        });
    }

    function composeAreaObject() {
        let width = $modal.find('.show-richmenu-form').width();
        let height = $modal.find('.show-richmenu-form').height();

        let imgWidth = size.width;
        let imgHeight = size.height;

        // 取得 長 寬 比例尺
        let widthRate = imgWidth / width;
        let heightRate = imgHeight / height;

        let boxElements = $('.box');
        let areas = [];
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

            let areaDataObj = {
                'bounds': {
                    x: scaledX,
                    y: scaledY,
                    width: sacledWidth,
                    height: scaledHeight
                },
                'action': {
                    type: 'message',
                    text: text
                }
            };
            areas.push(areaDataObj);
        });
        return areas;
    }

    function remove() {
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        let status = JSON.parse($(this).parent().siblings().children().attr('data-status')); // 將string轉成boolean
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            if (status) {
                return api.bot.deleteMenu(appId, richmenuId, userId).then((resJson) => {
                    let appsRichmenu = resJson.data;
                    console.log(appsRichmenu);
                    $('#' + richmenuId).remove();
                    $.notify('刪除成功！', { type: 'success' });
                }).catch((resJson) => {
                    if (NO_PERMISSION_CODE === resJson.code) {
                        $.notify('無此權限', { type: 'danger' });
                        return;
                    }
                    $.notify('失敗', { type: 'danger' });
                });
            } else {
                return api.appsRichmenus.remove(appId, richmenuId, userId).then(function(resJson) {
                    $('#' + richmenuId).remove();
                    $.notify('刪除成功！', { type: 'success' });
                }).catch((resJson) => {
                    if (NO_PERMISSION_CODE === resJson.code) {
                        $.notify('無此權限', { type: 'danger' });
                        return;
                    }
                    $.notify('失敗', { type: 'danger' });
                });
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
