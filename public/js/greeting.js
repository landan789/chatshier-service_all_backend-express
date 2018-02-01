var socket = io.connect();
var idObject = {}; // insert each message id for modify old message's purpose
var greetingObject = {};
var rowCount = 0; // new message count from addMsgCanvas
var appId;
$(document).ready(function() {
    $(document).on('click', '#save', modalSubmit);
    $(document).on('click', '#add-btn', addMsgCanvas);
    $(document).on('click', '#delete', delMsgCanvas);
    $(document).on('change', '#appId-names', storeAppId);
    $('#add-btn').hide();
    $('#save').hide();
    setTimeout(loadAppIdNames, 2000);
});

function loadAppIdNames() {
    let userId = auth.currentUser.uid;
    socket.emit('post userId', (userId));
    socket.on('get appInfos', (apps) => {
        var option = [];
        for (let appId in apps) {
            var app = apps[appId];
            option[appId] = $('<option>').text(app.name).attr('id', appId);
            $('#appId-names').append(option[appId]);
        }
    });
}

function storeAppId() {
    appId = $(this).find(':selected').attr('id'); // appId為全域變數
    socket.emit('load add friend', (appId));
    socket.on('get greetings', (greetings) => {
        tableView(greetings);
    });
} // end of loadFriendsReply

function tableView(greetings) {
    $('#MsgCanvas').empty();
    greetingObject = {};
    idObject = {};
    let $table = $('<table>').attr('id', appId);
    $('#MsgCanvas').append($table);
    if (null === greetings || '' === greetings || undefined === greetings) {
        $('#add-btn').show();
    } else {
        let greeting = greetings[appId].greetings;
        for (let greetingId in greeting) {
            let loadMsg = '<!--TEXT AREA -->' +
                '<tr id="' + greetingId + '-row">' +
                '<th style="padding:1%; margin:2% 1% 2% 1%; background-color: #ddd">請輸入文字:</th>' +
                '</tr>' +
                '<tr id="' + greetingId + '-row">' +
                '<td style="background-color: #ddd">' +
                '<span style="float:right" id="delete"> 刪除 </span>' +
                '<form onsubmit="event.preventDefault();" style="padding:1%; margin:1%">' +
                '<textarea id="' + greetingId + '" rel="' + appId + '" style="border:none" disabled="disabled">' + greeting[greetingId].text + '</textarea>' +
                '</form>' +
                '</td>' +
                '</tr>';
            $table.append(loadMsg);
        }
        greetingObject = greeting;
        $('#add-btn').show();
    }
}

function addMsgCanvas() {
    var currentCount = Object.keys(greetingObject).length;
    var newCount = Object.keys(idObject).length;
    if ((currentCount + newCount) < 5) {
        ++rowCount;
        let MsgCanvas = '<!--TEXT AREA -->' +
            '<tr id="' + rowCount + '-row">' +
            '<th style="padding:1%; margin:2% 1% 2% 1%; background-color: #ddd">請輸入文字:</th>' +
            '</tr>' +
            '<tr id="' + rowCount + '-row">' +
            '<td style="background-color: #ddd">' +
            '<span style="float:right" id="delete"> 刪除 </span>' +
            '<form onsubmit="event.preventDefault();" style="padding:1%; margin:1%">' +
            '<textarea id="newText' + rowCount + '"></textarea>' +
            '</form>' +
            '</td>' +
            '</tr>';
        $('table#' + appId).append(MsgCanvas);
        $('#save').show();
        idObject['newText' + rowCount] = '';
    } else {
        $('#error').show();
        $('#add-btn').hide();
        setTimeout(() => {
            $('#error').hide();
        }, 5000);
    }
} // end of addMsgCanvas

function delMsgCanvas() {
    var currentCount = Object.keys(greetingObject).length;
    var newCount = Object.keys(idObject).length;
    let greetingId = $(this).parent().find('form').find('textarea').attr('id');
    let rowId = $(this).parent().parent().attr('id');
    if (undefined === greetingId) {
        location.reload();
    }
    if ('-' === greetingId.charAt(0)) {
        socket.emit('delete greeting', {appId, greetingId});
        socket.on('delete result', (result) => {
            if (null === result) {
                console.log('刪除失敗');
                return;
            }
            $(this).parent().parent().siblings('#' + rowId).remove();
            $(this).parent().parent().remove();
            delete greetingObject[greetingId];
        });
    } else {
        $(this).parent().parent().siblings('#' + rowId).remove();
        $(this).parent().parent().remove();
        delete idObject[greetingId];
    }
    if ((currentCount + newCount) < 5) {
        $('#add-btn').show();
    }
} // end of delMsgCanvas

function modalSubmit() {
    var currentCount = Object.keys(greetingObject).length;
    var newCount = Object.keys(idObject).length;
    let userId = auth.currentUser.uid;
    for (let key in idObject) {
        if ('' === $('#' + key).val().trim()) {
            alert('請填入文字內容');
            return;
        }
        let greetingObj = {
            type: 'text',
            text: $('#' + key).val()
        };
        socket.emit('post greeting', {userId, appId, greetingObj});
        socket.on('callback greetingId', (data) => {
            if (null === data || undefined === data) {
                console.log('新增失敗');
            }
        });
    }
    rowCount = 0;
    if (0 === rowCount) {
        console.log('新增完成');
    }
    if ((currentCount + newCount) < 5) {
        $('#add-btn').hide();
    }
    socket.emit('load add friend', (appId));
    socket.on('get greetings', (data) => {
        tableView(data);
    });
} // end of modalSubmit
