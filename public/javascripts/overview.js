var socket = io.connect(); // Socket
var inputNum = 0; //計算訊息的數量
var clientIntoArray = [];
$(document).ready(function() {
    // EXECUTION
    $('#Appointment').show();
    loadClientData();
    socket.emit("get tags from chat");
    let timer_1 = setInterval(function() {
        if (!auth.currentUser) {
            return;
        } else {
            clearInterval(timer_1);
            userId = auth.currentUser.uid;
            database.ref('users/' + userId).once('value', snap => {
                let data = snap.val();
                let name1 = data.name1;
                let name2 = data.name2;
                let fbName = data.fbName;
                let id1 = data.chanId_1;
                let id2 = data.chanId_2;
                let secret1 = data.chanSecret_1;
                let secret2 = data.chanSecret_2;
                let token1 = data.chanAT_1;
                let token2 = data.chanAT_2;
                let fbPageId = data.fbPageId;
                let fbAppId = data.fbAppId;
                let fbAppSecret = data.fbAppSecret;
                let fbValidToken = data.fbValidToken;
                let fbPageToken = data.fbPageToken;
                if ((!name1 || !id1 || !secret1 || !token1) && (!name2 || !id2 || !secret2 || !token2) && (!fbName || !fbPageId || !fbAppId || !fbAppSecret || !fbValidToken || !fbPageToken)) {
                    // 放modal提示
                    $('#errorModal').modal("show");
                } else {
                    $('#line1 p').text(name1);
                    $('#line2 p').text(name2);
                    $('#fbname p').text(fbName);
                    socket.emit('update bot', {
                        line_1: {
                            channelId: id1,
                            channelSecret: secret1,
                            channelAccessToken: token1
                        },
                        line_2: {
                            channelId: id2,
                            channelSecret: secret2,
                            channelAccessToken: token2
                        },
                        fb: {
                            pageID: fbPageId,
                            appID: fbAppId,
                            appSecret: fbAppSecret,
                            validationToken: fbValidToken,
                            pageToken: fbPageToken
                        },
                    });
                }
            });
            setTimeout(() => {
                socket.emit('request line channel', userId);
            }, 1000);
        }
    }, 10);
    // ACTIONS
    $(document).on('click', '.tablinks', clickMsg);
    $(document).on('click', '#btn-text', btnText);
    $(document).on('click', '.remove-btn', removeInput); //移除input
    $(document).on('click', '#modal-submit', modalSubmit); //新增
    // FUNCTIONS
    function clickMsg() { // 更換switch
        var target = $(this).attr('rel');
        $("#" + target).show().siblings().hide();
    }

    function btnText() {
        $('.error-input').hide();
        inputNum++;
        if (inputNum > 3) {
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
            console.log('inputNum: ', inputNum);
        }
    }

    function removeInput() {
        inputNum--;
        if (inputNum < 4) { $('.error_msg').hide() }
        $(this).parent().remove();
    }

    function modalSubmit() {
        let textInput = $('.textinput');
        console.log(textInput.length);
        if (textInput.length === 0) {
            $('.error-input').show();
        } else if (textInput.val() === '') {
            textInput.addClass('error-border');
        } else {
            let input1 = $('#inputNum1').val();
            console.log(input1)
            let input2 = $('#inputNum2').val();
            if (input2 === undefined) input2 = '未設定';
            console.log(input2)
            let input3 = $('#inputNum3').val();
            if (input3 === undefined) input3 = '未設定';
            console.log(input3)
            let status;
            if ($('#send-now').attr('checked') === 'checked') {
                status = 'now'
                socket.emit('push notification to all', { list: clientIntoArray, message: [input1, input2, input3], status: status });
            } else {
                status = 'put the reserved time here'
                console.log('not checked')
            }

            // 塞入資料庫並重整
            $('#quickAdd').modal('hide');
            $('.textinput').val('');
            $('#sendTime').val('');
            $('#inputText').empty();
            inputNum = 0;
            alert('變更已儲存!');
        }
    }

    function loadClientData() {
        database.ref('chats/Data').once('value', item => {
            let chatObj = item.val();
            let chatKey = Object.keys(chatObj);
            chatKey.map(item => {
                clientIntoArray.push({ userId: chatObj[item].Profile.userId, chanId: chatObj[item].Profile.channelId });
            });
            console.log(clientIntoArray);
        });
    }
});