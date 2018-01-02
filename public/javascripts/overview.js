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
                })
                .then(() => {
                    loadTable();
                })
                .then(() => {
                    socket.emit('request line channel', userId);
                });
        }
    }, 10);
    // ACTIONS
    $(document).on('click', '.tablinks', clickMsg);
    $(document).on('click', '#btn-text', btnText);
    $(document).on('click', '.remove-btn', removeInput); //移除input
    $(document).on('click', '#modal-submit', modalSubmit); //新增
    $(document).on('click', '#modal-draft', modalDraft);
    // FUNCTIONS
    function loadTable() {
        database.ref('message-overview/' + userId).once('value', snap => {
            let data = snap.val();
            let key = Object.keys(data);
            for (let i in key) {
                titleItemnumber = data[key[i]].titleItemnumber;
                textInput = data[key[i]].textInput;
                titleOptional = data[key[i]].titleOptional;
                titleSort = data[key[i]].titleSort;
                titleStaus = data[key[i]].titleStaus;
                titleReservation = data[key[i]].titleReservation;
                let stringobj = '<tr>' + '<td>' + 1 + '</td>' + '<td>' + textInput + '</td>' + '<td>' + titleSort + '</td>' + '<td>' + titleOptional + '</td>' + '<td>' + titleStaus + '</td>' + '<td>' + titleReservation + '</td>' + '<td>' + 3 + '</td>' + '</tr>';
                switch (titleStaus) {
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
        userId = auth.currentUser.uid;
        let titleItemnumber = '1',
            titleSort = 'test',
            titleOptional = 'test',
            titleStaus = '3',
            titleReservation = 'test';
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
            if ($('#send-now').prop('checked')) {
                status = 'now'
                socket.emit('push notification to all', { list: clientIntoArray, message: [input1, input2, input3], status: status });

                if (input1 !== undefined) {
                    database.ref('message-overview/' + userId).push({
                        titleItemnumber: titleItemnumber,
                        textInput: input1,
                        titleOptional: titleOptional,
                        titleSort: titleSort,
                        titleStaus: titleStaus,
                        titleReservation: titleReservation
                    });
                    if (input2 !== '未設定') {
                        database.ref('message-overview/' + userId).push({
                            titleItemnumber: titleItemnumber,
                            textInput: input2,
                            titleOptional: titleOptional,
                            titleSort: titleSort,
                            titleStaus: titleStaus,
                            titleReservation: titleReservation
                        });
                        if (input3 !== '未設定') {
                            database.ref('message-overview/' + userId).push({
                                titleItemnumber: titleItemnumber,
                                textInput: input3,
                                titleOptional: titleOptional,
                                titleSort: titleSort,
                                titleStaus: titleStaus,
                                titleReservation: titleReservation
                            });
                        }
                    }
                }
            }
            if ($('#send-sometime').prop('checked')) {
                status = 'now'
                socket.emit('push notification to all', { list: clientIntoArray, message: [input1, input2, input3], status: status });
                titleStaus = '1';
                if (input1 !== undefined) {
                    database.ref('message-overview/' + userId).push({
                        titleItemnumber: titleItemnumber,
                        textInput: input1,
                        titleOptional: titleOptional,
                        titleSort: titleSort,
                        titleStaus: titleStaus,
                        titleReservation: titleReservation
                    });
                    if (input2 !== '未設定') {
                        database.ref('message-overview/' + userId).push({
                            titleItemnumber: titleItemnumber,
                            textInput: input2,
                            titleOptional: titleOptional,
                            titleSort: titleSort,
                            titleStaus: titleStaus,
                            titleReservation: titleReservation
                        });
                        if (input3 !== '未設定') {
                            database.ref('message-overview/' + userId).push({
                                titleItemnumber: titleItemnumber,
                                textInput: input3,
                                titleOptional: titleOptional,
                                titleSort: titleSort,
                                titleStaus: titleStaus,
                                titleReservation: titleReservation
                            });
                        }
                    }
                }
            }


            // 塞入資料庫並重整
            $('#quickAdd').modal('hide');
            $('.textinput').val('');
            $('#send-time').val('');
            $('#inputText').empty();
            inputNum = 0;
            alert('變更已儲存!');
            location.reload();

        }
    }

    function modalDraft() {
        userId = auth.currentUser.uid;
        let textInput = $('.textinput');
        let titleItemnumber = '1',
            titleSort = 'test',
            titleOptional = 'test',
            titleStaus = '2',
            titleReservation = 'test';
        let input1 = $('#inputNum1').val();
        let input2 = $('#inputNum2').val();
        if (input2 === undefined) input2 = '未設定';
        console.log(input2)
        let input3 = $('#inputNum3').val();
        if (input3 === undefined) input3 = '未設定';
        console.log(input3)
        if (input1 !== undefined) {
            database.ref('message-overview/' + userId).push({
                titleItemnumber: titleItemnumber,
                textInput: input1,
                titleOptional: titleOptional,
                titleSort: titleSort,
                titleStaus: titleStaus,
                titleReservation: titleReservation
            });
            if (input2 !== '未設定') {
                database.ref('message-overview/' + userId).push({
                    titleItemnumber: titleItemnumber,
                    textInput: input2,
                    titleOptional: titleOptional,
                    titleSort: titleSort,
                    titleStaus: titleStaus,
                    titleReservation: titleReservation
                });
                if (input3 !== '未設定') {
                    database.ref('message-overview/' + userId).push({
                        titleItemnumber: titleItemnumber,
                        textInput: input3,
                        titleOptional: titleOptional,
                        titleSort: titleSort,
                        titleStaus: titleStaus,
                        titleReservation: titleReservation
                    });
                }
            }
        }
        $('#quickAdd').modal('hide');
        $('.textinput').val('');
        $('#send-time').val('');
        $('#inputText').empty();
        inputNum = 0;
        alert('變更已儲存!');
        location.reload();
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