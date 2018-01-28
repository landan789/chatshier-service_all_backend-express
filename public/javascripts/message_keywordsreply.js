/// <reference path='../../typings/client/_firebase-auth.d.ts' />
/// <reference path='../../typings/client/restful_api.d.ts' />

(function() {
    var userId = '';
    var allKeywordreplyData = {};
    var api = window.restfulAPI;

    var $jqDoc = $(document);
    var $keywordreplyAddModal = null;
    var $appSelectElem = null;
    var $servingElem = null;
    var $waitingElem = null;

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;

        $jqDoc.on('click', '.tablinks', clickMsg);
        $jqDoc.on('click', '#csv', noCsv);
        $jqDoc.on('click', '#viewBtn', loadView);
        $jqDoc.on('click', '#editBtn', openEdit);
        $jqDoc.on('click', '#deleBtn', deleteRow);
        $jqDoc.on('click', '#edit-submit', modalEdit);

        // ==========
        // 設定新增關鍵字 modal 相關 element 與事件
        $keywordreplyAddModal = $('#keywordreply_add_modal');
        $appSelectElem = $keywordreplyAddModal.find('.modal-body select[name="keywordreply-app-name"]');

        $keywordreplyAddModal.on('show.bs.modal', function() {
            // 新增 modal 即將顯示事件發生時，將 App 清單更新
            $appSelectElem.empty();
            for (var appId in allKeywordreplyData) {
                var appData = allKeywordreplyData[appId];
                $appSelectElem.append('<option value="' + appId + '">' + appData.name + '</option>');
            }
        });

        $keywordreplyAddModal.find('.modal-footer button.btn-submit').on('click', insertSubmit);
        // ==========

        $servingElem = $('#serving');
        $waitingElem = $('#waiting');

        // 先取得使用者所有的 AppId 清單儲存至本地端
        api.chatshierApp.getAll(userId).then(function(resJson) {
            allKeywordreplyData = resJson.data;
            loadKeywordsReply();
        });
    });

    function loadKeywordsReply() {
        $servingElem.empty();
        $waitingElem.empty();

        for (var appId in allKeywordreplyData) {
            var keywordrepliesData = allKeywordreplyData[appId].keywordreplies;
            if (!keywordrepliesData) {
                continue;
            }

            for (var keywordreplyId in keywordrepliesData) {
                var keywordreplyData = keywordrepliesData[keywordreplyId];
                console.log(keywordreplyData);
            }
        }

        database.ref('message-keywordsreply/' + userId).on('value', snap => {
            var dataArray = [];
            var testVal = snap.val();
            if (!testVal) {
                return;
            }

            var myIds = Object.keys(testVal);
            for (var i = 0; i < myIds.length; i++) {
                dataArray.push(snap.child(myIds[i]).val());
                console.log('data in looping for append');
                if ('開放' === dataArray[i].taskCate) {
                    $servingElem.append(
                        '<tr>' +
                            '<td id="' + myIds[i] + '" hidden>' + myIds[i] + '</td>' +
                            '<td id="td">' + dataArray[i].taskMainK + '</td>' +
                            '<td id="td">' + dataArray[i].taskSubK + '</td>' +
                            '<td id="td">' + dataArray[i].taskText + '</td>' +
                            '<td id="td"><b>此功能尚未開通</b></td>' +
                            '<td id="td" >' + dataArray[i].taskCate + '</td>' +
                            '<td id="td">' +
                                '<a href="#" id="editBtn" data-toggle="modal" data-target="#editModal"><b style="color:black;">編輯  </b></a>' +
                                '<a href="#" id="viewBtn" data-toggle="modal" data-target="#viewModal"><b style="color:black;">檢視  </b></a>' +
                                '<a href="#" id="deleBtn"><b style="color:black;">刪除</b></a>' +
                            '</td>' +
                        '</tr>'
                    );
                    //  var socket = io.connect();
                    // socket.emit('update keywords', {
                    //   message: dataArray[i].taskMainK,
                    //   reply: dataArray[i].taskText
                    // });
                    // for (var n=0; n<dataArray[i].taskSubK.length; n++){
                    //   socket.emit('update subKeywords', {
                    //     message: dataArray[i].taskSubK[n],
                    //     reply: dataArray[i].taskText
                    //   });
                    // }
                } else {
                    $waitingElem.append('<tr>' + '<td id="' + myIds[i] + '" hidden>' + myIds[i] + '</td>' + '<td id="td">' + dataArray[i].taskMainK + '</td>' + '<td id="td">' + dataArray[i].taskSubK + '</td>' + '<td id="td">' + dataArray[i].taskText + '</td>' + '<td id="td"><b>此功能尚未開通</b></td>' + '<td id="td">' + dataArray[i].taskCate + '</td>' + '<td id="td">' + '<a href="#" id="editBtn" data-toggle="modal" data-target="#editModal"><b style="color:black;">編輯  </b></a>' + '<a href="#" id="viewBtn" data-toggle="modal" data-target="#viewModal"><b style="color:black;">檢視  </b></a>' + '<a href="#" id="deleBtn"><b style="color:black;">刪除</b></a>' + '</td>' + '</tr>');
                }
            }
        });
    }

    function addMsgCanvas() {
        $('#MsgCanvas').append('<!--TEXT AREA -->' + '<div id="text" style="display:block; height:100px; width:400px; padding:1.5%;margin:2%">' + '<span style="float:right" onclick="this.parentElement.remove()">X</span>' + '<table>' + '<tr>' + '<th style="padding:1.5%; margin:2%; background-color: #ddd">Enter Text:</th>' + '</tr>' + '<tr>' + '<td style="background-color: #ddd">' + '<form style="padding:1%; margin:2%">' + '<input id="textinput" style="width:400px;height:100px" />' + '</form>' + '</td>' + '</tr>' + '<tr>' + '<th style="padding:1.5%; margin:2%; background-color: #ddd">' + '<button style="padding:1.5%; margin:2%; class="tablinks" rel="emos">Emoji</button>' + '</th>' + '</tr>' + '</table>' + '</div>');
        console.log('addMsgCanvas exe');
    }

    function insertSubmit() {
        // var d = Date.now();
        // var mainKey = $('#modal-mainKey').val().trim();
        // var subKey = $('#modal-subKey').val().split(',');
        // var text = $('#textinput').val().split(',');
        // var cate = $('#modal-category').val();

        // if ('狀態' === cate) {
        //     $('.error_msg').show();
        // } else {
        //     writeUserData(d, auth.currentUser.uid, mainKey, subKey, text, cate, auth.currentUser.email.toString());
        //     // 塞入資料庫並重整
        //     $('#keywordreply_add_modal').modal('hide');
        //     $('#modal-mainKey').val('');
        //     $('#modal-subKey').val('');
        //     $('#textinput').val('');
        //     $('#modal-category').val('');
        //     alert('變更已儲存!');
        //     loadKeywordsReply();
        // }

        var appId = $appSelectElem.find('option:selected').val();
        var keyword = $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val();
        var content = $keywordreplyAddModal.find('textarea[name="keywordreply-content"]').val();
        var isDraft = $keywordreplyAddModal.find('input[name="keywordreply-is-draft"]').prop('checked');
        var $errorMsgElem = $keywordreplyAddModal.find('.text-danger.error-msg');

        // ==========
        // 檢查資料有無輸入
        $errorMsgElem.empty().hide();
        if (!appId) {
            $errorMsgElem.text('請選擇目標App').show();
            return;
        } else if (!keyword) {
            $errorMsgElem.text('請輸入關鍵字').show();
            return;
        } else if (!content) {
            $errorMsgElem.text('請輸入關鍵字回覆的內容').show();
            return;
        }
        // ==========

        var keywordreplyData = {
            keyword: keyword,
            subKeywords: '',
            content: content,
            replyCount: 0,
            replyMessagers: '',
            isDraft: isDraft ? 1 : 0,
            createdTime: new Date().getTime(),
            updatedTime: new Date().getTime()
        };
        console.log(keywordreplyData);
        return api.keywordreply.insert(appId, userId, keywordreplyData).then(function(resJson) {
            console.log(resJson);
            // $keywordreplyAddModal.modal('hide');
        });
    }

    function insertKeywordreply(appId) {
        var keywordreplyData = {
            keyword: '',
            subKeywords: [],
            content: '',
            replyCount: 0,
            replyMessagers: [],
            isDraft: 0,
            createdTime: new Date().getTime(),
            updatedTime: new Date().getTime()
        };
        return api.keywordreply.insert(appId, userId, keywordreplyData);
    }

    function writeUserData(d, userId, mainKey, subKey, text, cate) {
        database.ref('message-keywordsreply/' + userId).push({
            taskMainK: mainKey,
            taskSubK: subKey,
            taskText: text,
            taskCate: cate,
            owner: auth.currentUser.email
        });
    }

    function noCsv() {
        if ($('#nocsv').is(':visible')) {
            $('#nocsv').hide();
        } else {
            $('#nocsv').show();
        }
    }

    function clickMsg() {
        var target = $(this).attr('rel');
        $('#' + target).show().siblings().hide();
    }

    function addMsg() {
        var target = $(this).attr('rel');
        if ($('#' + target).is(':visible')) {
            $('#' + target).hide();
        } else {
            $('#' + target).show();
        }
    }

    function loadView() {
        $('#view-mainK').text(''); // 主關鍵字
        $('#view-subK').text(''); // 副關鍵字
        $('#view-textinput').text(''); // 任務內容
        $('#view-stat').text(''); // 狀態
        $('#view-owne').text(''); // 負責人
        $('#view-subt').empty();

        var key = $(this).parent().parent().find('td:first').text();

        database.ref('message-keywordsreply/' + userId + '/' + (key)).on('value', snap => {
            var testVal = snap.val();
            // 重複出現值 要抓出來
            $('#view-id').append(key); // 編號
            $('#view-mainK').append(testVal.taskMainK); // 主關鍵字
            $('#view-subK').append(testVal.taskSubK); // 副關鍵字
            $('#view-textinput').append(testVal.taskText); // 任務內容
            $('#view-stat').append(testVal.taskCate); // 狀態
            $('#view-owne').append(testVal.owner); // 負責人
        });
    }

    function openEdit() {
        $('#edit-mainK').val(''); // 任務內容
        $('#edit-subK').val(''); // 任務內容
        $('#edit-taskContent').val(''); // 任務內容
        $('#edit-status').val(''); // 狀態
        $('#edit-owner').val(''); // 負責人

        var key = $(this).parent().parent().find('td:first').text();

        database.ref('message-keywordsreply/' + userId + '/' + key).on('value', snap => {
            var testVal = snap.val();
            // console.log(testVal);
            $('#edit-id').append(key);
            $('#edit-mainK').val(testVal.taskMainK); // 主關鍵字
            $('#edit-subK').val(testVal.taskSubK); // 副關鍵字
            $('#edit-taskContent').val(testVal.taskText); // 任務內容
            $('#edit-status').val(testVal.taskCate); // 狀態
            $('#edit-owner').val(testVal.owner); // 負責人
            // console.log(sublist);
        });
    }

    function modalEdit() {
        if (confirm('確認更改？')) {
            var key = $('#edit-id').text().trim();
            var userId = auth.currentUser.uid;
            var mainKey = $('#edit-mainK').val().trim(); // 主關鍵字
            var subKey = $('#edit-subK').val().split(','); // 副關鍵字
            var text = $('#edit-taskContent').val().split(','); // 任務內容
            var cate = $('#edit-status').val(); // 狀態
            var owne = $('#edit-owner').val(); // 負責人
            // 日期
            var d = Date.now();
            var date = new Date(d);
            // console.log(key, userId, text, cate, cate, prio, owne, desc, subt, inir, inid, auth.currentUser.email, date);
            saveUserData(key, userId, mainKey, subKey, text, cate, owne, auth.currentUser.email, date.toString());
            $('#edit-id').text(''); //
            $('#edit-mainK').val(''); // 主關鍵字
            $('#edit-subK').val(''); // 副關鍵字
            $('#edit-taskContent').val(''); // 任務內容
            $('#edit-status').val(''); // 狀態
            $('#edit-owner').val(''); // 負責人
            loadKeywordsReply();
            $('#editModal').modal('hide');
            alert('已成功更新');
        }
    }

    function saveUserData(key, userId, mainKey, subKey, text, cate, owne) {
        // database.ref('message-keywordsreply/' + userId + '/' + key).set({
        //     taskMainK: mainKey,
        //     taskSubK: subKey,
        //     taskText: text,
        //     taskCate: cate,
        //     owner: owne
        // });
    }

    function deleteRow() {
        var key = $(this).parent().parent().find('td:first').text();
        var userId = auth.currentUser.uid;
        // console.log(userId, key);
        if (confirm('確定刪除？')) {
            database.ref('message-keywordsreply/' + userId + '/' + key).remove();
            loadKeywordsReply();
            alert('已成功刪除');
        }
    }
})();
