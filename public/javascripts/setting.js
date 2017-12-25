$(document).ready(function() {
    $('.panel-title').text('');
    $('#prof-name').text('');
    $('#prof-dob').text('');
    $('#prof-email').text('');
    $('#prof-gender').text('');
    $('#prof-phone').text('');
    $('#prof-name1').text('');
    $('#prof-channelId_1').text('');
    $('#prof-channelSecret_1').text('');
    $('#prof-channelAccessToken_1').text('');
    $('#prof-name2').text('');
    $('#prof-channelId_2').text('');
    $('#prof-channelSecret_2').text('');
    $('#prof-channelAccessToken_2').text('');
    $('[data-toggle="tooltip"]').tooltip('show'); //避免蓋掉"請填寫這個欄位"
    $('[data-toggle="tooltip"]').tooltip('destroy'); //避免蓋掉"請填寫這個欄位"
    setTimeout(loadProf, 1000);
    window.dispatchEvent(firbaseEvent);
    $(document).on('click', '#prof-edit', profEdit); //打開modal
    $(document).on('click', '#prof-submit-profile', profSubmitProfile); //完成編輯-profile
    $(document).on('click', '#prof-submit-basic', profSubmitBasic); //完成編輯-basic
    $(document).on('click', '#prof-submit-create-internal-room', profSubmitCreateInternalRoom); //完成編輯-新增內部聊天室
    $(document).on('change', '.multi-select-container', multiSelectChange); //複選選項改變
    $(document).on('change', '.multi-select-container[rel="create-internal-agents"]', checkInternalAgents); //檢查內部群聊的擁有者是否為群組成員
    $(document).on('change', 'select#create-internal-owner', checkInternalOwner); //檢查內部群聊的擁有者是否為群組成員
    $('#profModal').on('hidden.bs.modal', profClear); //viewModal 收起來
    $(document).on('click', '#signout-btn', logout); //登出
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
        console.log(tagsData);
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
    function loadProf() {
        let userId = auth.currentUser.uid;
        var runProgram = new Promise(function(resolve, reject) {
            resolve();
        });
        runProgram
            .then(function() {
                return new Promise(function(resolve, reject) {
                    getUserDB('users', userId, '', data => {
                        $('#prof-id').text(userId);
                        $('.panel-title').text(data.name);
                        $('#prof-email').text(data.email);
                        $('#prof-IDnumber').text(userId);
                        $('#prof-company').text(data.company);
                        $('#prof-phonenumber').text(data.phonenumber);
                        $('#prof-address').text(data.address);
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise(function(resolve, reject) {
                    sortGroup(userId, data => {
                        resolve(data);
                    });
                });
            })
            .then((appIds) => {
                return new Promise(function(resolve, reject) {
                    if (appIds.length === 0) {
                        console.log('empty')
                        resolve(appIds);
                    } else {
                        getAppDB('apps', appIds[0], data => {
                            $('#prof-name1').text(data.name);
                            $('#prof-channelId_1').text(data.id1);
                            $('#prof-channelSecret_1').text(data.secret);
                            $('#prof-channelAccessToken_1').text(data.token1);
                            resolve(appIds);
                        });
                    }

                });
            })
            .then((appIds) => {
                return new Promise(function(resolve, reject) {
                    if (appIds.length === 0) {
                        console.log('empty')
                        resolve(appIds);
                    } else {
                        getAppDB('apps', appIds[1], data => {
                            $('#prof-name2').text(data.name);
                            $('#prof-channelId_2').text(data.id1);
                            $('#prof-channelSecret_2').text(data.secret);
                            $('#prof-channelAccessToken_2').text(data.token1);
                            resolve(appIds);
                        });
                    }

                });
            })
            .then((appIds) => {
                return new Promise(function(resolve, reject) {
                    if (appIds.length === 0) {
                        console.log('empty')
                        resolve(appIds);
                    } else {
                        getAppDB('apps', appIds[2], data => {
                            $('#prof-fbPageName').text(data.name);
                            $('#prof-fbPageId').text(data.id1);
                            $('#prof-fbAppId').text(data.id2);
                            $('#prof-fbAppSecret').text(data.secret);
                            $('#prof-fbValidToken').text(data.token1);
                            $('#prof-fbPageToken').text(data.token2);
                            resolve();
                        });
                    }
                });
            })
            .then(() => {
                console.log('finished');
            })
            .catch(() => {
                console.log('running error');
            });
    }

    function getUserDB(collection, userId, ref, callback) {
        let info;
        database.ref(collection + '/' + userId + ref).once('value', snap => {
            if (snap.val() !== null) {
                info = snap.val();
                callback(info);
            }
        });
    }

    function getAppDB(collection, ref, callback) {
        let info;
        database.ref(collection + '/' + ref).once('value', data => {
            if (data.val() !== null) {
                info = data.val();
                callback(info);
            }
        });
    }

    function sortGroup(userId, callback) {
        let infoKeys = [];
        database.ref('users/' + userId + '/app_ids').on('value', data => {
            if (data.val() !== null) {
                infoKeys = data.val();
                callback(infoKeys);
            } else {
                callback(infoKeys);
            }
        });
    }

    function profEdit() {
        //移到最上面了
        let id = $('#prof-id').text();
        let name = $('#prof-name').text();
        let dob = $('#prof-dob').text();
        let email = $('#prof-email').text();
        let gender = $('#prof-gender').text();
        let phone = $('#prof-phone').text();
        let name1 = $('#prof-name1').text();
        let chanId_1 = $('#prof-channelId_1').text();
        let chanSecret_1 = $('#prof-channelSecret_1').text();
        let chanAT_1 = $('#prof-channelAccessToken_1').text();
        let name2 = $('#prof-name2').text();
        let chanId_2 = $('#prof-channelId_2').text();
        let chanSecret_2 = $('#prof-channelSecret_2').text();
        let chanAT_2 = $('#prof-channelAccessToken_2').text();
        let fbName = $('#prof-fbPageName').text();
        let fbPageId = $('#prof-fbPageId').text();
        let fbAppId = $('#prof-fbAppId').text();
        let fbAppSecret = $('#prof-fbAppSecret').text();
        let fbValidToken = $('#prof-fbValidToken').text();
        let fbPageToken = $('#prof-fbPageToken').text();
        let IDnumber = $('#prof-IDnumber').text();
        let company = $('#prof-company').text();
        let phonenumber = $('#prof-phonenumber').text();
        let address = $('#prof-address').text();
        //let logo = $('#prof-logo img').attr('src');
        $('#prof-edit-id').val(id);
        $('#prof-edit-name').val(name);
        $('#prof-edit-dob').val(dob);
        $('#prof-edit-email').val(email);
        $('#prof-edit-gender').val(gender);
        $('#prof-edit-phone').val(phone);
        $('#prof-edit-name1').val(name1);
        $('#prof-edit-channelId_1').val(chanId_1);
        $('#prof-edit-channelSecret_1').val(chanSecret_1);
        $('#prof-edit-channelAccessToken_1').val(chanAT_1);
        $('#prof-edit-name2').val(name2);
        $('#prof-edit-channelId_2').val(chanId_2);
        $('#prof-edit-channelSecret_2').val(chanSecret_2);
        $('#prof-edit-channelAccessToken_2').val(chanAT_2);
        $('#prof-edit-fbPageName').val(fbName);
        $('#prof-edit-fbPageId').val(fbPageId);
        $('#prof-edit-fbAppId').val(fbAppId);
        $('#prof-edit-fbAppSecret').val(fbAppSecret);
        $('#prof-edit-fbValidToken').val(fbValidToken);
        $('#prof-edit-fbPageToken').val(fbPageToken);
        $('#prof-edit-IDnumber').val(IDnumber);
        $('#prof-edit-company').val(company);
        $('#prof-edit-phonenumber').val(phonenumber);
        $('#prof-edit-address').val(address);
        if ($(this).parent().attr('class') == "line") {
            if ($(this).parent().attr('id') == "group1") {
                $('#prof-edit-line-1').show();
                $('#prof-edit-line-2').hide();
                $('#prof-edit-fb').hide();
            } else {
                $('#prof-edit-line-1').hide();
                $('#prof-edit-line-2').show();
                $('#prof-edit-fb').hide();
            }
        } else {
            $('#prof-edit-line-1').hide();
            $('#prof-edit-line-2').hide();
            $('#prof-edit-fb').show();
        }
    }

    function profSubmitBasic(event) {
        var $this = $(this);
        let userId = auth.currentUser.uid;
        // console.log(id, name, dob, email, gender,phone);
        let IDnumber = $('#prof-edit-IDnumber').val();
        let company = $('#prof-edit-company').val();
        let phonenumber = $('#prof-edit-phonenumber').val();
        let address = $('#prof-edit-address').val();
        phoneRule = /^09\d{8}$/;
        // console.log(id);
        // database.ref('users/' + userId).remove();
        if (phonenumber === "") {
            $('#prof-edit-phonenumber').tooltip('show'); //show
            setTimeout(function() {
                $('#prof-edit-phonenumber').tooltip('destroy');
            }, 3000);
        } else if (!phonenumber.match(phoneRule)) {
            $('#prof-edit-phonenumber').tooltip('show'); //show
            setTimeout(function() {
                $('#prof-edit-phonenumber').tooltip('destroy');
            }, 3000);
        } else {
            database.ref('users/' + userId).update({
                IDnumber: IDnumber,
                company: company,
                phonenumber: phonenumber,
                address: address
            });
            $('#error-message').hide();
            $('#basicModal').modal('hide');
            profClear();
            loadProf();
        }
    }

    function profSubmitProfile() {
        let userId = auth.currentUser.uid;
        let name1 = $('#prof-edit-name1').val();
        let chanId_1 = $('#prof-edit-channelId_1').val();
        let chanSecret_1 = $('#prof-edit-channelSecret_1').val();
        let chanAT_1 = $('#prof-edit-channelAccessToken_1').val();
        let name2 = $('#prof-edit-name2').val();
        let chanId_2 = $('#prof-edit-channelId_2').val();
        let chanSecret_2 = $('#prof-edit-channelSecret_2').val();
        let chanAT_2 = $('#prof-edit-channelAccessToken_2').val();
        let fbName = $('#prof-edit-fbPageName').val();
        let fbPageId = $('#prof-edit-fbPageId').val();
        let fbAppId = $('#prof-edit-fbAppId').val();
        let fbAppSecret = $('#prof-edit-fbAppSecret').val();
        let fbValidToken = $('#prof-edit-fbValidToken').val();
        let fbPageToken = $('#prof-edit-fbPageToken').val();
        let line1Arr = [name1, chanId_1, chanSecret_1, chanAT_1];
        let line2Arr = [name2, chanId_2, chanSecret_2, chanAT_2];
        let fbArr = [fbName, fbPageId, fbAppId, fbAppSecret, fbValidToken, fbPageToken];
        let appsKeysArr = []; // 存app_id進users集合用的陣列

        var runApps = new Promise((resolve, reject) => {
            database.ref('users/' + userId + '/app_ids').once('value', data => {
                let usersIds = data.val();
                resolve(usersIds);
            });
        });

        runApps
            .then(data => {
                return new Promise((resolve, reject) => {
                    if (data === null) {
                        // database.ref('users/' + userId + '/app_ids').update(data);
                        resolve('new');
                    } else {
                        resolve('modify');
                    }
                });
            })
            .then(data => {
                return new Promise((resolve, reject) => {
                    getAppHash(line1Arr, line2Arr, fbArr, data, () => {
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    socket.emit('update bot', {
                        line_1: {
                            channelId: chanId_1,
                            channelSecret: chanSecret_1,
                            channelAccessToken: chanAT_1
                        },
                        line_2: {
                            channelId: chanId_2,
                            channelSecret: chanSecret_2,
                            channelAccessToken: chanAT_2
                        },
                        fb: {
                            pageID: fbPageId,
                            appID: fbAppId,
                            appSecret: fbAppSecret,
                            validationToken: fbValidToken,
                            pageToken: fbPageToken
                        }
                    });
                    resolve();
                });
            })
            .then(() => {
                $('#error-message').hide();
                $('#profModal').modal('hide');
                profClear();
                loadProf();
            })
            .catch((reason) => {
                console.log("loading Failed");
                console.log(reason)
            });
    }

    function getAppHash(group1, group2, group3, status, callback) {
        let userId = auth.currentUser.uid;
        let line1Key, line2Key, fbKey;
        let line1 = {
            type: 'line',
            name: group1[0],
            id1: group1[1],
            id2: '',
            secret: group1[2],
            token1: group1[3],
            token2: '',
            user_id: userId
        }
        let line2 = {
            type: 'line',
            name: group2[0],
            id1: group2[1],
            id2: '',
            secret: group2[2],
            token1: group2[3],
            token2: '',
            user_id: userId
        }
        let fb = {
            type: 'facebook',
            name: group3[0],
            id1: group3[1],
            id2: group3[2],
            secret: group3[3],
            token1: group3[4],
            token2: group3[5],
            user_id: userId
        }
        if (status === 'new') {
            line1Key = database.ref('apps').push().key;
            line2Key = database.ref('apps').push().key;
            fbKey = database.ref('apps').push().key;
            database.ref('apps/' + line1Key).update(line1);
            database.ref('apps/' + line2Key).update(line2);
            database.ref('apps/' + fbKey).update(fb);
            getUserList(userId, [line1Key, line2Key, fbKey]);
            callback();
        } else {
            database.ref('users/' + userId + '/app_ids').once('value', data => {
                let usersIds = data.val();
                database.ref('apps/' + usersIds[0]).update(line1);
                database.ref('apps/' + usersIds[1]).update(line2);
                database.ref('apps/' + usersIds[2]).update(fb);
                callback();
            });
        }
    }

    function getUserList(userId, listArr) {
        database.ref('users/' + userId).update({ app_ids: listArr });
    }

    function profClear() {
        $('#prof-edit-id').val('');
        $('#prof-edit-name').val('');
        $('#prof-edit-dob').val('');
        $('#prof-edit-email').val('');
        $('#prof-edit-gender').val('Male');
        $('#prof-edit-phone').val('');
        $('#prof-edit-name1').val('');
        $('#prof-edit-channelId_1').val('');
        $('#prof-edit-channelSecret_1').val('');
        $('#prof-edit-channelAccessToken_1').val('');
        $('#prof-edit-name2').val('');
        $('#prof-edit-channelId_2').val('');
        $('#prof-edit-channelSecret_2').val('');
        $('#prof-edit-channelAccessToken_2').val('');
        $('#prof-edit-IDnumber').val('');
        $('#prof-edit-company').val('');
        $('#prof-edit-phonenumber').val('');
        $('#prof-edit-address').val('');
    }

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
});
