var rowCount = 0; // new message count from addMsgCanvas
$(document).ready(function() {
    // 設定 bootstrap notify 的預設值
    // 1. 設定為顯示後2秒自動消失
    // 2. 預設位置為螢幕中間上方
    // 3. 進場與結束使用淡入淡出
    $.notifyDefaults({
        delay: 2000,
        placement: {
            from: 'top',
            align: 'center'
        },
        animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
        }
    });

    $(document).on('click', '#check-btn', modalSubmit);
    $(document).on('click', '#close-btn', modalClose);
    $(document).on('click', '#add-btn', addMsgCanvas);
    $(document).on('click', '#delete-btn', delMsgCanvas);
    setTimeout(loadAppIdNames, 2000);
});

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

function loadAppIdNames() {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    var $appDropdown = $('.app-dropdown');
    var $dropdownMenu = $appDropdown.find('.dropdown-menu');
    $.ajax({
        type: 'GET',
        url: '/api/apps/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let apps = data.data;
            for (let appId in apps) {
                var app = apps[appId];
                $dropdownMenu.append('<li><a id="' + appId + '">' + app.name + '</a></li>');
                $appDropdown.find('#' + appId).on('click', function(ev) {
                    var appId = ev.target.id;
                    $appDropdown.find('.dropdown-text').text(ev.target.text);
                    find(appId);
                });
            }
        },
        error: (error) => {
            console.log('查詢失敗: ' + error);
        }
    });
}

function find(appId) {
    $('#MsgCanvas').empty();
    rowCount = 0;
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $('#MsgCanvas').attr('rel', appId);
    $.ajax({
        type: 'GET',
        url: '/api/apps-greetings/apps/' + appId + '/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let greetings = data.data;
            let greeting = greetings[appId].greetings;
            for (let greetingId in greeting) {
                var list = new TableObj();
                var text = list.th.text(greeting[greetingId].text);
                var updatedTime = list.td1.text(ToLocalTimeString(greeting[greetingId].updatedTime));
                var btns = list.td2.append(list.DeleteBtn);
                var trGrop = list.tr.attr('id', greetingId).attr('rel', appId).append(text, updatedTime, btns);
                $('table #MsgCanvas').append(trGrop);
                rowCount++;
            }
            if (rowCount < 5) {
                appendNewTr(appId);
            }
        },
        error: (error) => {
            console.log('查詢失敗: ' + error);
            appendNewTr();
        }
    });
} // end of loadFriendsReply

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
    var text = list.th.append('<textarea>');
    var updatedTime = list.td1.text(ToLocalTimeString(nowTime));
    var btns = list.td2.append(list.CheckBtn, list.CloseBtn);
    var trGrop = list.tr.attr('id', 'new' + rowCount).attr('rel', appId).append(text, updatedTime, btns);
    $('table #MsgCanvas').append(trGrop);

    if (rowCount < 5) {
        appendNewTr(appId);
    }
} // end of addMsgCanvas

function delMsgCanvas() {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    var appId = $(this).parent().parent().attr('rel');
    let greetingId = $(this).parent().parent().attr('id');
    if ('-' === greetingId.charAt(0)) {
        $.ajax({
            type: 'DELETE',
            url: '/api/apps-greetings/apps/' + appId + '/greetings/' + greetingId + '/users/' + userId,
            headers: {
                'Authorization': jwt
            },
            success: (result) => {
                $('#' + greetingId).remove();
                rowCount--;
                if (4 === rowCount) {
                    appendNewTr(appId);
                }
            },
            error: (error) => {
                console.log('刪除失敗: ' + error);
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
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    var appId = $(this).parent().parent().attr('rel');
    var $textarea = $(this).parent().parent().children().children('textarea');
    var trId = $(this).parent().parent().attr('id');
    if ('' === $textarea.val().trim()) {
        $.notify('請填入文字內容', { type: 'warning' });
        return;
    }
    let greeting = {
        type: 'text',
        text: $textarea.val()
    };
    $.ajax({
        type: 'POST',
        url: '/api/apps-greetings/apps/' + appId + '/users/' + userId,
        data: JSON.stringify(greeting),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
            'Authorization': jwt
        },
        success: (greetings) => {
            $('#' + trId).empty();
            let greeting = greetings.data[appId].greetings;
            let greetingId = Object.keys(greeting);

            var list = new TableObj();
            var text = list.th.text(greeting[greetingId].text);
            var updatedTime = list.td1.text(ToLocalTimeString(greeting[greetingId].updatedTime));
            var btns = list.td2.append(list.DeleteBtn);
            $('#' + trId).attr('id', greetingId).attr('rel', appId).append(text, updatedTime, btns);
            rowCount++;
        },
        error: (error) => {
            console.log('新增失敗: ' + error);
        }
    });
} // end of modalSubmit

function ToLocalTimeString(millisecond) {
    var date = new Date(millisecond);
    var localDate = date.toLocaleDateString();
    var localTime = date.toLocaleTimeString();
    var localTimeString = localDate + localTime;
    return localTimeString;
}
