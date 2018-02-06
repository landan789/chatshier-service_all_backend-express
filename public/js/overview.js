var socket = io.connect(); // Socket
var inputNum = 0; //計算訊息的數量
var inputObj = {};
var clientIntoArray = [];
var deleteNum = 0;
var appId;
var sendtime;

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

    // EXECUTION
    $('#Appointment').show();
    socket.emit("get tags from chat");
    let timer_1 = setInterval(function() {
        if (!auth.currentUser) {
            return;
        } else {
            clearInterval(timer_1);
            userId = auth.currentUser.uid;
            socket.emit('update bot', userId);
            loadTable();
        }
    }, 5);
    // ACTIONS

    $(document).on('change', '#app-select', storeApp);
    $(document).on('click', '.tablinks', clickMsg);
    $(document).on('click', '#btn-text', btnText);
    $(document).on('click', '.remove-btn', removeInput); //移除input
    $(document).on('click', '#modal-submit', modalSubmit); //新增
    $(document).on('click', '#modal-draft', modalDraft);
    // FUNCTIONS
    function loadTable() {
        userId = auth.currentUser.uid;
        findapps();
        storeApp();
        socket.emit('find all info', userId);
        socket.on('composes info', (data) => {
            for (let key in data) {
                textInput = data[key].text;
                status = data[key].status;
                time = data[key].time;
                app = data[key].app;
                let stringobj = '<tr>' + '<td>' + textInput + '</td>' + '<td>' + status + '</td>' + '<td>' + DateTimeString(time) + '</td>' + '</tr>';
                switch (status) {
                    case '1':
                        $('#data-appointment').append(stringobj);
                        break;
                    case '2':
                        $('#data-draft').append(stringobj);
                        break;

                    case '3':
                        $('#data-history').append(stringobj);
                        break;

                }
            }
        });
    }

    function findapps() {
        let userId = auth.currentUser.uid;
        socket.emit('find apps', userId);
        socket.on('apps APPID', (appids) => {
            var appInfo = appids;
            var option = [];
            let j = 1;
            for (let i in appInfo) {
                option[i] = $('<option>').text('APP' + j).attr('id', appInfo[i]);
                j++;
                $('#app-select').append(option[i]);
            }
        });
    }

    function storeApp() {
        appId = $(this).find(':selected').attr('id');
        apptext = $('#app-select').val();
    } // end of loadFriendsReply

    function DateTimeString(d) {
        var today = new Date(d);
        var currentDateTime =
            today.getFullYear() + '年' +
            (today.getMonth() + 1) + '月' +
            today.getDate() + '日' +
            today.getHours() + ':' + today.getMinutes();
        return currentDateTime;
    }

    function removeInput() {
        var id = $(this).parent().find('form').find('textarea').attr('id');
        deleteNum++;
        delete inputObj[id];
        if (inputNum - deleteNum < 4) { $('.error_msg').hide() }
        $(this).parent().remove();
    }

    function clickMsg() { // 更換switch
        var target = $(this).attr('rel');
        $("#" + target).show().siblings().hide();
    }

    function btnText() {
        $('.error-input').hide();
        inputNum++;
        if (inputNum - deleteNum > 3) {
            $('.error-msg').show();
            console.log('超過三則訊息');
            inputNum--;
        } else {
            $('#inputText').append(
                '<div style="margin:2%">' +
                '<span class="remove-btn">刪除</span>' +
                '<tr>' +
                '<th style="padding:1.5%; background-color: #ddd">輸入文字:</th>' +
                '</tr>' +
                '<tr>' +
                '<td style="background-color: #ddd">' +
                '<form style="padding:1%">' +
                '<textarea class="textinput" id="inputNum' + inputNum + '" row="5"></textarea>' +
                '</form>' +
                '</td>' +
                '</tr>' +
                '</div>');
            inputObj['inputNum' + inputNum] = 'inputNum' + inputNum;
        }
    }

    function modalSubmit() {
        var userId = auth.currentUser.uid;
        let messages = [];
        if (0 === inputObj.length) {
            $('.error-input').show();
        } else {
            sendtime = $('#send-time').val();
            let status;
            if ($('#send-now').prop('checked')) {
                status = 'now';
                for (let key in inputObj) {
                    let message = {
                        type: 'text',
                        text: $('#' + key).val()
                    };
                    messages.push(message);
                }
                var emitData = {
                    userId: userId,
                    messages: messages,
                    appId: appId
                };
                socket.emit('push composes to all', emitData);
                insertCompose(messages);
                $('#quickAdd').modal('hide');
                $('.textinput').val('');
                $('#send-time').val('');
                $('#inputText').empty();
                inputNum = 0;
                alert('變更已儲存!');
                location.reload();
            }
        }
        //預約的程式碼
        if ($('#send-sometime').prop('checked')) {
            let messages = [];
            for (let key in inputObj) {
                let message = {
                    type: 'text',
                    text: $('#' + key).val()
                };
                messages.push(message);
            }
            insertReservation(messages);
            $('#quickAdd').modal('hide');
            $('.textinput').val('');
            $('#send-time').val('');
            $('#inputText').empty();
            inputNum = 0;
            $.notify('變更已儲存！', { type: 'success' });
            location.reload();
        }
        // 塞入資料庫並重整
    }

    function insertCompose(messages) {
        let userId = auth.currentUser.uid;
        let composes = {};
        let currentDateTime = DateTimeString();
        for (let i in messages) {
            composes = {
                'time': Date.now(currentDateTime),
                'status': 3,
                'type': messages[i].type,
                'text': messages[i].text
            };

            socket.emit('insert compose', { userId, composes, appId });
        }
    }

    function insertReservation(messages) {
        let userId = auth.currentUser.uid;
        let composes = {};
        let currentDateTime = DateTimeString();
        for (let i in messages) {
            composes = {
                'time': ISODateTimeString(sendtime),
                'status': 1,
                'type': messages[i].type,
                'text': messages[i].text
            };
            socket.emit('insert Reservation', { userId, composes, appId });
        }
    }

    function modalDraft() {
        let userId = auth.currentUser.uid;
        let messages = [];
        for (let key in inputObj) {
            let message = {
                type: 'text',
                text: $('#' + key).val()
            };
            messages.push(message);
        }
        insertComposeDraft(messages);
        $('#quickAdd').modal('hide');
        $('.textinput').val('');
        $('#send-time').val('');
        $('#inputText').empty();
        inputNum = 0;
        $.notify('變更已儲存！', { type: 'success' });
        location.reload();
    }

    function insertComposeDraft(messages) {
        let userId = auth.currentUser.uid;
        let composes = {};
        let currentDateTime = DateTimeString();
        for (let i in messages) {
            composes = {
                'time': currentDateTime,
                'status': 2,
                'type': messages[i].type,
                'text': messages[i].text
            };

            socket.emit('insert compose', { userId, composes, appId });
        }
    }

    function ISODateTimeString(d) {
        d = new Date(d);

        function pad(n) { return n < 10 ? '0' + n : n }
        return d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate()) + 'T' +
            pad(d.getHours()) + ':' +
            pad(d.getMinutes());
    }
});