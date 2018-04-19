/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;
    var nowSelectAppId = '';
    var size = {};
    var imageFile = '';
    var imgWidth = '';
    var imgHeight = '';

    var $modal = $('#richmenu-modal');

    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $jqDoc.on('click', '#del', function() { // 刪除
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        remove(appId, richmenuId, userId);
    });

    $('.content-bar').hide();
    $('.content-input').hide();
    $jqDoc.on('click', '#modal-save', saveRichMenus);
    $jqDoc.on('click', '#add-btn', cleanmodal);
    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = richmenu-type]', photoTypeShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '.box', contentBarShow);

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

            $dropdownMenu.append('<li><a  class="dropdown-item" id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appSelector.append('<option value="' + appId + '">' + appsData[appId].name + '</option>');
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
        if (file.type.indexOf('image') >= 0 && file.size > config.imageFileMaxSize) {
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        }

        // 將檔案轉 base64 的 URL 
        reader.onload = function(e) {
            let url = e.target.result;
            // 取得圖檔的長 寬
            let image = new Image();
            image.onload = function() {
                imgWidth = image.width;
                imgHeight = image.height;
                size.width = imgWidth;
                size.height = imgHeight;
            };
            image.src = url;

            $('.show-richmenu-type')
                .css('background', 'url(' + url + ') center no-repeat')
                .css('background-size', 'cover')
                .css('background-color', 'none');
            imageFile = file;
        };
        reader.readAsDataURL(file);
    }

    function photoTypeShow() {
        let width = $modal.find('.show-richmenu-type').width();
        let height = $modal.find('.show-richmenu-type').height();
        let boxWidth = width / 3;
        let boxHeight = height / 2;
        $('.content-bar').hide();
        $('.content-input').hide();
        $modal.find('.show-richmenu-type').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-richmenu-type').find('.box').remove();
        let checked = $(this).val();
        let box1 = '';
        let box2 = '';
        let box3 = '';
        let box4 = '';
        let box5 = '';
        let box6 = '';
        switch (checked) {
            case 'type1':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0"></div>';
                box2 = '<div class="box" id="box2" data-x="' + boxWidth + '" data-y="0"></div>';
                box3 = '<div class="box" id="box3" data-x="' + boxWidth * 2 + '" data-y="0"></div>';
                box4 = '<div class="box" id="box4" data-x="0" data-y="' + boxHeight + '"></div>';
                box5 = '<div class="box" id="box5" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>';
                box6 = '<div class="box" id="box6" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2 + box3 + box4 + box5 + box6);
                break;
            case 'type2':
                let widthType2 = boxWidth;
                widthType2 = (widthType2 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthType2 + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthType2 + '" data-y="0" style="width:' + widthType2 + 'px"></div>';
                box3 = '<div class="box" id="box3" data-x="0" data-y="' + boxHeight + '" style="width:' + widthType2 + 'px"></div>';
                box4 = '<div class="box" id="box4" data-x="' + widthType2 + '" data-y="' + boxHeight + '" style="width:' + widthType2 + 'px"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2 + box3 + box4);
                break;
            case 'type3':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '"></div>';
                box3 = '<div class="box" id="box3" data-x="' + boxWidth + '" data-y="' + boxHeight + '"></div>';
                box4 = '<div class="box" id="box4" data-x="' + boxWidth * 2 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2 + box3 + box4);
                break;
            case 'type4':
                let widthType4 = boxWidth;
                widthType4 = widthType4 * 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthType4 + 'px; height:' + height + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthType4 + '" data-y="0"></div>';
                box3 = '<div class="box" id="box3" data-x="' + widthType4 + '" data-y="' + boxHeight + '"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2 + box3);
                break;
            case 'type5':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="0" data-y="' + boxHeight + '" style="width:' + width + 'px"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2);
                break;
            case 'type6':
                let widthType6 = boxWidth;
                widthType6 = (widthType6 * 3) / 2;
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + widthType6 + 'px; height:' + height + 'px"></div>';
                box2 = '<div class="box" id="box2" data-x="' + widthType6 + '" data-y="0" style="width:' + widthType6 + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-richmenu-type').append(box1 + box2);
                break;
            case 'type7':
                box1 = '<div class="box" id="box1" data-x="0" data-y="0" style="width:' + width + 'px; height:' + height + 'px"></div>';
                $modal.find('.show-richmenu-type').append(box1);
                break;
            default:
                break;
        }
    }

    function contentInputShow() {
        $('.content-input').val('');
        var contentInputId = $(this).val();
        $('.content-input').hide();
        $('#' + contentInputId).show();
        $('#' + contentInputId).change(function() {
            var val = $(this).val();
            if (null !== val || undefined !== val) {
                let boxId = $('.box.checked').attr('id');
                $('#' + boxId).attr('ref', val);
                $('#' + boxId).removeClass('checked');
            }
        });
    }

    function contentBarShow() {
        $('input[name = content]').removeAttr('checked');
        $('.content-input').val('');
        $('.content-bar').show();
        // $('.box').css('background-color','rgba(158,158,158,0)');
        $(this).css('background-color', 'rgba(158,158,158,0.7)');
        $(this).addClass('checked');
    }

    function cleanmodal() {
        console.log('clear');
        $modal.find('input[type = text]').val('');
        $modal.find('input[type = datetime-local]').val('');
        $modal.find('input[type = url]').val('');
        $modal.find('input[type = file]').val('');
        $modal.find('select').val('');
        $modal.find('.show-richmenu-type').removeAttr('style');
        $modal.find('.show-richmenu-type').css('background-color', 'rgba(158,158,158)');
        $modal.find('.show-richmenu-type').find('.box').remove();
        appenedBox();
    }

    function appenedBox() {
        var box1 = '<div class="box" id="box1"></div>';
        var box2 = '<div class="box" id="box2"></div>';
        var box3 = '<div class="box" id="box3"></div>';
        var box4 = '<div class="box" id="box4"></div>';
        var box5 = '<div class="box" id="box5"></div>';
        var box6 = '<div class="box" id="box6"></div>';
        $modal.find('.show-richmenu-type').append(box1 + box2 + box3 + box4 + box5 + box6);
    }

    function saveRichMenus() {
        let appId = $appSelector.find('option:selected').val();
        let status = $('#richmenu-status').val();
        let startedTime = $('#start-time').val();
        let endedTime = $('#end-time').val();
        let title = $('#title').val();
        let chatBarText = $('#chatbar-text').val();

        let width = $modal.find('.show-richmenu-type').width();
        let height = $modal.find('.show-richmenu-type').height();

        // 取得 長 寬 比例尺
        let widthRate = imgWidth / width;
        let heightRate = imgHeight / height;

        let boxElements = $('.box');
        let areas = [];
        boxElements.each(function() {
            let boxWidth = $(this).width();
            let bixHeight = $(this).height();
            let x = parseInt($(this).attr('data-x'));
            let y = parseInt($(this).attr('data-y'));
            let text = $(this).attr('ref');

            // 將 長寬 及 座標 依圖片大小縮放並四捨五入
            let sacledWidth = Math.round(boxWidth * widthRate);
            let scaledHeight = Math.round(bixHeight * heightRate);
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

        let postRichmenu = {
            selected: 'false',
            startedTime: startedTime,
            endedTime: endedTime,
            name: title,
            chatBarText: chatBarText,
            size: size,
            areas: areas
        };
        let richmenuId = '';
        return api.appsRichmenus.insert(appId, userId, postRichmenu).then((resJson) => {
            return api.bot.createRichMenu(appId, postRichmenu).then((resJson) => {
                richmenuId = resJson.data;
                let reader = new FileReader();
                let postImage = '';
                reader.onload = function() {
                    postImage = reader.result;
                };
                reader.readAsArrayBuffer(imageFile);
                return api.bot.setRichMenuImage(appId, richmenuId, postImage).then((resJson) => {
                    console.log(resJson);
                    return api.bot.linkRichMenuToUser(appId, richmenuId, 'U50ea41570f6f8dd8ba41e236268914b7').then((resJson) => {
                        console.log(resJson);
                    });
                });
            });
        });
        // if (!appId) {
        //     $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        // }
    }

    // function TableObject() {
    //     this.tr = $('<tr>');
    //     this.th = $('<th>');
    //     this.td1 = $('<td>');
    //     this.td2 = $('<td>');
    //     this.td3 = $('<td>');
    //     this.td4 = $('<td>');
    //     this.td5 = $('<td>');
    //     this.td6 = $('<td>');
    //     this.UpdateBtn = $('<button>').attr('type', 'button')
    //         .addClass('btn btn-light btn-border fas fa-edit')
    //         .attr('id', 'edit')
    //         .attr('data-toggle', 'modal')
    //         .attr('data-target', '#richmenu-modal')
    //         .attr('aria-hidden', 'true');
    //     this.DeleteBtn = $('<button>').attr('type', 'button')
    //         .addClass('btn btn-danger fas fa-trash-alt')
    //         .attr('id', 'del');
    // }

    // function TypeObject() {
    //     this.box1 = $('<div>').addClass('box').attr('id', 'box1');
    //     this.box2 = $('<div>').addClass('box').attr('id', 'box2');
    //     this.box3 = $('<div>').addClass('box').attr('id', 'box3');
    //     this.box4 = $('<div>').addClass('box').attr('id', 'box4');
    //     this.box5 = $('<div>').addClass('box').attr('id', 'box5');
    //     this.box6 = $('<div>').addClass('box').attr('id', 'box6');
    // }

    function loadRichmenus(appId, userId) {
        $('#richmenu').empty();
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
        var linkText = '';
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
                '<td>' + linkText + '</td>' +
                '<td>' + new Date(richmenu.startedTime).toLocaleString() + '-' + new Date(richmenu.endedTime).toLocaleString() + '</td>' +
                '<td>' + richmenu.status + '</td>' +
                '<td>' +
                    '<button type="button" id="edit" class="btn btn-light btn-border fas fa-edit" data-toggle="modal" data-target="#richmenu-modal" aria-hidden="true"></button>' +
                    '<button type="button" id="del" class="btn btn-danger fas fa-trash-alt"></button>' +
                '</td>' +
            '</tr>';
        // var list = new TableObject();
        // var title = list.th.text(richmenu.name);
        // var chatBarText = list.td1.text(richmenu.chatBarText);
        // var link = list.td3.text(linkText);
        // var time = list.td4.text(richmenu.delete);
        // var status = list.td5.text('開放');
        // var btns = list.td6.append(list.UpdateBtn, list.DeleteBtn);
        // var trGrop = list.tr.attr('id', richmenuId).attr('rel', appId).append(title, chatBarText, link, time, status, btns);
        $('table.table').append(trGrop);
    }

    function remove(appId, richmenuId, userId) {
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsRichmenus.remove(appId, richmenuId, userId).then(function(resJson) {
                $('#' + richmenuId).remove();
                $.notify('刪除成功！', { type: 'success' });
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    $.notify('失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                }
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
})();
