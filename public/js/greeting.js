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

    const unpermittedCode = '3.16';

    window.auth.ready.then((currentUser) => {
        userId = currentUser.uid;

        $(document).on('click', '#check-btn', modalSubmit);
        $(document).on('click', '#close-btn', modalClose);
        $(document).on('click', '#add-btn', addMsgCanvas);
        $(document).on('click', '#delete-btn', delMsgCanvas);

        return api.app.getAll(userId);
    }).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.app.enums.type.CHATSHIER) {
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

    var TableObj = function() {
        this.tr = $('<tr>');
        this.th = $('<th>');
        this.td1 = $('<td>');
        this.td2 = $('<td>');
        this.DeleteBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-trash-o')
            .attr('id', 'delete-btn');
        this.AddBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-plus')
            .attr('id', 'add-btn');
        this.CheckBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-check')
            .attr('id', 'check-btn');
        this.CloseBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-close')
            .attr('id', 'close-btn');
    };

    function findOne(appId, userId) {
        $('#MsgCanvas').empty();
        rowCount = 0;
        return api.greeting.getAll(appId, userId).then(function(resJson) {
            let greetings = resJson.data;
            let greeting = greetings[appId].greetings;
            for (let greetingId in greeting) {
                var list = new TableObj();
                var text = list.th.text(greeting[greetingId].text);
                var updatedTime = list.td1.text(ToLocalTimeString(greeting[greetingId].updatedTime));
                var btns = list.td2.append(list.DeleteBtn);
                var trGrop = list.tr.attr('id', greetingId).attr('rel', appId).append(text, updatedTime, btns);
                $('table #MsgCanvas').append(trGrop);
                rowCount++;
                findedGreetingIds[greetingId] = greetingId;
            }
            if (rowCount < 5) {
                appendNewTr(appId);
            }
        });
    }

    function appendNewTr(appId) {
        var list = new TableObj();
        var text = list.th.text('');
        var updatedTime = list.td1.text('');
        var btns = list.td2.append(list.AddBtn);
        var trGrop = list.tr.attr('rel', appId).append(text, updatedTime, btns);
        $('table #MsgCanvas').append(trGrop);
    }

    function addMsgCanvas() {
        rowCount++;
        $(this).parent().parent().remove('tr');
        let nowTime = new Date().getTime();
        let appId = $(this).parent().parent().attr('rel');
        var list = new TableObj();
        var text = list.th.append('<textarea class="greeting-textarea">');
        var updatedTime = list.td1.text(ToLocalTimeString(nowTime));
        var btns = list.td2.append(list.CheckBtn, list.CloseBtn);
        var trGrop = list.tr.attr('id', 'new' + rowCount).attr('rel', appId).append(text, updatedTime, btns);
        $('table #MsgCanvas').append(trGrop);

        if (rowCount < 5) {
            appendNewTr(appId);
        }
    } // end of addMsgCanvas

    function delMsgCanvas() {
        var userId = auth.currentUser.uid;
        var appId = $(this).parent().parent().attr('rel');
        let greetingId = $(this).parent().parent().attr('id');
        if ('-' === greetingId.charAt(0)) {
            return api.greeting.remove(appId, userId, greetingId).then(function(resJson) {
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
                if (unpermittedCode === resJson.code) {
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
        return api.greeting.insert(appId, userId, greetingData).then(function(resJson) {
            $('#' + trId).remove();
            let greeting = resJson.data[appId].greetings;
            let greetingId = Object.keys(greeting)[0];

            var list = new TableObj();
            var text = list.th.text(greeting[greetingId].text);
            var updatedTime = list.td1.text(ToLocalTimeString(greeting[greetingId].updatedTime));
            var btns = list.td2.append(list.DeleteBtn);
            var trGrop = list.tr.attr('id', greetingId).attr('rel', appId).append(text, updatedTime, btns);
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
            if (unpermittedCode === resJson.code) {
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
