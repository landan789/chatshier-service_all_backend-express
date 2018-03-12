/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var APP_GREETING_DAILED_TO_FIND = 'APP GREETING FAILED TO FIND';

    var appsData = {};
    var rowCount = 0;
    var findedGreetingIds = {};
    var api = window.restfulAPI;
    var userId = '';
    var nowSelectAppId = '';

    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');

    const NO_PERMISSION_CODE = '3.16';

    window.auth.ready.then((currentUser) => {
        userId = currentUser.uid;

        $(document).on('click', '#check-btn', modalSubmit);
        $(document).on('click', '#close-btn', modalClose);
        $(document).on('click', '#add-btn', addMsgCanvas);
        $(document).on('click', '#delete-btn', delMsgCanvas);

        return api.apps.findAll(userId);
    }).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a id="' + appId + '">' + app.name + '</a></li>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            findOne(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        findOne(nowSelectAppId, userId);
    }

    function findOne(appId, userId) {
        $('#MsgCanvas').empty();
        rowCount = 0;
        return api.appsGreetings.findAll(appId, userId).then(function(resJson) {
            let greetings = resJson.data;
            let greeting = greetings[appId].greetings;
            for (let greetingId in greeting) {
                $('table #MsgCanvas').append(
                    '<tr id="' + greetingId + '" rel="' + appId + '">' +
                        '<th>' + greeting[greetingId].text + '</th>' +
                        '<td>' + ToLocalTimeString(greeting[greetingId].updatedTime) + '</td>' +
                        '<td>' +
                            '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );

                rowCount++;
                findedGreetingIds[greetingId] = greetingId;
            }
            if (rowCount < 5) {
                appendNewTr(appId);
            }
        });
    }

    function appendNewTr(appId) {
        $('table #MsgCanvas').append(
            '<tr rel="' + appId + '">' +
                '<th></th>' +
                '<td></td>' +
                '<td>' +
                    '<button type="button" class="btn btn-grey fa fa-plus" id="add-btn"></button>' +
                '</td>' +
            '</tr>'
        );
    }

    function addMsgCanvas() {
        rowCount++;
        $(this).parent().parent().remove('tr');
        let nowTime = new Date().getTime();
        let appId = $(this).parent().parent().attr('rel');

        $('table #MsgCanvas').append(
            '<tr id="new' + rowCount + '" rel="' + appId + '">' +
                '<th><textarea class="greeting-textarea"></textarea></th>' +
                '<td>' + ToLocalTimeString(nowTime) + '</td>' +
                '<td>' +
                    '<button type="button" class="btn btn-default fa fa-check" id="check-btn"></button>' +
                    '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                '</td>' +
            '</tr>'
        );

        if (rowCount < 5) {
            appendNewTr(appId);
        }
    } // end of addMsgCanvas

    function delMsgCanvas() {
        var userId = auth.currentUser.uid;
        var appId = $(this).parent().parent().attr('rel');
        let greetingId = $(this).parent().parent().attr('id');
        if ('-' === greetingId.charAt(0)) {
            return api.appsGreetings.remove(appId, userId, greetingId).then(function(resJson) {
                $('#' + greetingId).remove();
                delete findedGreetingIds[greetingId];
                rowCount--;
                if (4 === rowCount) {
                    appendNewTr(appId);
                }
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    $.notify('失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                }
            });
        }
    } // end of delMsgCanvas

    function modalClose() {
        let id = $(this).parent().parent().attr('id');
        let appId = $(this).parent().parent().attr('rel');
        $('#' + id).remove();
        rowCount--;
        if (4 === rowCount) {
            appendNewTr(appId);
        }
    }

    function modalSubmit() {
        var greetingIds = Object.keys(findedGreetingIds);
        var greetingIdsLength = greetingIds.length;
        var appendId = greetingIds[greetingIdsLength - 1];
        var userId = auth.currentUser.uid;
        var appId = $(this).parent().parent().attr('rel');
        var $textarea = $(this).parent().parent().children().children('textarea');
        var trId = $(this).parent().parent().attr('id');
        if ('' === $textarea.val().trim()) {
            $.notify('請填入文字內容', { type: 'warning' });
            return;
        }
        let greetingData = {
            type: 'text',
            text: $textarea.val()
        };
        return api.appsGreetings.insert(appId, userId, greetingData).then(function(resJson) {
            $('#' + trId).remove();
            let greeting = resJson.data[appId].greetings;
            let greetingId = Object.keys(greeting)[0];

            var trGrop =
            '<tr id="' + greetingId + '" rel="' + appId + '">' +
                '<th>' + greeting[greetingId].text + '</th>' +
                '<td>' + ToLocalTimeString(greeting[greetingId].updatedTime) + '</td>' +
                '<td>' +
                    '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                '</td>' +
            '</tr>';
            if (0 === greetingIdsLength) {
                $('table #MsgCanvas').prepend(trGrop);
                findedGreetingIds[greetingId] = greetingId;
                return;
            }
            $(trGrop).insertAfter('#' + appendId);
            findedGreetingIds[greetingId] = greetingId;
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $.notify('失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
            }
        });
    } // end of modalSubmit

    function ToLocalTimeString(millisecond) {
        var date = new Date(millisecond);
        var localDate = date.toLocaleDateString();
        var localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var localTimeString = localDate + localTime;
        return localTimeString;
    }
})();