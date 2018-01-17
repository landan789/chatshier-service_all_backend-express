var domain = location.host;
if ('undefined' === typeof window.urlConfig) {
    console.warn('Please set up the configuration file of /config/url-config.js');
}
$(document).ready(function() {


    var loadSetting = setInterval(() => {
        if (auth.currentUser) {
            clearInterval(loadSetting);
            findAllApps(); // 列出所有設定的APPs
            findUserProfile();
        }
    }, 1000);

    //----------------TAG---------------
    var DEFAULT_INTERNAL_PHOTO = "https://firebasestorage.googleapis.com/v0/b/shield-colman.appspot.com/o/internal-group.png?alt=media&token=4294f99e-42b7-4b2d-8a24-723785ec1a2b";
    var socket = io.connect();
    var tagTable = $('#tagTable');
    var tagTableBody = $('#tagTable-body');
    var addTagBtn = $('.add-tag');
    var allConfirmBtn = $('.all-confirm');
    var allCancelBtn = $('.all-cancel');
    var rowsCount = 0; //dynamic load count in db ref
    tagTableBody.sortable();
    socket.emit('request tags', tagsData => {
        for (let i = 0; i < tagsData.length; i++) {
            appendNewTag(tagsData[i].id);
            let data = tagsData[i].data;
            let source = tagsData[i].source;
            let name = data.name;
            let type = data.type;
            let modify = data.modify;
            let tr = tagTableBody.find(".tag-content:last");
            tr.find(".tag-name").text(name);
            tr.find(".tag-option").val(type);
            tr.find(".tag-modify").text(modify);
            type = toTypeValue(type);
            let set = data.set;
            if (type == 3) set = set.join('\n'); //if type is single-select || multi-select
            tr.find('.tag-set-td').find('#set' + type).val(set).show().siblings().hide();

            tr.addClass(source);
            if (source == "default") {
                tr.find("select").prop("disabled", "disabled");
                tr.find("button").prop("disabled", "disabled");
                tr.find("textarea").prop("disabled", "disabled");
            }
            // tagTableBody.find(".tag-delete:last").html('<button type="button" class="btn btn-default btn-sm" disabled="disabled"><span class="glyphicon glyphicon-remove"></span> 刪除</button>');

        }
    });
    addTagBtn.on('click', function() {
        appendNewTag("" + Date.now());
        tagTableBody.find(".tag-content:last").addClass('custom').find('.tag-name').click();
    });
    $(document).on('click', '.tag-name', function() {
        if ($(this).find('input').length == 0 && $(this).parent().find('.tag-modify').text() == "true") {
            // console.log(".tag-name click");
            let val = $(this).text();
            $(this).html('<input type="text" value="' + val + '"></input>');
            $(this).find('input').select();
        }
    });
    $(document).on('keypress', '.tag-name input', function(e) {
        let code = (e.keyCode ? e.keyCode : e.which);
        if (code == 13) {
            // console.log(".tag-name-input keypress");
            $(this).blur();
        }
    });
    $(document).on('blur', '.tag-name input', function() {
        // console.log(".tag-name-input blur");
        let val = $(this).val();
        $(this).parent().html(val);
    });
    $(document).on('change', '.tag-option', function() {
        let setDOM = $(this).parents('tr').find('.tag-set-td');
        let typeValue = toTypeValue($(this).val());
        setDOM.find('#set' + typeValue).show().siblings().hide();
    });
    $(document).on('click', '.tag-move #moveup', function() {
        let tomove = $(this).parent().parent();
        tomove.prev().before(tomove);
    });
    $(document).on('click', '.tag-move #movedown', function() {
        let tomove = $(this).parent().parent();
        tomove.next().after(tomove);
    });
    $(document).on('click', '.tag-delete-btn', function() {
        $(this).parent().parent().remove();
    });

    function toTypeValue(type) {
        if (type == "text") return 0;
        // else if( type=="date" ) return 1;
        else if (type == "time") return 2;
        else if (type == "single-select") return 3;
        else if (type == "multi-select") return 3;
        else console.log("ERROR 1");
    }


    function appendNewTag(id) {
        tagTableBody.append('<tr class="tag-content" id="' + id + '">' + '<td class="tag-name  long-token"></td>' +
            '<td>' + '<select class="tag-option form-control">' + '<option value="text">文字數字</option>' + '<option value="time">時間</option>' + '<option value="single-select">單選</option>' + '<option value="multi-select">多選</option>' + '</select>' + '</td>' +
            '<td class="tag-set-td">' + '<select class="tag-set form-control" id="set0">' + '<option value="single">單行文字數字</option>' + '<option value="multi">段落</option>' + '</select>' + '<p class="tag-set" id="set2" style="display: none;">無設定</p>' +
            '<textarea class= "tag-set form-control" id="set3" rows="3" columns = "10" style="resize: vertical; display: none;">' + '</textarea>' + '</td>' +
            '<td class="tag-delete"><button type="button" class="btn btn-default btn-sm btn-danger tag-delete-btn"><span class="glyphicon glyphicon-remove"></span> 刪除</button></td>' + '<td class="tag-modify">true</td>' + '<td> <span class="glyphicon glyphicon-menu-hamburger" style="color:#C0C0C0;"></span> </td>' + '</tr>');
    }
    allConfirmBtn.on('click', function() {
        if (!confirm("Confirm???")) return;
        let sendObj = [];
        tagTableBody.find('tr').each(function() {
            let id = $(this).attr('id');
            let source = $(this).hasClass('custom') ? 'custom' : 'default';
            let name = $(this).find('.tag-name').text();
            let type = $(this).find('.tag-option').val();
            let modify = $(this).find('.tag-modify').text() == "true";
            let set = $(this).find('.tag-set-td').find('#set' + toTypeValue(type)).val();
            if (type.indexOf('select') != -1) { //seperate options
                set = set.split('\n');
            }
            let data = {
                name: name,
                type: type,
                set: set,
                modify: modify
            };
            sendObj.push({
                "id": id ? id : Date.now(),
                "source": source,
                "data": data
            });
        });
        // console.log(sendObj);
        if (!noDuplicate()) alert('標籤名稱不可重複');
        else {
            socket.emit('update tags', sendObj);
            alert('已儲存！');
        }

        function noDuplicate() {
            for (let i = 0; i < sendObj.length; i++)
                for (let j = i + 1; j < sendObj.length; j++) {
                    if (sendObj[i].data.name == sendObj[j].data.name) return false;
                }
            return true;
        }
    });
    //-------------end TAG--------------------
    // 內部聊天室
    socket.emit('get agentIdToName list');
    socket.on('send agentIdToName list', data => {
        // console.log("send!");
        // console.log(data);
        let select = $('#create-internal-owner');
        let ul = $("#create-internal-agents").parent().siblings('ul').empty();
        for (let id in data) {
            ul.append('<li><input type="checkbox" value="' + id + '">' + data[id] + '</li>');
            select.append('<option value="' + id + '">' + data[id] + '</option>');
        }
        select.val('');
    });
    $(document).on('click', '#prof-submit-create-internal-room', profSubmitCreateInternalRoom); //完成編輯-新增內部聊天室
    function multiSelectChange() {
        changeMultiSelectText($(this));
    }

    function changeMultiSelectText(container) {
        let valArr = [];
        let textArr = [];
        let boxes = container.find('input');
        boxes.each(function() {
            if ($(this).is(':checked')) {
                valArr.push($(this).val());
                textArr.push($(this).parents('li').text());
            }
        });
        // console.log(valArr);
        // console.log(textArr);
        valArr = valArr.join(',');
        if (textArr.length === boxes.length) textArr = "全選";
        else if (textArr.length == 0) textArr = "未選擇";
        else textArr = textArr.join(',');
        container.parent().find($('.multi-select-text')).text(textArr).attr('rel', valArr);
    } //end of changeMultiSelectText
    function checkInternalAgents() {
        //編輯內部群聊的成員名單時
        //檢查擁有者是否為群組成員
        let $textArea = $('.multi-select-text#create-internal-agents');
        let $owner = $('#create-internal-owner');
        let rel = $textArea.attr('rel');
        let ownerId = $owner.val();
        if (rel.indexOf(ownerId) === -1) {
            $owner.val(''); //若owner沒在名單內，則將owner值變empty
        }
    }

    function checkInternalOwner() {
        //編輯內部群聊的擁有者時
        //檢查擁有者是否為群組成員
        let $multiSelect = $('.multi-select-container[rel="create-internal-agents"]');
        let $owner = $('#create-internal-owner');
        let ownerId = $owner.val();
        let $checkBox = $multiSelect.find('input[type="checkbox"][value="' + ownerId + '"]');
        if (!$checkBox.prop('checked')) {
            $checkBox.prop('checked', true);
            changeMultiSelectText($multiSelect);
        }
    }

    function profSubmitCreateInternalRoom() {
        if (confirm("確認新建內部聊天室?")) {
            let roomName = $('#create-internal-room-name').val();
            let description = $('#create-internal-description').val();
            let photo = $('#create-internal-photo').val();
            let owner = $('#create-internal-owner').val();
            let agent = $('#create-internal-agents').attr('rel');

            if (!roomName) alert('群組名稱不可為空');
            else if (!owner || owner == "0") alert('請指定擁有者'); //如果擁有者為ID=="0"的System，一樣不給過
            else if (!agent) alert('群組成員需至少一位');
            else {
                let data = {
                    "roomName": roomName,
                    "description": description,
                    "photo": photo ? photo : DEFAULT_INTERNAL_PHOTO,
                    "owner": owner,
                    "agent": agent
                }
                socket.emit('create internal room', data);
                alert('成功!');
                clearCreateInternalRoomInput();
            }
        }
    }
    $('#clear-create-internal-room').on('click', clearCreateInternalRoomInput);

    function clearCreateInternalRoomInput() {
        $('#create-internal-room-name').val('');
        $('#create-internal-description').val('');
        $('#create-internal-photo .file-reset').click();
        $('#create-internal-owner').val('');
        $('#create-internal-agents').attr('rel', '').text('未選擇');
    }

    $(document).on('change', '.file-container input.file-ghost', function() {
        if (0 < this.files.length) {
            let fileContainer = $(this).parents('.file-container');
            let fileText = fileContainer.find('.file-text');
            fileText.text(($(this).val()).split('\\').pop());

            let file = this.files[0];
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                let url = snapshot.downloadURL;
                fileContainer.val(url);
            });
        }
    });
    $(document).on('click', '.file-container button.file-choose', function() {
        let fileContainer = $(this).parents('.file-container');
        let fileGhost = fileContainer.find('.file-ghost');
        fileGhost.click();
    });
    $(document).on('click', '.file-container button.file-reset', function() {
        let fileContainer = $(this).parents('.file-container');
        let fileGhost = fileContainer.find('.file-ghost');
        let fileText = fileContainer.find('.file-text');
        fileGhost.val(null);
        fileContainer.val('');
        fileText.text('');
    });
    // 內部聊天室
    // ACTIONS
    $('#setting-modal').on('hidden.bs.modal', function() {
        clearModalBody();
    });
    $(document).on('click', '#edit', function() {
        let appId = $(this).attr('rel');
        findOneApp(appId); // 點選編輯後根據appId列出指定的APP
    });
    $('#setting-modal-submit-btn').click(function(event) {
        event.preventDefault();
        let type = $(this).parent().parent().find('#type').text();
        // console.log($type);
        // insertNewApp, updateProfile, updateApp
        switch (type) {
            case 'insertNewApp':
                let app = $(this).parent().parent().find('#app-group-select option:selected').val();
                console.log(app);
                insertType(app, (data) => {
                    console.log(data);
                    insertOneApp(data);
                });
                break;
            case 'updateProfile':
                profSubmitBasic();
                break;
            case 'updateApp':
                let appId = $(this).parent().parent().find('#webhook-id').text();
                // console.log($('#facebook-name').val())
                if ($('#facebook-name').val() === undefined) {
                    let name = $('#cname').val();
                    let id1 = $('#channel-id').val();
                    let secret = $('#channel-secret').val();
                    let token1 = $('#channel-token').val();
                    let type = 'line';
                    let updateObj = {
                        name,
                        id1,
                        secret,
                        token1,
                        type
                    }
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                } else {
                    let name = $('#facebook-name').val();
                    let id1 = $('#facebook-page-id').val();
                    let id2 = $('#facebook-app-id').val();
                    let secret = $('#facebook-app-secret').val();
                    let token1 = $('#facebook-valid-token').val();
                    let token2 = $('#facebook-page-token').val();
                    let type = 'facebook';
                    let updateObj = {
                        name,
                        id1,
                        id2,
                        secret,
                        token1,
                        token2,
                        type
                    }
                    updateOneApp(appId, updateObj); // 點送出後更新APP的資訊
                }
                break;
        }
    });
    $(document).on('click', '#del', function() {
        let autoreplyId = $(this).attr('rel');
        let confirmDelete = confirm('確定刪除?');
        // console.log(autoreplyId);
        if (confirmDelete) {
            removeOneApp(autoreplyId);
        }
    });
    $('#add-new-btn').click(function() {
        let formStr =
            '<form>' +
            '<div id="type" hidden>insertNewApp</div>' +
            '<br/>' +
            '<label class="col-2 col-form-label">新增群組: </label>' +
            '<select id="app-group-select" class="form-control">' +
            '<option value="line" selected>LINE</option>' +
            '<option value="facebook">臉書</option>' +
            '</select>' +
            '<br/>' +
            '<div id="line-form">' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">名稱: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="cname"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-id"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Secret: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-secret"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Token: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="channel-token"/>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div id="facebook-form" hidden>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Facebook粉絲頁名稱: </label>' +
            ' <div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-name">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Page ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-page-id">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">App ID: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-app-id">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">App Secret: </label>' +
            ' <div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-app-secret">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Validation Token:: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-valid-token">' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">Page Token: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="" id="facebook-page-token">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</form>';
        $('.modal-body').append(formStr);
    });
    $(document).on('change', '#app-group-select', function() { // 切換模式 LINE或是臉書
        // console.log($(this).find('option:selected').val());
        let type = $(this).find('option:selected').val();
        switch (type) {
            case 'line':
                $('#line-form').hide();
                $('#facebook-form').hide();
                $('#line-form').show();
                break;
            case 'facebook':
                $('#line-form').hide();
                $('#facebook-form').hide();
                $('#facebook-form').show();
                break;
        }
    });
    $('#profile').click(function() {
        let company = $('#prof-company').text();
        let phone = $('#prof-phonenumber').text();
        let location = $('#prof-address').text();
        let str =
            '<div id="line-form">' +
            '<div id="type" hidden>updateProfile</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">公司名稱: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + company + '" id="company"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">手機: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + phone + '" id="phone"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="col-2 col-form-label">地區: </label>' +
            '<div class="col-4">' +
            '<input class="form-control" type="tel" value="' + location + '" id="location"/>' +
            '</div>' +
            '</div>' +
            '</div>';
        $('.modal-body').append(str);
    });
});

function findAllApps() {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps/users/' + id,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            if (data !== null && data !== undefined) {
                let appIds = data.data;
                let appKeyArr = Object.keys(appIds);
                for (let i in appIds) {
                    if (appIds[i].delete !== 1) {
                        $('#prof-id').append(appIds[i].user_id);
                        // groupType(appKeyArr[i],appIds[i]);
                        groupType(i, appIds[i]);
                    }
                }
                $('#add-new-btn').attr('disabled', false);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function findOneApp(appId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            if (data !== null && data !== undefined) {
                let appInfo = data.data;
                formModalBody(appId, appInfo[appId]);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function insertType(type, callback) {
    switch (type) {
        case 'line':
            let lineName = $('#cname').val();
            let lineId = $('#channel-id').val();
            let lineSecret = $('#channel-secret').val();
            let lineToken = $('#channel-token').val();
            let lineObj = {
                cname: lineName,
                id1: lineId,
                secret: lineSecret,
                token1: lineToken,
                type: type
            }
            callback(lineObj);
            break;
        case 'facebook':
            let fbName = $('#facebook-name').val();
            let fbPageId = $('#facebook-page-id').val();
            let fbAppId = $('#facebook-app-id').val();
            let fbSecret = $('#facebook-app-secret').val();
            let fbValidToken = $('#facebook-valid-token').val();
            let fbPageToken = $('#facebook-page-token').val();
            let fbObj = {
                cname: fbName,
                id1: fbPageId,
                id2: fbAppId,
                secret: fbSecret,
                token1: fbValidToken,
                token2: fbPageToken,
                type: type
            }
            callback(fbObj);
            break;
    }
}

function insertOneApp(data) { // 未完成
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'POST',
        url: '/api/apps/users/' + id,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            alert('新增成功!');
            $('#setting-modal').modal('hide');
            clearModalBody();
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function updateOneApp(appId, data) { // 未完成
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            alert('修改成功!');
            $('#setting-modal').modal('hide');
            clearModalBody();
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {}
    });
}

function removeOneApp(appId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/apps/apps/' + appId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: () => {
            let str = '<tr hidden><td>ID: </td><td id="prof-id"></td></tr>';
            alert('成功刪除!');
            $('#app-group').empty();
            $('#app-group').append(str);
            findAllApps();
        },
        error: (error) => {}
    });
}

function groupType(index, item) {
    var baseWebhookUrl = urlConfig.webhookUrl;
    let appStr
    switch (item.type) {
        case 'line':
            appStr =
                '<tr class="active">' +
                '<th class="col-md-3 col-lg-3">LINE</th>' +
                '<th class="col-md-9 col-lg-9">' +
                '<div id="group1" class="line">' +
                '<button class="btn btn-danger pull-right" id="del" rel="' + index + '">刪除</button>' +
                '<button type="button" class="btn btn-default pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil-square-o"></span> 編輯</button>' +
                '</div>' +
                '</th>' +
                '</tr>' +
                '<tr>' +
                '<td>LINE應用程式名稱:</td>' +
                '<td class="long-token" id="prof-name1">' + item.name + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Id 1: </td>' +
                '<td class="long-token" id="prof-channelId_1">' + item.id1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Secret 1: </td>' +
                '<td class="long-token" id="prof-channelSecret_1">' + item.secret + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Channel Access Token 1: </td>' +
                '<td class="long-token" id="prof-channelAccessToken_1">' + item.token1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Webhook URL: </td>' +
                '<td class="long-token">' +
                '<span id="prof-webhookUrl-1">' + createWebhookUrl(baseWebhookUrl, item.webhook_id) + '</span>' +
                '</td>' +
                '</tr>';
            $('#app-group').append(appStr);
            break;
        case 'facebook':
            appStr =
                '<tr class="active">' +
                '<th class="col-md-3 col-lg-3">Facebook</th>' +
                '<th class="col-md-9 col-lg-9">' +
                '<div id="group3" class="fb">' +
                '<button class="btn btn-danger pull-right" id="del" rel="' + index + '">刪除</button>' +
                '<button type="button" class="btn btn-default pull-right" rel="' + index + '" id="edit" data-toggle="modal" data-target="#setting-modal"><span class="fa fa-pencil-square-o"></span> 編輯</button>' +
                '</div>' +
                '</th>' +
                '</tr>' +
                '<tr>' +
                '<td>Facebook應用程式名稱:</td>' +
                '<td class="long-token" id="prof-fbPageName">' + item.name + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Page Id: </td>' +
                '<td class="long-token" id="prof-fbPageId">' + item.id1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>App Id: </td>' +
                '<td class="long-token" id="prof-fbAppId">' + item.id2 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>App Secret: </td>' +
                '<td class="long-token" id="prof-fbAppSecret">' + item.secret + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Validation Token: </td>' +
                '<td class="long-token" id="prof-fbValidToken">' + item.token1 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Page Token: </td>' +
                '<td class="long-token" id="prof-fbPageToken">' + item.token2 + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Webhook URL: </td>' +
                '<td class="long-token">' +
                '<span id="prof-fbwebhookUrl">' + createWebhookUrl(baseWebhookUrl, item.webhook_id) + '</span>' +
                '</td>' +
                '</tr>';
            $('#app-group').append(appStr);
            break;
    }
}

function formModalBody(id, item) {
    let appStr
    switch (item.type) {
        case 'line':
            appStr =
                '<form>' +
                '<div id="type" hidden>updateApp</div>' +
                '<div class="form-group" hidden>' +
                '<label for="edit-id" class="col-2 col-form-label">ID</label>' +
                '<span id="webhook-id">' + id + '</span>' +
                '</div>' +
                '<div id="prof-edit-line-1">' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Channel Name 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.name + '" id="cname"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelId_1" class="col-2 col-form-label">Channel Id 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id1 + '" id="channel-id"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelSecret_1" class="col-2 col-form-label">Channel Secret 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.secret + '" id="channel-secret"/>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="prof-edit-channelAccessToken_1" class="col-2 col-form-label">Channel Access Token 1: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token1 + '" id="channel-token"/>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</form>';
            $('.modal-body').append(appStr);
            break;
        case 'facebook':
            appStr =
                '<form>' +
                '<div id="type" hidden>updateApp</div>' +
                '<div class="form-group" hidden>' +
                '<label class="col-2 col-form-label">ID</label>' +
                '<span id="webhook-id">' + id + '</span>' +
                '</div>' +
                '<div id="prof-edit-fb">' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Facebook Page Name: </label>' +
                ' <div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.name + '" id="facebook-name">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Page Id: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id1 + '" id="facebook-page-id">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">App ID: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.id2 + '" id="facebook-app-id">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">App Secret: </label>' +
                ' <div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.secret + '" id="facebook-app-secret">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Validation Token:: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token1 + '" id="facebook-valid-token">' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label class="col-2 col-form-label">Page Token: </label>' +
                '<div class="col-4">' +
                '<input class="form-control" type="tel" value="' + item.token2 + '" id="facebook-page-token">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</form>';
            $('.modal-body').append(appStr);
            break;
    }
}

function clearModalBody() {
    $('.modal-body').empty();
}

function findUserProfile() {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/users/' + id,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let profile = data.data;
            $('#prof-id').text(id);
            $('.panel-title').text(profile.name);
            $('#prof-email').text(profile.email);
            $('#prof-IDnumber').text(id);
            $('#prof-company').text(profile.company);
            $('#prof-phonenumber').text(profile.phonenumber);
            $('#prof-address').text(profile.address);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function updateUserProfile(data) {
    var jwt = localStorage.getItem("jwt");
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/users/' + id,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: () => {
            $('#prof-company').text(data.company);
            $('#prof-phonenumber').text(data.phonenumber);
            $('#prof-address').text(data.address);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function profSubmitBasic() {
    let userId = auth.currentUser.uid;
    let company = $('#company').val();
    let phonenumber = $('#phone').val();
    let address = $('#location').val();
    let obj = {
        company,
        phonenumber,
        address
    }
    phoneRule = /^09\d{8}$/;
    if (!phonenumber.match(phoneRule)) {
        $('#prof-edit-phonenumber').tooltip('show'); //show
        setTimeout(function() {
            $('#prof-edit-phonenumber').tooltip('destroy');
        }, 3000);
    } else {
        updateUserProfile(obj)
        $('#setting-modal').modal('hide');
    }
}

function createWebhookUrl(baseWebhookUrl, webhookId) {
    let webhookUrl;
    baseWebhookUrl = baseWebhookUrl.replace(/^https?\:\/\//, '');
    baseWebhookUrl = baseWebhookUrl.replace(/\/+$/, '');
    webhookUrl = 'https://' + baseWebhookUrl + "/" + webhookId;
    return webhookUrl;
}