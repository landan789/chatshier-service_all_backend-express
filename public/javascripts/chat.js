const socket = io.connect(); // Socket
const LOADING_MSG_AND_ICON = "<p class='message-day'><strong><i>" + "Loading History Messages..." + "</i></strong><span class='loadingIcon'></span></p>";
const NO_HISTORY_MSG = "<p class='message-day'><strong><i>" + "-沒有更舊的歷史訊息-" + "</i></strong></p>";
const COLOR = {
    FIND: "#ff0000",
    CLICKED: "#ccc",
    FINDBACK: "#ffff00"
};
const SCROLL = {
    HEIGHT: 90
};
const yourdomain = 'fongyu'; // freshdesk domain
const api_key = 'UMHU5oqRvapqkIWuOdT8'; // freshdesk agent api key
var agentId = ""; // agent的ID
var person = "Unname"; // agent稱謂
var name_list = []; // list of all users
var room_list = []; // room ID for line
var userProfiles = []; //array which store all user's profile
var ticketInfo = {};
var contactInfo = {};
var agentInfo = {};
var sortRecentBool = true; //bool for sort recent time up or down
var sortTotalBool = true; //bool for sort total time up or down
var sortFirstBool = true; //bool for sort first time up or down
var TagsData; //data of user info tags
var internalTagsData;
var agentIdToName;
// selectors
var $infoPanel = $('#infoPanel');
var messageInput = $('#message'); // 訊息欄
var canvas = $("#canvas"); // 聊天室空間
var infoCanvas = $("#infoCanvas"); // 個人資料空間
var error = $('.error');
var ocClickShow = $('.on-click-show');
var openChatAppItem = $('.chat-app-item[open="true"]');
var searchBox = $('#searchBox');
var addTicketModal = $('#add-ticket-modal');

$(document).ready(function () {
    // start the loading works
    $infoPanel.hide();
    var ref = firebase.database().ref('users/NfO3a14q7RhSytPvngevDluRzG32/name');
    ref.transaction(function (name) {
        return name + '1';
        // If users/ada/rank has never been set, currentRank will be `null`.
    });

    var startUserId = setInterval(() => {
        if (auth.currentUser) {
            clearInterval(startUserId);
            agentId = auth.currentUser.uid;
            socket.emit('request chat init data', {
                id: agentId
            }, responseChatInitData);
        }
    }, 1000);

    //=====start chat event=====
    openChatAppItem.click(showChatApp);
    $(document).on('click', '.tablinks', clickUserTablink); // 群組清單裡面選擇客戶
    $(document).on('focus', '#message', readClientMsg); //已讀客戶訊息
    $(document).on('click', '#submitMsg', submitMsg); // 訊息送出
    ocClickShow.on('click', triggerFileUpload); // 傳圖，音，影檔功能
    $('.send-file').on('change', fileUpload); // 傳圖，音，影檔功能
    $('[data-toggle="tooltip"]').tooltip();
    messageInput.on('keydown', function (e) { // 按enter可以發送訊息
        if (e.keyCode === 13) {
            $('#submitMsg').click();
        }
    });
    //=====end chat event=====

    //=====start profile event=====
    $(document).on('click', '#show-profile', showProfile);
    $(document).on('click', '.userinfo-td[modify="true"] p#td-inner', userInfoClick);
    $(document).on('keypress', '.userinfo-td[modify="true"] input[type="text"]', userInfoKeyPress);
    $(document).on('blur', '.userinfo-td[modify="true"] input[type="text"]', userInfoBlur);
    $(document).on('click', '.profile-confirm button', userInfoConfirm);
    $(document).on('click', '.internal-profile-confirm button', internalConfirm);
    $(document).on('click', '.photo-choose', groupPhotoChoose);
    $(document).on('change', '.photo-ghost', groupPhotoUpload);
    //=====end profile event=====

    //=====start ticket event=====
    $(document).on('click', '#show-todo', showTodo);
    $(document).on('click', '.ticketContent', moreInfo);
    $(document).on('click', '.edit', showInput);
    $(document).on('focusout', '.inner', hideInput);
    $(document).on('keypress', '.inner', function (e) {
        if (e.which === 13) $(this).blur();
    });
    $(document).on('keyup', '.ticketSearchBar', ticketSearch);
    addTicketModal.on('show.bs.modal', openTicketModal);
    $(document).on('click', '#form-submit', addTicket);
    $(document).on('click', '#ticket-info-delete', deleteTicket);
    $(document).on('click', '#ticket-info-modify', modifyTicket)
    //=====end ticket event=====

    //=====start utility event=====

    $(document).on('change', '.multi-select-container', multiSelectChange);
    $(document).on('click', '.dropdown-menu', function (event) {
        event.stopPropagation();
    });
    $.extend($.expr[':'], {
        'containsi': function (elem, i, match, array) {
            return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
        }
    });
    //=====end utility event=====

    //==========start initialize function========== //
    function responseChatInitData(data) {
        if (data.reject) {
            alert(data.reject);
        } else {
            responseInternalChatData(data.internalChatData);
            responseTags(data.tagsData);
            responseUserAppIds(data.appsData);
        }
    }

    function responseUserAppIds(data) {
        let appsInfo = data;
        if (appsInfo !== undefined || Object.getOwnPropertyNames(appsInfo).length !== 0) {
            let newData = Object.values(appsInfo);
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed
                .then(() => {
                    return new Promise((resolve, reject) => {
                        let newArr = newData.filter((item) => {
                            return item.delete === 0;
                        });
                        resolve(newArr);
                    });
                })
                .then((data) => {
                    let allActiveApps = data;
                    return new Promise((resolve, reject) => {
                        let idArr = [];
                        allActiveApps.map((item) => {
                            idArr.push(item.id1);
                            room_list.push(item.id1);
                            appGroupSort(item);
                            if (idArr.length === allActiveApps.length){
                                resolve(idArr);
                            } 
                        });
                    });
                })
                .then((data) => {
                    let allAppIds = data;
                    socket.emit('request chat data', allAppIds, responseChatData);
                })
                .catch((error) => {
                    console.log('loading apps error');
                });
        } else {
            if ('1' !== window.sessionStorage["notifyModal"]) { // 網頁refresh不會出現errorModal(但另開tab會)
                $('#notifyModal').modal("show");
                window.sessionStorage["notifyModal"] = 1;
            }
        }
    } // end of responseUserAppIds

    function appGroupSort(data) {
        switch (data.type) {
            case 'line':
                let lineStr =
                    '<div class="chat-app-item" id="LINE" open="true" data-toggle="tooltip" data-placement="right" title="' + data.name + '" rel="' + data.id1 + '">' +
                    '<img class="software-icon" src="http://informatiekunde.dilia.be/sites/default/files/uploads/logo-line.png">' +
                    '<div class="unread-count"></div>' +
                    '</div>';
                $('#chat_App').append(lineStr);
                break;
            case 'facebook':
                let fbStr =
                    '<div class="chat-app-item" id="FB" open="true" data-toggle="tooltip" data-placement="right" title="' + data.name + '" rel="' + data.id1 + '">' +
                    '<img class="software-icon" src="https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png">' +
                    '<div class="unread-count"></div>' +
                    '</div>';
                $('#chat_App').append(fbStr);
                break;
        }
    }

    function responseChannels(data) {
        if (data[0].id1 === '' && data[1].id2 === '' && data[2].id1 === '') {
            if ('1' !== window.sessionStorage["notifyModal"]) { // 網頁refresh不會出現errorModal(但另開tab會)
                $('#notifyModal').modal("show");
                window.sessionStorage["notifyModal"] = 1;
            }
        } else {
            socket.emit('request chat data', [data[0].id1, data[1].id1, data[2].id1], responseChatData);
            $('.chat-app-item#Line_1').attr('rel', data[0].id1);
            $('.chat-app-item#Line_2').attr('rel', data[1].id1);
            $('.chat-app-item#FB').attr('rel', data[2].id1);
            $('#Line_1').attr('data-original-title', data[0].name);
            $('#Line_2').attr('data-original-title', data[1].name);
            $('#FB').attr('data-original-title', data[2].name);
            room_list.push(data[0].id1); // line1
            room_list.push(data[1].id1); // line2
            room_list.push(data[2].id1); // facebook

        }
    } // end of responseChannels

    function responseChatData(data) {
        for (i in data) pushMsg(data[i], () => {
            pushInfo(data[i]);
        }); //聊天記錄
        sortUsers("recentTime", sortRecentBool, function (a, b) {
            return a < b;
        }); //照時間排列 新到舊
    } // end of responseChatData

    function responseHistoryMsg(data) {
        let msgContent = $('#' + data.userId + '-content' + '[rel="' + data.channelId + '"]');
        let origin_height = msgContent[0].scrollHeight;
        msgContent.find('.message:first').remove();
        msgContent.find('.message-day:lt(3)').remove();
        msgContent.prepend(historyMsgToStr(data.messages));
        let now_height = msgContent[0].scrollHeight;
        msgContent.animate({
            scrollTop: now_height - origin_height
        }, 0);
        if (msgContent.attr('data-position') > 0) msgContent.prepend(LOADING_MSG_AND_ICON);
        else msgContent.prepend(NO_HISTORY_MSG);
    }

    function responseTags(data) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id == "assigned") {
                let list = [];
                for (let prop in agentIdToName) {
                    list.push(agentIdToName[prop]);
                }
                data[i].data.set = list;
                break;
            }
        }
        TagsData = data;
    }

    function responseInternalChatData(data) {
        internalTagsData = data.internalTagsData;
        agentIdToName = data.agentIdToName;
        for (i in data.data) {
            pushInternalMsg(data.data[i]); //聊天記錄
            pushInternalInfo(data.data[i].Profile);
        }
    }

    function pushMsg(data, callback) {
        let historyMsg = data.Messages;
        let profile = data.Profile;
        let historyMsgStr = "";
        if (data.position !== 0) {
            historyMsgStr += LOADING_MSG_AND_ICON; //history message string head
        } else {
            historyMsgStr += NO_HISTORY_MSG; //history message string head
        }
        historyMsgStr += historyMsgToStr(historyMsg);
        // end of history message
        $('#user-rooms').append('<option value="' + profile.userId + '">' + profile.nickname + '</option>'); //new a option in select bar

        let lastMsg = historyMsg[historyMsg.length - 1];
        let lastMsgStr = lastMsgToStr(lastMsg);

        let tablinkHtml = "<b><button class='tablinks'" + "name='" + profile.userId + "' rel='" + profile.channelId + "'><div class='img-holder'>" + "<img src='" + profile.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + profile.nickname + "</span>" + lastMsgStr + "</div>";
        if ((profile.unRead > 0) && (profile.unRead <= 99)) {
            tablinkHtml += "<div class='chsr unread-msg badge badge-pill' style='display:block;'>" + profile.unRead + "</div>" + "</button><hr/></b>";
        } else if (profile.unRead > 99) {
            tablinkHtml += "<div class='chsr unread-msg badge badge-pill' style='display:block;'>" + "99+" + "</div>" + "</button><hr/></b>";
        } else {
            tablinkHtml += "</div>" + "<div class='chsr unread-msg badge badge-pill' style='display:none;'>" + profile.unRead + "</div>" + "</button><hr/></b>";
        }
        if (typeof (profile.VIP等級) === "string" && profile.VIP等級 !== "未選擇") {
            $('#vip_list').prepend(tablinkHtml);
        } else {
            $('#clients').append(tablinkHtml);
        }
        canvas.append( //push string into canvas
            '<div id="' + profile.userId + '" rel="' + profile.channelId + '" class="tabcontent">' + "<div id='" + profile.userId + "-content' rel='" + profile.channelId + "' class='messagePanel' data-position='" + data.position + "'>" + historyMsgStr + "</div>" + "</div>"
        ); // close append
        if (data.position != 0) $('#' + profile.userId + '-content' + '[rel="' + profile.channelId + '"]').on('scroll', function () {
            detecetScrollTop($(this));
        });
        name_list.push(profile.channelId + profile.userId); //make a name list of all chated user
        userProfiles[profile.userId] = profile;
        callback();
    } // end of pushMsg
    function historyMsgToStr(messages) {
        let returnStr = "";
        let nowDateStr = "";
        let prevTime = 0;
        for (let i in messages) {
            //this loop plus date info into history message, like "----Thu Aug 01 2017----"
            let d = new Date(messages[i].time).toDateString(); //get msg's date
            if (d != nowDateStr) {
                //if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                returnStr += "<p class='message-day'><strong>" + nowDateStr + "</strong></p>"; //plus date info
            }
            if (messages[i].time - prevTime > 15 * 60 * 1000) {
                //if out of 15min section, new a section
                returnStr += "<p class='message-day'><strong>" + toDateStr(messages[i].time) + "</strong></p>"; //plus date info
            }
            prevTime = messages[i].time;
            if (messages[i].owner === "agent") {
                //plus every history msg into string
                returnStr += toAgentStr(messages[i].message, messages[i].name, messages[i].time);
            } else returnStr += toUserStr(messages[i].message, messages[i].name, messages[i].time);
        }
        return returnStr;
    } // end of historyMsgToStr
    function pushInfo(data) {
        let profile = data.Profile;
        for (let i in profile.email) {
            socket.emit('get ticket', {
                email: profile.email[i],
                id: profile.userId
            });
        }
        if (room_list.indexOf(profile.channelId) != -1) {
            infoCanvas.append('<div class="card-group" id="' + profile.userId + '-info" rel="' + profile.channelId + '-info">' + '<div class="card-body" id="profile">' + "<div class='photo-container'>" + '<img src="' + profile.photo + '" alt="無法顯示相片" style="width:128px;height:128px;">' + "</div>" + loadPanelProfile(profile) + '<div class="profile-confirm">' + '<button type="button" class="btn btn-info pull-right" id="confirm">Confirm</button>' + '</div>' + '</div>' + '<div class="card-body" id="ticket" style="display:none; "></div>' + '<div class="card-body" id="todo" style="display:none; ">' + '<div class="ticket">' + '<table>' + '<thead>' + '<tr>' + '<th onclick="sortCloseTable(0)"> 狀態 </th>' + '<th onclick="sortCloseTable(1)"> 到期 </th>' + '<th><input type="text" class="ticketSearchBar" id="exampleInputAmount" value="" placeholder="搜尋"/></th>' + '<th><a id="' + profile.userId + '-modal" data-toggle="modal" data-target="#add-ticket-modal"><span class="fa fa-plus fa-fw"></span> 新增待辦</a></th>' + '</tr>' + '</thead>' + '<tbody class="ticket-content">' + '</tbody>' + '</table>' + '</div>' + '</div>' + '</div>' + '</div>');
        }
    } // end of pushInfo
    function loadPanelProfile(profile) {
        let table = $.parseHTML("<table class='panel-table'></table>");
        for (let i = 0; i < TagsData.length; i++) {
            let tagId = TagsData[i].id;
            let tagSource = TagsData[i].source;
            let tagData = TagsData[i].data;

            let name = tagData.name;
            let type = tagData.type;
            let set = tagData.set;
            let modify = tagData.modify;

            let th = $.parseHTML('<th class="userInfo-th"></th>');
            let td = $.parseHTML('<td class="userinfo-td"></td>');
            //todo userinfo-td css

            if (tagSource == "default") {
                let profData = profile[tagId];
                let dom = {};
                if (tagId == "nickname" || tagId == "email" || tagId == "age" || tagId == "remark" || tagId == "telephone") {
                    dom = getSingleTextDom(tagData, profData);
                } else if (tagId == "gender") {
                    dom = getSingleSelectDom(tagData, profData);
                } else if (tagId == "firstChat" || tagId == "recentChat") {
                    dom = getTimeDom(tagData, profData);
                } else if (tagId == "totalChat" || tagId == "avgChat") {
                    dom = getSingleTextDom(tagData, profData);
                    let text = $(dom).text();
                    text = parseFloat(text).toFixed(2).toString();
                    $(dom).text(text + " 分鐘");
                } else if (tagId == "chatTimeCount") {
                    dom = getSingleTextDom(tagData, profData);
                    $(dom).text($(dom).text() + " 次");
                } else if (tagId == "assigned") {
                    dom = getMultiSelectDom(tagData, profData);
                }
                $(th).attr('id', tagId).text(name);
                $(td).attr('id', tagId).attr('type', type).attr('set', set).attr('modify', modify).html(dom);
            } else {
                let profData = profile[name];
                let dom = {};
                if (type == "text") {
                    dom = getSingleTextDom(tagData, profData);
                } else if (type == "time") {
                    dom = getTimeDom(tagData, profData);
                } else if (type == "single-select") {
                    dom = getSingleSelectDom(tagData, profData);
                } else if (type == "multi-select") {
                    dom = getMultiSelectDom(tagData, profData);
                }

                $(th).attr('id', name).text(name);
                $(td).attr('id', name).attr('type', type).attr('set', set).attr('modify', modify).html(dom);
            }
            $(table).append('<tr>' + th[0].outerHTML + td[0].outerHTML + '</tr>');
        }
        return $(table)[0].outerHTML;

        function getSingleTextDom(tagD, profD) {
            let dom = $.parseHTML('<p id="td-inner">尚未輸入</p>');
            if (profD) $(dom).text(profD);
            return dom;
        }

        function getTimeDom(tagD, profD) {
            let dom = $.parseHTML('<input type="datetime-local" id="td-inner"></input>');
            if (!tagD.modify) $(dom).prop('readOnly', true);

            if (profD) {
                d = new Date(profD);
                let val = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + 'T' + addZero(d.getHours()) + ':' + addZero(d.getMinutes());
                $(dom).attr("value", val);
            }
            return dom;
        }

        function getSingleSelectDom(tagD, profD) {
            let dom = $.parseHTML('<select id="td-inner"></select>');
            $(dom).append('<option value=""> 未選擇 </option>');
            if (!tagD.modify) $(dom).prop('readOnly', true);
            for (let i in tagD.set) {
                let opt = tagD.set[i];
                let option = $.parseHTML('<option></option>');
                $(option).val(opt).text(opt).attr("selected", (opt == profD));
                $(dom).append(option);
            }
            return dom;
        }

        function getMultiSelectDom(tagD, profD) {
            let dom = $.parseHTML('<div class="btn-group" id="td-inner"></div>');
            $(dom).append('<button class="multi-button" type="button" data-toggle="dropdown" aria-expanded="false">');
            $(dom).append('</button><ul class="multi-select-container dropdown-menu"></ul>');
            if (!tagD.modify) $(dom).find('button').prop('disabled', true);
            if (!profD) profD = "";

            let selected = profD.split(',');
            let set = tagD.set;

            let text = profD && selected.length == set.length ? "全選" : profD;
            $(dom).find('button').append('<span></span><b class="caret"></b>');
            $(dom).find('span').attr('class', 'multi-select-text').attr('rel', profD).text(text);

            for (let i in set) {
                let input = $.parseHTML('<input type="checkbox">');
                $(input).attr('value', set[i]);
                if (selected.indexOf(set[i]) != -1) $(input).attr('checked', '');
                $(dom).find('ul').append('<li>' + input[0].outerHTML + set[i] + '</li>');
            }
            return dom;
        }
    } // end of loadPanelProfile

    function pushInternalMsg(data) {
        let historyMsg = data.Messages;
        let profile = data.Profile;
        let historyMsgStr = "";
        historyMsgStr += internalHistoryMsgToStr(historyMsg);
        // end of history message
        $('#user-rooms').append('<option value="' + profile.userId + '">' + profile.nickname + '</option>'); //new a option in select bar
        let lastMsg = historyMsg[historyMsg.length - 1];
        let lastMsgStr = lastMsgToStr(lastMsg);
        if (profile.unRead > 0) {
            $('#clients').append("<b><button style='text-align:left' class='tablinks'" + "name='" + profile.roomId + "' rel='internal'" + "data-avgTime='" + profile.avgChat + "' " + "data-totalTime='" + profile.totalChat + "' " + "data-chatTimeCount='" + profile.chatTimeCount + "' " + "data-firstTime='" + profile.firstChat + "' " + "data-recentTime='" + lastMsg.time + "' >" + "<div class='img-holder'>" + "<img src='" + profile.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + profile.roomName + "</span>" + lastMsgStr + "</div>" + "<div class='chsr unread-msg badge badge-pill' style='display:block;'>" + profile.unRead + "</div>" + "</button><hr/></b>"); //new a tablinks
        } else {
            $('#clients').append("<b><button style='text-align:left' class='tablinks'" + "name='" + profile.roomId + "' rel='internal'" + "data-avgTime='" + profile.avgChat + "' " + "data-totalTime='" + profile.totalChat + "' " + "data-chatTimeCount='" + profile.chatTimeCount + "' " + "data-firstTime='" + profile.firstChat + "' " + "data-recentTime='" + lastMsg.time + "' >" + "<div class='img-holder'>" + "<img src='" + profile.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + profile.roomName + "</span>" + lastMsgStr + "</div>" + "<div class='chsr unread-msg badge badge-pill' style='display:none;'>" + profile.unRead + "</div>" + "</button><hr/></b>"); //new a tablinks
        }
        // 依照不同的channel ID做分類
        canvas.append( //push string into canvas
            '<div id="' + profile.roomId + '" rel="internal" class="tabcontent"style="display: none;">' + "<div id='" + profile.roomId + "-content' rel='internal' class='messagePanel' data-position='" + 0 + "'>" + historyMsgStr + "</div>" + "</div>"
        ); // close append
        name_list.push("internal" + profile.roomId); //make a name list of all chated user
        userProfiles[profile.roomId] = profile;
    } // end of pushInternalMsg
    function internalHistoryMsgToStr(messages) {
        let returnStr = "";
        let nowDateStr = "";
        let prevTime = 0;
        for (let i in messages) {
            messages[i].name = agentIdToName[messages[i].agentId];
            //this loop plus date info into history message, like "----Thu Aug 01 2017----"
            let d = new Date(messages[i].time).toDateString(); //get msg's date
            if (d != nowDateStr) {
                //if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                returnStr += "<p class='message-day' style='text-align: center'><strong>" + nowDateStr + "</strong></p>"; //plus date info
            }
            if (messages[i].time - prevTime > 15 * 60 * 1000) {
                //if out of 15min section, new a section
                returnStr += "<p class='message-day' style='text-align: center'><strong>" + toDateStr(messages[i].time) + "</strong></p>"; //plus date info
            }
            prevTime = messages[i].time;
            if (messages[i].agentId == agentId) {
                //plus every history msg into string
                returnStr += toAgentStr(messages[i].message, messages[i].name, messages[i].time);
            } else returnStr += toUserStr(messages[i].message, messages[i].name, messages[i].time);
        }
        return returnStr;
    } // end of internalHistoryMsgToStr
    function pushInternalInfo(profile) {
        let photoHtml = "<div class='photo-container' rel='" + profile.photo + "'><input type='file' class='photo-ghost' style='visibility:hidden; height:0'>" + '<img class="photo-choose" src="' + profile.photo + '" alt="無法顯示相片" style="width:auto;height:128px;">' + "</div>";
        infoCanvas.append('<div class="card-group" id="' + profile.roomId + '-info" rel="internal-info">' + '<div class="card-body" id="profile">' + photoHtml + loadInternalPanelProfile(profile) + '<div class="internal-profile-confirm">' + '<button type="button" class="btn btn-info pull-right" id="confirm">Confirm</button>' + '</div>' + '</div></div>');
    } // end of pushInternalInfo
    function loadInternalPanelProfile(profile) {
        let html = "<table class='panel-table'>";
        for (let i in internalTagsData) {
            let name = internalTagsData[i].name;
            let type = internalTagsData[i].type;
            let set = internalTagsData[i].set;
            let modify = internalTagsData[i].modify;
            let data = profile[name];
            let tdHtml = "";
            if (type === 'text') {
                if (data) {
                    tdHtml = '<p id="td-inner">' + data + '</p>';
                } else {
                    tdHtml = '<p id="td-inner">尚未輸入</p>';
                }
            } else if (type === "time") {
                if (modify) tdHtml = '<input type="datetime-local" id="td-inner" ';
                else tdHtml = '<input type="datetime-local" id="td-inner" readOnly ';
                if (data) {
                    d = new Date(data);
                    tdHtml += 'value="' + d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + 'T' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + '"';
                }
                tdHtml += ' ></input>';
            } else if (type === 'single-select') {
                if (modify) tdHtml = '<select id="td-inner">';
                else tdHtml = '<select id="td-inner" disabled>';
                if (!data) tdHtml += '<option selected="selected" > 未選擇 </option>';
                else tdHtml += '<option> 未選擇 </option>';
                if (name == "owner") {
                    for (let id in agentIdToName) {
                        if (id != data) tdHtml += '<option value="' + id + '">' + agentIdToName[id] + '</option>';
                        else tdHtml += '<option value="' + id + '" selected="selected">' + agentIdToName[id] + '</option>';
                    }
                } else {
                    for (let j in set) {
                        if (set[j] != data) tdHtml += '<option value="' + set[j] + '">' + set[j] + '</option>';
                        else tdHtml += '<option value="' + set[j] + '" selected="selected">' + set[j] + '</option>';
                    }
                }
                tdHtml += '</select>';
            } else if (type === 'multi-select') {
                tdHtml = '<div class="btn-group" id="td-inner">';
                if (modify === true) tdHtml += '<button type="button" data-toggle="dropdown" aria-expanded="false">';
                else tdHtml += '<button type="button" data-toggle="dropdown" aria-expanded="false" disabled>';
                if (!data) data = "";
                if (name == "agent") {
                    let selected = data.split(',');
                    let names = selected.map(function (e) {
                        return agentIdToName[e];
                    });
                    if (names.length == Object.keys(agentIdToName).length) tdHtml += '<span class="multi-select-text" rel="' + data + '">' + "全選" + '</span>';
                    else tdHtml += '<span class="multi-select-text" rel="' + data + '">' + names.join(',') + '</span>';
                    tdHtml += '<b class="caret"></b></button>' + '<ul class="multi-select-container dropdown-menu">';
                    for (let id in agentIdToName) {
                        if (selected.indexOf(id) != -1) tdHtml += '<li><input type="checkbox" value="' + id + '" checked>' + agentIdToName[id] + '</li>';
                        else tdHtml += '<li><input type="checkbox" value="' + id + '">' + agentIdToName[id] + '</li>';
                    }
                } else {
                    let selected = data.split(',');
                    if (selected.length == set.length) tdHtml += '<span class="multi-select-text">' + "全選" + '</span>';
                    else tdHtml += '<span class="multi-select-text">' + data + '</span>';
                    tdHtml += '<b class="caret"></b></button>' + '<ul class="multi-select-container dropdown-menu">';
                    for (let j in set) {
                        if (selected.indexOf(set[j]) != -1) tdHtml += '<li><input type="checkbox" value="' + set[j] + '" checked>' + set[j] + '</li>';
                        else tdHtml += '<li><input type="checkbox" value="' + set[j] + '">' + set[j] + '</li>';
                    }
                }
                tdHtml += '</ul></div>';
            }
            html += '<tr>' + '<th class="userInfo-th" id="' + name + '">' + name + '</th>' + '<td class="userinfo-td" id="' + name + '" type="' + type + '" set="' + set + '" modify="' + modify + '">' + tdHtml + '</td>';
        }
        html += "</table>";
        return html;
    } // end of loadInternalPanelProfile
    //==========end initialize function========== //

    //=====start socket function=====
    socket.on('new message', (data) => {
        console.log(data);
        if (!data.channelId) {
            console.log("data miss channelId");
            return;
        }
        let $room = $('.chat-app-item[rel="' + data.channelId + '"]');
        if ($room.length != 0) {
            displayMessage(data, data.channelId); //update 聊天室
            displayClient(data, data.channelId); //update 客戶清單
            if (name_list.indexOf(data.channelId + data.id) === -1) { // 新客戶
                name_list.push(data.channelId + data.id);
            }
        }
    });
    socket.on('new internal message', (data) => {
        let $room = $('.tablinks-area .tablinks[name="' + data.roomId + '"]');
        if ($room.length != 0) {
            displayMessageInternal(data.sendObj, data.roomId);
            displayClientInternal(data.sendObj, data.roomId);
        }
    });
    socket.on('new user profile', function (data) {
        userProfiles[data.userId] = data;
        pushInfo({
            "Profile": data
        });
    });
    //=====end socket function=====

    //=====start chat function=====
    function showChatApp() {
        let str;
        let thisRel = $(this).attr('rel');
        if (thisRel === 'All') {
            $('.tablinks-area').find('b').show();
        } else if (thisRel === 'unread') {
            $('.tablinks-area').find('.unread-msg').each(function (index, el) {
                if ($(this).text() === '0') {
                    $(this).parent().parent().hide();
                } else {
                    $(this).parent().parent().show();
                }
            });
        } else if (thisRel === 'assigned') {
            $('.tablinks-area').find('b').hide();
            $('#td-inner .multi-button .multi-select-text').each(function (index, el) {
                // console.log($(this).attr('rel'));
                // console.log($(this).attr('rel') === '');
                str = $(this).attr('rel').split(',');
                let rel = str.length === 1 && str[0] === '' ? $(this).attr('rel') : str;
                if (rel !== '') {
                    let id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    let newId = id.substring(0, id.indexOf('-'));
                    // console.log(id);
                    console.log(newId);
                    $('.tablinks[name="' + newId + '"]').parent().show();
                }
            });
        } else if (thisRel === 'unassigned') {
            $('.tablinks-area').find('b').hide();
            $('#td-inner .multi-button .multi-select-text').each(function (index, el) {
                str = $(this).attr('rel').split(',');
                let rel = str.length === 1 && str[0] === '' ? $(this).attr('rel') : str;
                if (rel === '') {
                    let id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    let newId = id.substring(0, id.indexOf('-'));
                    console.log(newId);
                    $('.tablinks[name="' + newId + '"]').parent().show();
                }
            });
        } else {
            $('.tablinks-area').find('b').hide();
            $('.tablinks-area').find('[rel="' + thisRel + '"]').parent().show();
        }
    }

    function clickUserTablink() {
        let userId = $(this).attr('name'); // ID
        let channelId = $(this).attr('rel'); // channelId
        $('#send-message').show();
        $infoPanel.show();
        if (channelId === 'internal') {
            $('#show-todo').hide();
        } else {
            $('#show-todo').show();
        }
        loadTable(userId);
        $(".tablinks#selected").removeAttr('id').css("background-color", ""); //selected tablinks change, clean prev's color
        $(this).attr('id', 'selected').css("background-color", COLOR.CLICKED); //clicked tablinks color
        if ($(this).find('.unread-msg').text() !== '0') { //如果未讀的話
            $(this).find('.unread-msg').text('0').hide(); // 已讀 把未讀的區塊隱藏
            $(this).find("#msg").css("font-weight", "normal"); // 取消未讀粗體
            socket.emit("read message", {
                channelId: channelId,
                userId: userId
            }); //tell socket that this user isnt unRead
        }
        $('#user-rooms').val(userId); //change value in select bar
        $("#" + userId + "-info" + "[rel='" + channelId + "-info']").show().siblings().hide(); //show it, and close others
        $("#" + userId + "[rel='" + channelId + "']").show().siblings().hide(); //show it, and close others
        $("#" + userId + "[rel='" + channelId + "']" + '>#' + userId + '-content' + '[rel="' + channelId + '"]').scrollTop($('#' + userId + '-content' + '[rel="' + channelId + '"]')[0].scrollHeight); //scroll to down
        let profile = userProfiles[userId];
        // console.log("targetId = " + userId);
        if (profile.hasOwnProperty("nickname")) $('#prof-nick').text(profile.nickname); //如果是一般的聊天
        else $('#prof-nick').text(profile.roomName); //如果是內部聊天
    } // end of clickUserTablink
    function detecetScrollTop(ele) {
        if (ele.scrollTop() === 0) {
            let tail = parseInt(ele.attr('data-position'));
            let head = parseInt(ele.attr('data-position')) - 20;
            if (head < 0) head = 0;
            let request = {
                userId: ele.parent().attr('id'),
                channelId: ele.parent().attr('rel'),
                head: head,
                tail: tail
            };
            if (head === 0) ele.off('scroll');
            ele.attr('data-position', head);
            socket.emit('upload history msg from front', request, responseHistoryMsg);
        }
    } // end of detecetScrollTop
    function readClientMsg() {
        let userId = $('.tablinks#selected').attr('name'); // ID
        let channelId = $('.tablinks#selected').attr('rel'); // channelId
        $('.tablinks#selected').find('.unread-msg').text('0').hide();
        socket.emit("read message", {
            channelId: channelId,
            userId: userId
        }); //tell socket that this user isnt unRead
    } //end of readClientMsg
    function submitMsg(e) {
        e.preventDefault();
        let vendorId = auth.currentUser.uid;
        let email = auth.currentUser.email;
        let channelId = $(this).parent().parent().siblings('#canvas').find('[style="display: block;"]').attr('rel'); // 客戶的聊天室ID
        let userId = $(this).parent().parent().siblings('#canvas').find('[style="display: block;"]').attr('id'); // 客戶的user ID
        let msgStr = messageInput.val();
        if (userId !== undefined || channelId !== undefined) {
            if (channelId == "internal") {
                messageInput.val('');
                let sendObj = {
                    agentId: auth.currentUser.uid,
                    time: Date.now(),
                    message: msgStr
                };
                socket.emit('send internal message', {
                    sendObj: sendObj,
                    roomId: userId
                });
            } else {
                var getAppsInfo = new Promise((resolve, reject) => {
                    database.ref('users/' + vendorId).once('value', data => {
                        if (data.val() !== null) {
                            let user = data.val();
                            let str = toAgentStr(msgStr, data.name, Date.now());
                            $("#" + userId + "-content" + "[rel='" + channelId + "']").append(str); //push message into right canvas
                            $('#' + userId + '-content' + "[rel='" + channelId + "']").scrollTop($('#' + userId + '-content' + '[rel="' + channelId + '"]')[0].scrollHeight); //scroll to down
                            messageInput.val('');
                            resolve();
                        } else {
                            reject('vendor not found!')
                        }
                    });
                });

                getAppsInfo
                    .then(() => {
                        return new Promise((resolve, reject) => {
                            database.ref('apps').once('value', data => {
                                if (data.val() === null) {
                                    reject('data is empty');
                                } else {
                                    let appsInfo = data.val();
                                    resolve(appsInfo);
                                }
                            });
                        });
                    })
                    .then(data => {
                        return new Promise((resolve, reject) => {
                            database.ref('users/' + vendorId + '/app_ids').once('value', userApps => {
                                let sendObj = {};
                                if (userApps.val() === null) {
                                    reject('vendor does not have apps setup');
                                } else {
                                    let hashId = userApps.val();
                                    if (data[hashId[0]].id1 === channelId) {
                                        sendObj.id = userId;
                                        sendObj.msg = msgStr;
                                        sendObj.msgtime = Date.now();
                                        sendObj.channelId = data[hashId[0]].id1;
                                        sendObj.channelSecret = data[hashId[0]].secret;
                                        sendObj.channelToken = data[hashId[0]].token1;
                                        resolve(sendObj);
                                    } else if (data[hashId[1]].id1 === channelId) {
                                        sendObj.id = userId;
                                        sendObj.msg = msgStr;
                                        sendObj.msgtime = Date.now();
                                        sendObj.channelId = data[hashId[0]].id1;
                                        sendObj.channelSecret = data[hashId[0]].secret;
                                        sendObj.channelToken = data[hashId[0]].token1;
                                        resolve(sendObj);
                                    } else if (data[hashId[2]].id2 === channelId) {
                                        sendObj.id = userId;
                                        sendObj.msg = msgStr;
                                        sendObj.msgtime = Date.now();
                                        sendObj.pageId = data[hashId[0]].id1;
                                        sendObj.appId = data[hashId[0]].id2;
                                        sendObj.appSecret = data[hashId[0]].secret;
                                        sendObj.clientToken = data[hashId[0]].token1;
                                        sendObj.pageToken = data[hashId[0]].token2;
                                        resolve(sendObj);
                                    }
                                }
                            });
                        })
                    })
                    .then(data => {
                        return new Promise((resolve, reject) => {
                            console.log(data);
                            socket.emit('send message', data);
                            resolve(data);
                        });
                    })
                    .then(data => {
                        return new Promise((resolve, reject) => {
                            // 新增功能：把最後送出訊息的客服人員的編號放在客戶的Profile裡面
                            database.ref('chats/Data').once('value', outsnap => {
                                let outInfo = outsnap.val();
                                let outId = Object.keys(outInfo);
                                for (let i in outId) {
                                    database.ref('chats/Data/' + outId[i] + '/Profile').once('value', innsnap => {
                                        let innInfo = innsnap.val();
                                        if (innInfo.channelId === undefined) {
                                            reject('no such record under chats/Data');
                                        } else if (innInfo.channelId === channelId && innInfo.userId === userId) {
                                            database.ref('chats/Data/' + outId[i] + '/Profile').update({
                                                "lastTalkedTo": email
                                            });
                                            resolve();
                                        }
                                    });
                                }
                            });
                        });
                    })
                    .then(() => {
                        console.log('sent')
                    })
                    .catch(reason => {
                        console.log(reason);
                    });
            }
        } else {
            console.log('either room id or channel id is undefined');
        }
    } // end of submitMsg
    function triggerFileUpload(e) {
        var eId = $(this).data('id');
        $('#' + eId).trigger('click');
    }

    function fileUpload() {
        var $contentPanel = $(this).parent().parent().parent().parent();
        var $chat = $contentPanel.find('#canvas').find('div[style="display: block;"]');
        var id = $chat.attr('id');
        var rel = $chat.attr('rel');
        if (0 < this.files.length) {
            var file = this.files[0];
            var self = this;
            var storageRef = firebase.storage().ref();
            var fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function (snapshot) {
                let url = snapshot.downloadURL;
                var type = $(self).data('type');
                var data = {
                    msg: '/' + type + ' ' + url,
                    id: id,
                    room: rel,
                    channelId: rel,
                }
                // var data = { // 需要的格式 以後收到的訊息
                //     channelId: '',
                //     channelSecret: '',
                //     channelToken: '',
                //     id: id,
                //     msg: '/' + type + ' ' + url,
                //     msgtime: Date.now()
                // }
                socket.emit('send message', data);
            });
        }
    }

    function displayMessage(data, channelId) {
        if (name_list.indexOf(channelId + data.id) !== -1) { //if its chated user
            let str;
            let designated_chat_room_msg_time = $("#" + data.id + "-content" + "[rel='" + channelId + "']").find(".message:last").attr('rel');
            if (data.time - designated_chat_room_msg_time >= 900000) { // 如果現在時間多上一筆聊天記錄15分鐘
                $("#" + data.id + "-content" + "[rel='" + channelId + "']").append('<p class="message-day"><strong>-新訊息-</strong></p>');
            }
            if (data.owner === "agent") str = toAgentStr(data.message, data.name, data.time);
            else str = toUserStr(data.message, data.name, data.time);
            $("#" + data.id + "-content" + "[rel='" + channelId + "']").append(str); //push message into right canvas
            $('#' + data.id + '-content' + "[rel='" + channelId + "']").scrollTop($('#' + data.id + '-content' + '[rel="' + channelId + '"]')[0].scrollHeight); //scroll to down
        } else { //if its new user
            console.log('new user')
            let historyMsgStr = NO_HISTORY_MSG;
            if (data.owner === "agent") historyMsgStr += toAgentStr(data.message, data.name, data.time);
            else historyMsgStr += toUserStr(data.message, data.name, data.time);
            canvas.append( //new a canvas
                '<div id="' + data.id + '" rel="' + channelId + '" class="tabcontent">' + '<div id="' + data.id + '-content" rel="' + channelId + '" class="messagePanel">' + historyMsgStr + '</div></div>'
            ); // close append
            $('#user-rooms').append('<option value="' + data.id + '">' + data.name + '</option>'); //new a option in select bar
        }
    } // end of displayMessage

    function displayClient(data, channelId) {
        if (name_list.indexOf(channelId + data.id) == -1) {
            console.log(data);
            let tablinkHtml = "<b><button class='tablinks'" + "name='" + data.id + "' rel='" + channelId + "'><div class='img-holder'>" + "<img src='" + data.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + data.name + '</span><br><div id="msg"></div></div>';
            $('.tablinks-area #new-user-list').prepend(tablinkHtml);
        }
        let target = $('.tablinks-area').find(".tablinks[name='" + data.id + "'][rel='" + channelId + "']");
        let currentUnread = parseInt(target.find('.unread-msg').text());
        if (data.message.startsWith('<a')) { // 判斷客戶傳送的是檔案，貼圖還是文字
            target.find("#msg").html(toTimeStr(data.time) + '檔案');
        } else if (data.message.startsWith('<img')) {
            target.find("#msg").html(toTimeStr(data.time) + '貼圖');
        } else {
            target.find("#msg").html(toTimeStr(data.time) + loadMessageInDisplayClient(data.message));
        }
        target.attr("data-recentTime", data.time);
        // update tablnks's last msg
        if (data.owner === "agent") {
            target.find('.unread-msg').text("0").css("display", "none");
        } else if ((data.unRead + currentUnread) > 99) {
            target.find('.unread-msg').text("99+").css("display", "block");
        } else {
            target.find('.unread-msg').html(data.unRead + currentUnread).css("display", "block"); // 未讀訊息數顯示出來
        }
        let ele = target.parents('b'); //buttons to b
        ele.remove();
        $('.tablinks-area>#clients').prepend(ele);
    } // end of displayClient
    //=====end chat function=====

    //=====start profile function=====
    function showProfile() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $("#infoCanvas #profile").show();
        $("#infoCanvas #todo").hide();
    }

    function userInfoClick() {
        let val = $(this).text(); //抓目前的DATA
        let td = $(this).parents('.userinfo-td');
        td.html('<input id="td-inner" type="text" value="' + val + '"></input>'); //把element改成input，放目前的DATA進去
        td.find('input').select(); //自動FOCUS該INPUT
    }

    function userInfoKeyPress(e) {
        let code = (e.keyCode ? e.keyCode : e.which);
        if (code === 13) {
            $(this).blur(); //如果按了ENTER就離開此INPUT，觸發on blur事件
        }
    }

    function userInfoBlur() {
        let val = $(this).val(); //抓INPUT裡的資料
        if (!val) val = "尚未輸入";
        $(this).parent().html('<p id="td-inner">' + val + '</p>'); //將INPUT元素刪掉，把資料直接放上去
    }

    function userInfoConfirm() {
        let userId = $(this).parents('.card-group').attr('id');
        userId = userId.substr(0, userId.length - 5);
        let channelId = $(this).parents('.card-group').attr('rel');
        channelId = channelId.substr(0, channelId.length - 5);
        let method = $(this).attr('id');
        if (method === "confirm") {
            if (confirm("Are you sure to change profile?")) {
                $('#infoCanvas').scrollTop(0);
                let data = {
                    userId: userId,
                    channelId: channelId
                };
                let tds = $(this).parents('.card-group').find('.panel-table tbody td');
                tds.each(function () {
                    let prop = $(this).attr('id');
                    let type = $(this).attr('type');
                    let value;
                    if (type === "text") value = $(this).find('#td-inner').text();
                    else if (type === "time") value = $(this).find('#td-inner').val();
                    else if (type === "single-select") value = $(this).find('#td-inner').val();
                    else if (type === "multi-select") value = $(this).find('.multi-select-text').attr('rel');
                    if (!value) value = "";
                    data[prop] = value;
                });
                socket.emit('update profile', data);
            } else {}
        } else {
            console.log("cancelled");
        }
    }
    //=====end profile function=====

    //=====start ticket function=====
    function showTodo() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $("#infoCanvas #profile").hide();
        $("#infoCanvas #todo").show();
    }

    function loadTable(userId) {
        $('.ticket-content').empty();
        var ticket_memo_list = [];
        $('.ticket-memo').empty();
        $.ajax({
            url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets?include=requester",
            type: 'GET',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Basic " + btoa(api_key + ":x")
            },
            success: function (data, textStatus, jqXHR) {
                for (let i = 0; i < data.length; i++) {
                    if (data[i].subject === userId) {
                        ticketInfo = data;
                        $('.ticket-content').prepend('<tr id="' + i + '" class="ticketContent" data-toggle="modal" data-target="#ticket-info-modal">' + '<td class="data_id" rel="' + data[i].id + '" style="border-left: 5px solid ' + priorityColor(data[i].priority) + '" hidden></td>' + '<td class="status">' + statusNumberToText(data[i].status) + '</td>' + '</td>' + '<td>' + displayDate(data[i].due_by) + '</td>' + '<td>' + data[i].description + '</td><td></td>' + '</tr>');
                        ticket_memo_list.push(String(data[i].id));
                    }
                }
            },
            error: function (jqXHR, tranStatus) {
                console.log('error');
            }
        });
    } // end of loadTable
    function moreInfo() {
        let userId = auth.currentUser.uid;
        let display;
        let i = $(this).attr('id');
        let idNum = $('#' + i + ' .data_id').attr('rel');
        // console.log('tickets/' + userId + '/t' + idNum)
        // console.log(idNum);
        let Tinfo = ticketInfo[i];
        let Ainfo = [];
        socket.emit('get agents profile', loadAgentsInfo);

        function loadAgentsInfo(data) {
            database.ref('tickets/' + userId + '/t' + idNum).once('value', snapshot => {
                if (snapshot.val() !== null) {
                    let value = snapshot.val();
                    console.log(value);
                    $('option[value="' + value.owner + '"]').attr('selected', 'selected');
                }
            });
            agentInfo = data;
            agentKey = Object.keys(agentInfo);

            agentKey.map(agent => {
                Ainfo.push({
                    name: agentInfo[agent].name,
                    id: agent
                })
            });
            console.log(Tinfo)
            $("#ID-num").text(Tinfo.id);
            $("#ID-num").css("background-color", priorityColor(Tinfo.priority));
            display = '<tr>' + '<th>客戶ID</th>' + '<td class="edit">' + Tinfo.subject + '</td>' + '</tr><tr>' + '<th>負責人</th>' + '<td>' + showSelect('responder', Ainfo) + '</td>' + '</tr><tr>' + '<th>優先</th>' + '<td>' + showSelect('priority', Tinfo.priority) + '</td>' + '</tr><tr>' + '<th>狀態</th>' + '<td>' + showSelect('status', Tinfo.status) + '</td>' + '</tr><tr>' + '<th>描述</th>' + '<td class="edit">' + Tinfo.description_text + '</td>' + '</tr><tr>' + '<th class="time-edit">到期時間' + dueDate(Tinfo.due_by) + '</th>' + '<td>' + '<input class="display-date-input form-control" type="datetime-local" value="' + displayDateInput(Tinfo.due_by) + '">' + '</td>' + '</tr><tr>' + '<th>建立日</th>' + '<td>' + displayDate(Tinfo.created_at) + '</td>' + '</tr><tr>' + '<th>最後更新</th>' + '<td>' + displayDate(Tinfo.updated_at) + '</td>' + '</tr>';

            $(".info_input_table").empty();
            $(".modal-header").css("border-bottom", "3px solid " + priorityColor(Tinfo.priority));
            $(".modal-title").text(Tinfo.requester.name);
            $(".info_input_table").append(display);
        }
    } // end of moreInfo
    function showInput() {
        let prop = $(this).parent().children("th").text();
        let original = $(this).text();
        if (prop.indexOf('due date') != -1) {
            let day = new Date(original);
            day = Date.parse(day) + 8 * 60 * 60 * 1000;
            day = new Date(day);
            $(this).html("<input type='datetime-local' class='inner' value='" + day.toJSON().substring(0, 23) + "'></input>");
        } else if (prop === 'description') {
            $(this).html("<textarea  class='inner' rows=4' cols='50'>" + original + "</textarea>");
        } else {
            $(this).html("<input type='text' class='inner' value='" + original + "' autofocus>");
        }
    } // end of showInput
    function sortCloseTable(n) {
        var table, rows, switching, i, x, y,
            shouldSwitch, dir, switchcount = 0;
        table = $(".ticket-content");
        switching = true;
        //Set the sorting direction to ascending:
        dir = "asc";
        /*Make a loop that will continue until
        no switching has been done:*/
        while (switching) {
            //start by saying: no switching is done:
            switching = false;
            rows = table.find('tr');
            /*Loop through all table rows (except the
            first, which contains table headers):*/
            for (i = 0; i < (rows.length - 1); i++) {
                //start by saying there should be no switching:
                shouldSwitch = false;
                /*Get the two elements you want to compare,
                one from current row and one from the next:*/
                x = rows[i].childNodes[n];
                y = rows[i + 1].childNodes[n];
                /*check if the two rows should switch place,
                based on the direction, asc or desc:*/
                if (dir === "asc") {
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        //if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                } else if (dir === "desc") {
                    if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        //if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            if (shouldSwitch) {
                /*If a switch has been marked, make the switch
                and mark that a switch has been done:*/
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                //Each time a switch is done, increase this count by 1:
                switchcount++;
            } else {
                /*If no switching has been done AND the direction is "asc",
                set the direction to "desc" and run the while loop again.*/
                if (switchcount === 0 && dir === "asc") {
                    dir = "desc";
                    switching = true;
                }
            }
        }
    } // end of sortCloseTable
    function hideInput() {
        let change = $(this).val();
        if ($(this).attr('type') === 'datetime-local') {
            $(this).parent().html(displayDate(change));
        }
        $(this).parent().html(change);
    } // end of hideInput
    function ticketSearch(e) {
        let searchStr = $(this).val();
        let trs = $(this).parents('table').find('tbody').find('tr');
        trs.each(function () {
            let text = $(this).text();
            if (text.indexOf(searchStr) === -1) $(this).hide();
            else $(this).show();
        });
    }

    function openTicketModal() {
        let getId = $('.card-group[style="display: block;"]').attr('id');
        let realId = getId.substr(0, getId.indexOf('-'));
        let clientName = $('#selected .clientName').text();
        $('#form-uid').val(realId);
        $('#form-name').val(clientName);

        let agentList;
        let Ainfo = [];
        socket.emit('get agents profile', loadAgentsInfo);

        function loadAgentsInfo(data) {
            // console.log(data); // 所有agent的名單物件
            agentInfo = data;
            agentKey = Object.keys(agentInfo);
            agentKey.map(agent => {
                Ainfo.push({
                    name: agentInfo[agent].name,
                    id: agent
                })
            });
            Ainfo.map(agent => {
                agentList += "<option value=" + agent.id + ">" + agent.name + "</option>";
            });
            $('#add-form-agents').append(agentList);
        }
    }

    function loadAgentList() {
        let Ainfo = [];
        socket.emit('get agents profile', loadAgentsInfo)

        function loadAgentsInfo(data) {
            // console.log(data);
            let agentInfo = data;
            let agentKey = Object.keys(agentInfo);
            let optionStr;
            agentKey.map(agent => {
                Ainfo.push({
                    name: agentInfo[agent].name,
                    id: agent
                })
            });
            Ainfo.map(info => {
                optionStr += '<option value="' + info.id + '">' + info.name + '</option>';
            })
            $('#add-form-agents').append(optionStr);
        }
    }

    function addTicket() {
        let name = $('#form-name').val();
        let uid = $('#form-uid').val(); //因為沒有相關可用的string，暫時先儲存在to_emails這個功能下面
        let email = 'xxx@9thflr.com' // 一定要加上這個參數 先放假資料 以後的資料可以新增在這裡
        let phone = '0900000000' // 一定要加上這個參數 先放假資料 以後的資料可以新增在這裡
        let status = $('#form-status option:selected').text();
        let priority = $('#form-priority option:selected').text();
        let ownerAgent = $('#add-form-agents option:selected').val();
        console.log(ownerAgent);
        let description = $('#form-description').val();
        ticket_data = '{ "description": "' + description + '", "name" : "' + name + '",  "subject": "' + uid + '", "email": "' + email + '", "phone": "' + phone + '", "priority": ' + priorityTextToMark(priority) + ', "status": ' + statusTextToMark(status) + '}';
        // console.log(ticket_data);
        // 驗證
        if ($('#form-uid').val().trim() === '') {
            $('#error').append('請輸入客戶ID');
            $('#form-subject').css('border', '1px solid red');
            setTimeout(() => {
                $('#error').empty();
                $('#form-subject').css('border', '1px solid #ccc');
            }, 3000);
        } else if ($('#form-description').val().trim() === '') {
            $('#error').append('請輸入內容');
            $('#form-description').css('border', '1px solid red');
            setTimeout(() => {
                $('#error').empty();
                $('#form-description').css('border', '1px solid #ccc');
            }, 3000);
        } else if ($('#form-name').val().trim() === '') {
            $('#error').append('請輸入客戶姓名');
            $('#form-name').css('border', '1px solid red');
            setTimeout(() => {
                $('#error').empty();
                $('#form-description').css('border', '1px solid #ccc');
            }, 3000);
        } else {
            let nowTime = new Date().getTime();
            let dueDate = nowTime + 86400000 * 3;
            let start = ISODateTimeString(nowTime);
            let end = ISODateTimeString(dueDate)
            let userId = auth.currentUser.uid;
            $.ajax({
                url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets",
                type: 'POST',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Basic " + btoa(api_key + ":x")
                },
                data: ticket_data,
                success: function (data, textStatus, jqXHR) {
                    console.log(data);
                    console.log('tickt created');
                    //把事件儲存到calendar database，到期時間和ticket一樣設定三天
                    database.ref('cal-events/' + userId + '/t' + data.id).set({
                        title: name + ": " + description.substring(0, 10) + "...",
                        start: start,
                        end: end,
                        description: description,
                        allDay: false
                    }).then(() => {
                        database.ref('tickets/' + userId + '/t' + data.id).set({
                            owner: ownerAgent
                        });
                    }).then(() => {
                        $('#form-name').val('');
                        $('#form-uid').val('');
                        $('#form-subject').val('');
                        $('#form-email').val('');
                        $('#form-phone').val('');
                        $('#form-description').val('');
                        addTicketModal.modal('hide');
                    }).then(() => {
                        location = '/chat';
                    });
                },
                error: function (jqXHR, tranStatus) {
                    x_request_id = jqXHR.getResponseHeader('X-Request-Id');
                    response_text = jqXHR.responseText;
                    console.log(response_text)
                }
            });
        }
    }

    function deleteTicket() {
        if (confirm("確認刪除表單？")) {
            var ticket_id = $(this).parent().siblings().children().find('#ID-num').text();
            $.ajax({
                url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets/" + ticket_id,
                type: 'DELETE',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Basic " + btoa(api_key + ":x")
                },
                success: function (data, textStatus, jqXHR) {
                    alert("表單已刪除");
                    location.reload();
                },
                error: function (jqXHR, tranStatus) {
                    alert("表單刪除失敗，請重試");
                    console.log(jqXHR)
                }
            });
        }
    }

    function modifyTicket() {
        let userId = auth.currentUser.uid;
        let select = $(".select"),
            editable = $(".edit"),
            input = $("input"),
            timeInput = $('.time-edit');
        let name, value, json = '{';
        let timeInputText = timeInput.text(),
            timeInputValue = timeInput.siblings('td').find('.display-date-input.form-control').val();
        let obj = {};
        let id = $(this).parent().siblings('.modal-header').find('#ID-num').text();
        let clientName, clientId, clientOwner, clientPriority, clientStatus, clientDescription, clientDue;
        input.each(function () {
            $(this).blur();
        });
        for (let i = 0; i < editable.length; i++) {
            name = editable.eq(i).parent().children("th").text().split(" ");
            value = editable.eq(i).parent().children("td").text();
            json += '"' + name[0] + '":"' + value + '",';
        }
        for (let i = 0; i < select.length; i++) {
            name = select.eq(i).parent().parent().children("th").text();
            value = select.eq(i).val();
            if (name === '負責人') json += '"' + name + '":' + wrapQuotes(value) + ','
            else json += '"' + name + '":' + value + ','
        }
        json += '"' + timeInputText + '":"' + timeInputValue + '",';
        // console.log(timeInput.text() + ':' + timeInput.siblings('td').find('.display-date-input.form-control').val())
        json += '"id":"' + id + '"}';
        console.log(json)
        obj = JSON.parse(json);
        clientName = obj.subject;
        clientId = obj.客戶ID;
        clientOwner = obj.負責人;
        // console.log(clientOwner);
        clientPriority = parseInt(obj.優先);
        clientStatus = parseInt(obj.狀態);
        clientDescription = obj.描述;
        if (obj.到期時間過期 !== undefined) clientDue = obj.到期時間過期;
        else clientDue = obj.到期時間即期;
        console.log(clientDue)
        // var time_list = clientDue.split("/");
        // var new_time = [];
        // var new_time2 = [];
        // time_list.map(function(i) {
        //     if (i.length == 1 || i.length > 5 && i.startsWith(0)) i = '0' + i;
        //     new_time.push(i);
        // });
        // new_time = new_time.join("-").split(" ");
        // if (new_time[1].length < 8) {
        //     new_time[1].split(":").map(function(x) {
        //         if (x.length == 1) new_time[1] = new_time[1].replace(x, '0' + x);
        //     });
        // };
        // new_time = new_time.join("T") + "Z";
        clientDue += ':00Z';
        // console.log(new_time)
        obj = '{"name": "' + clientName + '", "subject": "' + clientId + '", "status": ' + clientStatus + ', "priority": ' + clientPriority + ', "description": "' + clientDescription + '", "due_by": "' + clientDue + '"}';
        // console.log(obj);
        if (confirm("確定變更表單？")) {
            var ticket_id = $(this).parent().siblings().children().find('#ID-num').text();
            $.ajax({
                url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets/" + ticket_id,
                type: 'PUT',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Basic " + btoa(api_key + ":x")
                },
                data: obj,
                success: function (data, textStatus, jqXHR) {
                    database.ref('tickets/' + userId + '/t' + id).set({
                            owner: clientOwner
                        })
                        .then(() => {
                            database.ref('cal-events/' + userId + '/t' + id).update({
                                title: clientName + ": " + clientDescription.substring(0, 10) + "...",
                                end: clientDue,
                                description: clientDescription,
                                allDay: false
                            })
                        });
                    alert("表單已更新");
                    location.reload();
                },
                error: function (jqXHR, tranStatus) {
                    alert("表單更新失敗，請重試");
                    console.log(jqXHR.responseText)
                }
            });
        }

        function wrapQuotes(msg) {
            return '"' + msg + '"';
        }
    }

    function priorityColor(priority) {
        switch (priority) {
            case 4:
                return 'rgb(230, 100, 100)';
                break;
            case 3:
                return 'rgb(233, 198, 13)';
                break;
            case 2:
                return 'rgb(113, 180, 209)';
                break;
            case 1:
                return '#33CCFF';
                break;
            default:
                return 'N/A';
        }
    } // end of priorityColor
    function createDate(day) {
        let html = '';
        let nowTime = new Date().getTime();
        let dueday = Date.parse(displayDate(day));
        let sec = (nowTime - dueday) / 1000;
        if (sec < 60) return Math.round(sec) + " second(s)";
        else {
            let min = sec / 60;
            if (min < 60) return Math.round(min) + " minute(s)";
            else {
                let hr = min / 60;
                if (hr < 48) return Math.round(hr) + " hours(s)";
                else {
                    let day = Math.floor(hr / 24);
                    hr %= 24;
                    return day + " day(s) " + Math.round(hr) + " hour(s) ";
                }
            }
        }
    } // end of createDate
    function displayDate(date) {
        let origin = new Date(date);
        origin = origin.getTime();
        let gmt8 = new Date(origin);
        let yy = gmt8.getFullYear(),
            mm = gmt8.getMonth() + 1,
            dd = gmt8.getDate(),
            hr = gmt8.getHours(),
            min = gmt8.getMinutes();
        return yy + "/" + mm + "/" + dd + " " + hr + ":" + min;
    } // end of displayDate
    function displayDateInput(date) {
        let origin = new Date(date);
        origin = origin.getTime();
        let gmt8 = new Date(origin);
        let yy = gmt8.getFullYear(),
            mm = gmt8.getMonth() + 1,
            dd = gmt8.getDate(),
            hr = gmt8.getHours() < 10 ? '0' + gmt8.getHours() : gmt8.getHours(),
            min = gmt8.getMinutes();
        return yy + "-" + mm + "-" + dd + "T" + hr + ":" + min;
    } // end of displayDate
    function dueDate(day) {
        let html = '';
        let nowTime = new Date().getTime();
        let dueday = Date.parse(displayDate(day));
        let hr = dueday - nowTime;
        hr /= 1000 * 60 * 60;
        if (hr < 0) {
            html = '<span class="overdue">過期</span>';
        } else {
            html = '<span class="non overdue">即期</span>';
        }
        return html;
    } // end of dueDate
    function statusNumberToText(status) {
        switch (status) {
            case 5:
                return 'Closed';
                break;
            case 4:
                return 'Resolved';
                break;
            case 3:
                return 'Pending';
                break;
            default:
                return 'Open';
        }
    } // end of statusNumberToText
    function priorityNumberToText(priority) {
        switch (priority) {
            case 4:
                return 'Urgent';
                break;
            case 3:
                return 'High';
                break;
            case 2:
                return 'Medium';
                break;
            default:
                return 'Low';
        }
    } // end of priorityNumberToText
    function responderName(id) {
        console.log(agentInfo);
        for (let i in agentInfo) {
            if (agentInfo[i].id === id) return agentInfo[i].contact.name;
        }
        return "unassigned";
    } // end of responderName
    function showSelect(prop, n) {
        let html = "<select class='select form-control' required>";
        if (prop === 'priority') {
            html += "<option value=" + n + ">" + priorityNumberToText(n) + "</option>";
            for (let i = 1; i < 5; i++) {
                if (i === n) continue;
                html += "<option value=" + i + ">" + priorityNumberToText(i) + "</option>";
            }
        } else if (prop === 'status') {
            html += "<option value=" + n + ">" + statusNumberToText(n) + "</option>";
            for (let i = 2; i < 6; i++) {
                if (i === n) continue;
                html += "<option value=" + i + ">" + statusNumberToText(i) + "</option>";
            }
        } else if (prop === 'responder') {
            html += "<option value='未指派'>請選擇</option>";
            n.map(agent => {
                html += "<option value=" + agent.id + ">" + agent.name + "</option>";
            });
        }
        html += "</select>";
        return html;
    } // end of showSelect
    //=====end ticket function=====

    //=====start internal function=====
    function displayMessageInternal(data, roomId) {
        let str;
        let designated_chat_room_msg_time = $("#" + data.roomId + "-content" + "[rel='internal']").find(".message:last").attr('rel');
        if (data.time - designated_chat_room_msg_time >= 900000) { // 如果現在時間多上一筆聊天記錄15分鐘
            $("#" + data.roomId + "-content" + "[rel='internal']").append('<p class="message-day" style="text-align: center"><strong>-新訊息-</strong></p>');
        }
        if (data.agentId == agentId) str = toAgentStr(data.message, data.agentNick, data.time);
        else str = toUserStr(data.message, data.agentNick, data.time);
        $("#" + data.roomId + "-content" + "[rel='internal']").append(str); //push message into right canvas
        $('#' + data.roomId + '-content' + "[rel='internal']").scrollTop($('#' + data.roomId + '-content' + '[rel="internal"]')[0].scrollHeight); //scroll to down
    } // end of displayMessageInternal
    function displayClientInternal(data, roomId) {
        let target = $('.tablinks-area').find(".tablinks[name='" + data.roomId + "'][rel='internal']");
        if (data.message.startsWith('<a')) { // 判斷客戶傳送的是檔案，貼圖還是文字
            target.find("#msg").html(toTimeStr(data.time) + '檔案'); // 未讀訊息字體變大
        } else if (data.message.startsWith('<img')) {
            target.find("#msg").html(toTimeStr(data.time) + '貼圖'); // 未讀訊息字體變大
        } else {
            target.find("#msg").html(toTimeStr(data.time) + loadMessageInDisplayClient(data.message)); // 未讀訊息字體變大
        }
        target.find('.unread-msg').html(data.unRead).css("display", "block"); // 未讀訊息數顯示出來
        target.attr("data-recentTime", data.time);
        // update tablnks's last msg
        target.find('.unread-msg').html(data.unRead).css("display", "none");
        let ele = target.parents('b'); //buttons to b
        ele.remove();
        $('.tablinks-area>#clients').prepend(ele);
    } // end of displayClientInternal
    function groupPhotoChoose() {
        let container = $(this).parents('.photo-container');
        container.find('.photo-ghost').click();
    }

    function groupPhotoUpload() {
        if (0 < this.files.length) {
            let fileContainer = $(this).parents('.photo-container');
            let img = fileContainer.find('img');

            let file = this.files[0];
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function (snapshot) {
                let url = snapshot.downloadURL;
                img.attr('src', url);
            });
        }
    }

    function internalConfirm() {
        let method = $(this).attr('id');
        if (method === "confirm") {
            if (confirm("Are you sure to change profile?")) {
                let cardGroup = $(this).parents('.card-group');
                let roomId = cardGroup.attr('id');
                roomId = roomId.substr(0, roomId.length - 5);
                let photo = cardGroup.find('.photo-choose');
                let data = {
                    roomId: roomId,
                    photo: photo.attr('src')
                };
                let tds = cardGroup.find('.panel-table tbody td');
                tds.each(function () {
                    let prop = $(this).attr('id');
                    let type = $(this).attr('type');
                    let value;
                    if (type === "text") value = $(this).find('#td-inner').text();
                    else if (type === "time") value = $(this).find('#td-inner').val();
                    else if (type === "single-select") value = $(this).find('#td-inner').val();
                    else if (type === "multi-select") value = $(this).find('.multi-select-text').attr('rel');
                    if (!value) value = "";
                    data[prop] = value;
                    console.log(data);
                });
                socket.emit('update internal profile', data);
            }
        } else {
            console.log("cancelled");
        }
    }
    //=====end internal function

    //=====start searchBox change func=====
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    searchBox.on('keypress', function (e) {
        let count = 0;
        $tablinks = [];
        $panels = [];
        $clientNameOrTexts = [];
        let code = (e.keyCode ? e.keyCode : e.which);
        if (code != 13) return;
        let searchStr = $(this).val().toLowerCase();
        if (searchStr === "") {
            $('#search-right').addClass('invisible');
            displayAll();
            $('.tablinks').each(function () {
                let id = $(this).attr('name');
                let room = $(this).attr('rel');
                let panel = $("div #" + id + "-content[rel='" + room + "']");
                panel.find(".message").each(function () {
                    $(this).find('.content').removeClass('found');
                });
            });
        } else {

            $('.tablinks').each(function () {
                $self = $(this);
                let id = $(this).attr('name');
                let room = $(this).attr('rel');
                let panel = $("div #" + id + "-content[rel='" + room + "']");
                let color = "";
                let display = false;

                // 客戶名單搜尋
                $(this).find('.clientName').each(function () {
                    let text = $(this).text();
                    if (text.toLowerCase().indexOf(searchStr) != -1) {
                        if (0 === count) {
                            $self.trigger('click');
                        }
                        $tablinks.push($self);
                        $panels.push(null);
                        $clientNameOrTexts.push(null);
                        count += 1;
                        $(this).find('.content').addClass('found');
                        display = true;
                    } else {
                        $(this).find('.content').removeClass('found');

                    }
                });
                // 聊天室搜尋
                panel.find(".message").each(function () {
                    let text = $(this).find('.content').text();
                    var $content = $(this).find('.content');
                    if (text.toLowerCase().indexOf(searchStr) != -1) {
                        // displayMessage match的字標黃
                        if (0 === count) {
                            $self.trigger('click');
                            var top = $(this).offset().top;
                            panel.scrollTop(top + SCROLL.HEIGHT);
                        }
                        $tablinks.push($self);
                        $panels.push(panel);
                        $clientNameOrTexts.push($(this));
                        count += 1;
                        $(this).find('.content').addClass('found');
                        // displayClient顯示"找到訊息"並標紅
                        display = true;

                        $('[name="' + id + '"][rel="' + room + '"]').find('#msg').css('color', COLOR.FIND).text("找到訊息");
                    } else {
                        $(this).find('.content').removeClass('found');

                    }
                });

                if (1 <= count) {
                    $('#this-number').html(1);
                    $('#total-number').html(count);
                    $('#search-right').removeClass('invisible');
                    $(this).css('color', color);
                }


                if (display === false) {
                    $(this).css('display', 'none');
                } else {
                    $(this).css('display', 'block');
                }

            });
        }
    });
    $('div.search .glyphicon-chevron-up').on('click', (e) => {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) <= 1) {
            i = total;
        } else {
            i -= 　1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');
        if (null !== $clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var top = $clientNameOrText.offset().top;
            $panel.scrollTop(top + SCROLL.HEIGHT);
        }
        $('#this-number').html(Number(i));
    });
    $('div.search .glyphicon-chevron-down').on('click', (e) => {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) >= total) {
            i = 1;
        } else {
            i += 　1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');
        if (null !== $clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var top = $clientNameOrText.offset().top;
            $panel.scrollTop(top + SCROLL.HEIGHT);
        }
        $('#this-number').html(Number(i));

    });

    function displayAll() {
        $('.tablinks').each(function () {
            let id = $(this).attr('name');
            let rel = $(this).attr('rel');
            $(this).find('#msg').text($("div #" + id + "-content" + "[rel='" + rel + "']" + " .message:last").find('.content').text().trim()).css('color', 'black');
            $("div #" + id + "-content" + "[rel='" + rel + "']" + " .message").find('.content').css({
                "color": "black",
                "background-color": "lightgrey"
            });
            $(this).find('.clientName').css({
                "color": "black",
                "background-color": ""
            });
        });
    } // end of displayAll
    function sortUsers(ref, up_or_down, operate) {
        let arr = $('#clients b');
        for (let i = 0; i < arr.length - 1; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                let a = arr.eq(i).children(".tablinks").attr("data-" + ref) - '0';
                let b = arr.eq(j).children(".tablinks").attr("data-" + ref) - '0';
                if (up_or_down === operate(a, b)) {
                    let tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
        $('#clients').append(arr);
    } //end of sortUsers
    //=====end searchBox change func=====

    //=====start utility function
    function toAgentStr(msg, name, time) {
        if (msg.startsWith("<a") || msg.startsWith("<img") || msg.startsWith("<audio") || msg.startsWith("<video")) {
            return '<p class="message" rel="' + time + '" style="text-align: right;line-height:250%" title="' + name + ' ' + toDateStr(time) + '"><span  class="send-time">' + toTimeStr(time) + '</span><span class="content stikcer">  ' + msg + '</span><strong></strong><br/></p>';
        } else {
            return '<p class="message" rel="' + time + '" style="text-align: right;line-height:250%" title="' + name + ' ' + toDateStr(time) + '"><span  class="send-time">' + toTimeStr(time) + '</span><span class="content words">  ' + msg + '</span><strong></strong><br/></p>';
        }
    } // end of toAgentStr
    function toUserStr(msg, name, time) {
        if (msg.startsWith("<a") || msg.startsWith("<img") || msg.startsWith("<audio") || msg.startsWith("<video")) {
            return '<p style="line-height:250%" class="message" rel="' + time + '" title="' + name + ' ' + toDateStr(time) + '"><strong></strong><span class="content sticker">  ' + msg + '</span><span class="send-time">' + toTimeStr(time) + '</span><br/></p>';
        } else {
            return '<p style="line-height:250%" class="message" rel="' + time + '" title="' + name + ' ' + toDateStr(time) + '"><strong></strong><span class="content words">  ' + msg + '</span><span class="send-time">' + toTimeStr(time) + '</span><br/></p>';
        }
    } // end of toUserStr
    function lastMsgToStr(msg) {
        if (msg.message.startsWith('<a')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送檔案</div>';
        } else if (msg.message.startsWith('<img')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送貼圖</div>';
        } else {
            return '<br><div id="msg">' + toTimeStr(msg.time) + loadMessageInDisplayClient(msg.message) + '</div>';
        }
    }

    function loadMessageInDisplayClient(msg) {
        if (msg.length > 10) {
            return msg = msg.substr(0, 10) + '...';
        } else {
            return msg;
        }
    } // end of loadMessageInDisplayClient
    function toDateStr(input) {
        let str = " ";
        let date = new Date(input);
        str += date.getFullYear() + '/' + addZero(date.getMonth() + 1) + '/' + addZero(date.getDate()) + ' ';
        let week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        str += week[date.getDay()] + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes());
        return str;
    } // end of toDateStr
    function toTimeStr(input) {
        let date = new Date(input);
        return " (" + addZero(date.getHours()) + ':' + addZero(date.getMinutes()) + ") ";
    } // end of toTimeStr
    function toTimeStrMinusQuo(input) {
        let date = new Date(input);
        return addZero(date.getHours()) + ':' + addZero(date.getMinutes());
    } // end of toTimeStrMinusQuo
    function multiSelectChange() {
        let valArr = [];
        let textArr = [];
        let boxes = $(this).find('input');
        boxes.each(function () {
            if ($(this).is(':checked')) {
                valArr.push($(this).val());
                textArr.push($(this).parents('li').text());
            }
        });
        valArr = valArr.join(',');
        if (textArr.length === boxes.length) textArr = "全選";
        else textArr = textArr.join(',');
        $(this).parent().find($('.multi-select-text')).text(textArr).attr('rel', valArr);
    } // end of multiSelectChange
    function addZero(val) {
        return val < 10 ? '0' + val : val;
    } // end of addZero
    function ISODateTimeString(d) {
        d = new Date(d);

        return d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + 'T' + addZero(d.getHours()) + ':' + addZero(d.getMinutes());
    } // end of ISODateTimeString
    function priorityTextToMark(priority) {
        switch (priority) {
            case 'Urgent':
                return 4;
                break;
            case 'High':
                return 3;
                break;
            case 'Medium':
                return 2;
                break;
            default:
                return 1;
        }
    } // end of priorityTextToMark
    function statusTextToMark(status) {
        switch (status) {
            case 'Closed':
                return 5;
                break;
            case 'Resolved':
                return 4;
                break;
            case 'Pending':
                return 3;
                break;
            default:
                return 2;
        }
    } // end of statusTextToMark
    //=====end utility function

}); //document ready close