var socket = io.connect();
var idArray = {}; // insert each message id for modify old message's purpose
var currentCount = 0; // existing message count
var newCount = 0; // new message count from addMsgCanvas
var deleteCount = 0;
var appId;
$(document).ready(function() {

    $(document).on('click', '#save', modalSubmit);
    $(document).on('click', '#addbtn', addMsgCanvas);
    $(document).on('click', '#delete', delMsgCanvas);
    $(document).on('change', '#appId-names', storeAppId);
    $('#addbtn').hide();
    $('#save').hide();
    setTimeout(loadAppIdNames, 2000);
});

function loadAppIdNames() {
    let userId = auth.currentUser.uid;
    socket.emit('post userId', (userId));
    socket.on('get appInfos', (data) => {
        var appInfos = data;
        var option = [];
        for (let i in appInfos) {
            option[i] = $('<option>').text(appInfos[i].name).attr('id', i);
            $('#appId-names').append(option[i]);
        }
    });
}

function storeAppId() {
    appId = $(this).find(':selected').attr('id'); // appId為全域變數
    socket.emit('load add friend', (appId));
    socket.on('get greetings', (data) => {
        tableView(data);
    });
} // end of loadFriendsReply

function tableView(greetings) {
    $('#MsgCanvas').empty();
    let objArray = []; // empty the array first
    let textArray = []; // get a new array to emit
    let table = $('<table>').attr('id', appId);
    $('#MsgCanvas').append(table);
    let greetingObj = greetings;
    if (greetingObj === null || greetingObj === '' || greetingObj === undefined) {
        $('#addbtn').show();
    } else {
        let greeting = greetingObj[appId].greetings;
        let greetingIds = Object.keys(greeting);
        for (let i = 0; i < greetingIds.length; i++) {
            objArray.push(greeting[greetingIds[i]]);
            let loadMsg = '<!--TEXT AREA -->' +
                '<tr id="' + greetingIds[i] + '-row">' +
                '<th style="padding:1%; margin:2% 1% 2% 1%; background-color: #ddd">請輸入文字:</th>' +
                '</tr>' +
                '<tr id="' + greetingIds[i] + '-row">' +
                '<td style="background-color: #ddd">' +
                '<span style="float:right" id="delete"> 刪除 </span>' +
                '<form onsubmit="event.preventDefault();" style="padding:1%; margin:1%">' +
                '<textarea id="' + greetingIds[i] + '" rel="' + appId + '" style="border:none" disabled="disabled">' + objArray[i].text + '</textarea>' +
                '</form>' +
                '</td>' +
                '</tr>';
            table.append(loadMsg);
            textArray.push(objArray[i].text);
        }
        currentCount = textArray.length;
        $('#addbtn').show();
    }
}

function addMsgCanvas() {
    if ((currentCount + newCount - deleteCount) < 5) {
        ++newCount;
        let MsgCanvas = '<!--TEXT AREA -->' +
            '<tr id="' + newCount + '-row">' +
            '<th style="padding:1%; margin:2% 1% 2% 1%; background-color: #ddd">請輸入文字:</th>' +
            '</tr>' +
            '<tr id="' + newCount + '-row">' +
            '<td style="background-color: #ddd">' +
            '<span style="float:right" id="delete"> 刪除 </span>' +
            '<form onsubmit="event.preventDefault();" style="padding:1%; margin:1%">' +
            '<textarea id="newText' + newCount + '"></textarea>' +
            '</form>' +
            '</td>' +
            '</tr>';
        $('table#' + appId).append(MsgCanvas);
        $('#save').show();
        idArray['newText' + newCount] = '';
    } else {
        $('#error').show();
        $('#addbtn').hide();
        setTimeout(() => {
            $('#error').hide();
        }, 5000)
    }
} // end of addMsgCanvas

function delMsgCanvas() { // 如果只是新增一個空的tr再刪除會止移除第二個tr
    let greetingId = $(this).parent().find('form').find('textarea').attr('id');
    let rowId = $(this).parent().parent().attr('id');
    if (greetingId === undefined) {
        location.reload();
    } else {
        if (greetingId.charAt(0) === '-') {
            socket.emit('delete greeting', {appId, greetingId});
            socket.on('delete result', (result) => {
                if (null === result) {
                    console.log('刪除失敗');
                    return;
                }
                $(this).parent().parent().siblings('#' + rowId).remove();
                $(this).parent().parent().remove();
            });
        } else {
            $(this).parent().parent().siblings('#' + rowId).remove();
            $(this).parent().parent().remove();
            delete idArray[greetingId];
        }
        ++deleteCount;
        if ((currentCount + newCount - deleteCount) < 5) {
            $('#addbtn').show();
        }
    }
} // end of delMsgCanvas

function modalSubmit() { // 送出新增
    let userId = auth.currentUser.uid;
    for (let key in idArray) {
        if ($('#' + key).val().trim() === '') {
            alert('請填入文字內容');
        } else {
            let greetingObj = {
                type: 'text',
                text: $('#' + key).val()
            };
            socket.emit('post greeting', {userId, appId, greetingObj});
            socket.on('callback greetingId', (data) => {
                if (null === data || undefined === data) {
                    console.log('新增失敗');
                } else {
                    delete idArray[key];
                    ++currentCount;
                    newCount = 0;
                    deleteCount = 0;
                }
            });
        }
    }
    socket.emit('load add friend', (appId));
    socket.on('get greetings', (data) => {
        tableView(data);
    });
    if (0 === newCount) { // 存進資料庫後
        alert('Saved!');
    }
    if ((currentCount + newCount - deleteCount) > 5) {
        $('#addbtn').hide();
    }
    //塞入資料庫並重整
} // end of modalSubmit
