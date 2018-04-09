/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var api = window.restfulAPI;
    var nowSelectAppId = '';

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
    $jqDoc.on('click', '#show-richmenu-modal', clearModal);
    $jqDoc.on('change', '.image-ghost', uploadImage);
    $jqDoc.on('click', 'input[name = richmenu-type]', photoTypeShow);
    $jqDoc.on('click', 'input[name = content]', contentInputShow);
    $jqDoc.on('click', '.box', contentBarShow);

    return api.apps.findAll(userId).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + appsData[appId].name + '</option>');
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
        if (input.files && input.files[0]) {
            let file = input.files[0];
            // let reader = new FileReader();
            // console.log(file.width);           //圖片寬
            // console.log(file.height);          //圖片高
            // console.log(file.size + 'kB');     //圖片大小
            // console.log(file.type);            //圖片檔名
            // reader.onloadend = function(e){
            //     console.log(e);
            //     console.log(e.target.result);
            //     var image = new Image();
            //     image.onload = function(){
            //         console.log(image.width);
            //         console.log(image.height);
            //     }
            //     $('.show-richmenu-type').css('background','url('+ e.target.result +') center no-repeat').css('background-size', 'cover');
            // }
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                let url = snapshot.downloadURL;
                $('.show-richmenu-type').css('background', 'url(' + url + ') center no-repeat').css('background-size', 'cover');
            });
        }
    }

    function photoTypeShow() {
        $('.content-bar').hide();
        $('.content-input').hide();
        $modal.find('.show-richmenu-type').find('.box').remove();
        var checked = $(this).val();
        var typeBox = new TypeObject();
        var box1 = typeBox.box1;
        var box2 = typeBox.box2;
        var box3 = typeBox.box3;
        var box4 = typeBox.box4;
        var box5 = typeBox.box5;
        var box6 = typeBox.box6;
        switch (checked) {
            case 'type1':
                $modal.find('.show-richmenu-type').append(box1, box2, box3, box4, box5, box6);
                break;
            case 'type2':
                box1.css('width', '270px');
                box2.css('width', '270px');
                box3.css('width', '270px');
                box4.css('width', '270px');
                $modal.find('.show-richmenu-type').append(box1, box2, box3, box4);
                break;
            case 'type3':
                box1.css('width', '540px');
                $modal.find('.show-richmenu-type').append(box1, box2, box3, box4);
                break;
            case 'type4':
                box1.css('width', '360px').css('height', '360px');
                $modal.find('.show-richmenu-type').append(box1, box2, box3);
                break;
            case 'type5':
                box1.css('width', '540px');
                box2.css('width', '540px');
                $modal.find('.show-richmenu-type').append(box1, box2);
                break;
            case 'type6':
                box1.css('width', '270px').css('height', '360px');
                box2.css('width', '270px').css('height', '360px');
                $modal.find('.show-richmenu-type').append(box1, box2);
                break;
            case 'type7':
                box1.css('width', '540px').css('height', '360px');
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

    function clearModal() {
        console.log('clear');
        $modal.find('input[type = text]').val('');
        $modal.find('input[type = datetime-local]').val('');
        $modal.find('input[type = url]').val('');
        $modal.find('select').val('');
        $modal.find('.show-richmenu-type').removeAttr('style');
        $modal.find('.show-richmenu-type').find('.box').remove();
        appenedBox();
    }

    function appenedBox() {
        var typeBox = new TypeObject();
        var box1 = typeBox.box1;
        var box2 = typeBox.box2;
        var box3 = typeBox.box3;
        var box4 = typeBox.box4;
        var box5 = typeBox.box5;
        var box6 = typeBox.box6;
        $modal.find('.show-richmenu-type').append(box1, box2, box3, box4, box5, box6);
    }

    function saveRichMenus() {
        let richmenuId = $('#richmenu-id').val();
        let appId = $('#richmenu-appId').val();
        let status = $('#richmenu-status').val();
        let startTime = $('#start-time').val();
        let endTime = $('#end-time').val();
        let title = $('#title').val();
        let chatBarText = $('#chatbar-text').val();
        let type = $('input[name = richmenu-type]:checked').val();
        let typeNo = typeNum(type);
        let area = [];
        for (let i = 0; i <= typeNo - 1; i++) {
            area[i] = {
                'bounds': {
                    x: 0,
                    y: 0,
                    width: $('#box' + (i + 1)).width(),
                    height: $('#box' + (i + 1)).height()
                },
                'action': {
                    type: 'Message',
                    text: $('#box' + (i + 1)).attr('ref')
                }
            };
        }

        // if (!channelId || !keyword || !type) {
        if (!appId || !type) {
            $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        } else {
            let template = createTemplate(type);
            if (template) {
                let data = {
                    appId: appId,
                    keyword: keyword,
                    status: status,
                    template: template
                };
                console.log(data);
                if (propId) {
                    socket.emit('change template', userId, propId, data, loadTemplate);
                } else {
                    socket.emit('create template', userId, data, loadTemplate);
                }
                $('#template-modal').modal('toggle');
            }
        }
    }

    function typeNum(type) {
        switch (type) {
            case 'type1':
                return 6;
            case 'type2':
                return 4;
            case 'type3':
                return 4;
            case 'type4':
                return 3;
            case 'type5':
                return 2;
            case 'type6':
                return 2;
            case 'type7':
                return 1;
            default:
                return 0;
        }
    }

    function TableObject() {
        this.tr = $('<tr>');
        this.th = $('<th>');
        this.td1 = $('<td>');
        this.td2 = $('<td>');
        this.td3 = $('<td>');
        this.td4 = $('<td>');
        this.td5 = $('<td>');
        this.td6 = $('<td>');
        this.UpdateBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-light fas fa-edit')
            .attr('id', 'edit')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#richmenu-modal')
            .attr('aria-hidden', 'true');
        this.DeleteBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-danger fas fa-trash-alt')
            .attr('id', 'del');
    }

    function TypeObject() {
        this.box1 = $('<div>').addClass('box').attr('id', 'box1');
        this.box2 = $('<div>').addClass('box').attr('id', 'box2');
        this.box3 = $('<div>').addClass('box').attr('id', 'box3');
        this.box4 = $('<div>').addClass('box').attr('id', 'box4');
        this.box5 = $('<div>').addClass('box').attr('id', 'box5');
        this.box6 = $('<div>').addClass('box').attr('id', 'box6');
    }

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
                linkText = linkText + richmenu.areas[i].action.type;
            } else {
                linkText = linkText + '，' + richmenu.areas[i].action.type;
            }
        }
        var list = new TableObject();
        var title = list.th.text(richmenu.name);
        var chatBarText = list.td1.text(richmenu.chatBarText);
        var link = list.td3.text(linkText);
        var time = list.td4.text(richmenu.delete);
        var status = list.td5.text('開放');
        var btns = list.td6.append(list.UpdateBtn, list.DeleteBtn);
        var trGrop = list.tr.attr('id', richmenuId).attr('rel', appId).append(title, chatBarText, link, time, status, btns);
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
