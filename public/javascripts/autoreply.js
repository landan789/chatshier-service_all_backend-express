var domain = location.host;
// jQuery
$(document).ready(function() {
    var startUserId = setInterval(() => {
        if (auth.currentUser) {
            clearInterval(startUserId);
            find();
        }
    }, 1000);
    $(document).on('click', '#modal-submit', dataInsert); //新增
    $(document).on('click', '#editBtn', openEdit); //打開編輯modal
    $(document).on('click', '#edit-submit', dataUpdate);
    $(document).on('click', '#deleBtn', dataRemove); //刪除
});

function insert(appId, data) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'POST',
        url: '/api/apps-autoreplies/apps/' + appId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: (obj) => {
            let autoreplyObj = obj.data;
            let autoreplyId = Object.keys(autoreplyObj[appId].autoreplies);
            let str =
                '<tr>' +
                '<td rel="' + autoreplyId + '" hidden></td>' +
                '<td>Open</td>' +
                '<td rel="' + data.title + '">' + data.title + '</td>' +
                '<td rel="' + ToLocalTimeString(data.startedTime) + '">' + ToLocalTimeString(data.startedTime) + '</td>' +
                '<td rel="' + ToLocalTimeString(data.endedTime) + '">' + ToLocalTimeString(data.endedTime) + '</td>' +
                '<td rel="' + data.text + '">' + data.text + '</td>' +
                '<td><a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" title="編輯"><i class="fa fa-pencil-square-o fa-2x edit" aria-hidden="true"></i></a> <a href="#" id="deleBtn" title="刪除"><i class="fa fa-trash-o fa-2x error" aria-hidden="true"></i></a></td>' +
                '</tr>';
            $('#' + appId + ' #autoreply-list').append(str);
            $('#quickAdd').modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            alert('新增成功!');
        },
        error: (error) => {
            alert('新增失敗: ' + error);
            console.log(error);
        }
    });
}

function find() {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps-autoreplies/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let autoreplyObj = data.data;
            let appIds = Object.keys(autoreplyObj);
            appIds.map((item, index) => {
                var proceed = new Promise((resolve, reject) => {
                    resolve();
                });

                proceed
                    .then(() => {
                        return new Promise((resolve, reject) => {
                            let options = '<option value="' + item + '">APP ' + (index + 1) + '</option>';
                            $('#app-select').append(options);
                            resolve();
                        });
                    })
                    .then(() => {
                        return new Promise((resolve, reject) => {
                            let tableContent =
                                '<div class="col-md-6 space-top-down">' +
                                '<label class="col-2 col-form-label">APP ' + (index + 1) + '</label>' +
                                '<table id="' + item + '">' +
                                '<thead>' +
                                '<tr>' +
                                '<th class="table-header" hidden>ID</th>' +
                                '<th class="table-header">狀態</th>' +
                                '<th class="table-header">標題</th>' +
                                '<th class="table-header">開始時間</th>' +
                                '<th class="table-header">結束時間</th>' +
                                '<th class="table-header">訊息內容</th>' +
                                '<th class="table-header">編輯/刪除</th>' +
                                '</tr>' +
                                '</thead>' +
                                '<tbody id="autoreply-list"></tbody>' +
                                '</table>' +
                                '</div>';
                            $('#autoreply-tables').append(tableContent);
                            resolve(item);
                        });
                    })
                    .then((appId) => {
                        database.ref('apps/' + appId + '/autoreplies').once('value', (snap) => {
                            let allApps = snap.val();
                            for (let i in allApps) {
                                if (allApps[i].isDeleted === 0) {
                                    let str =
                                        '<tr>' +
                                        '<td rel="' + i + '" hidden></td>' +
                                        '<td>Open</td>' +
                                        '<td id = title rel="' + allApps[i].title + '">' + allApps[i].title + '</td>' +
                                        '<td id = started-time rel="' + ToLocalTimeString(allApps[i].startedTime) + '">' + ToLocalTimeString(allApps[i].startedTime) + '</td>' +
                                        '<td id = ended-time rel="' + ToLocalTimeString(allApps[i].endedTime) + '">' + ToLocalTimeString(allApps[i].endedTime) + '</td>' +
                                        '<td id = text rel="' + allApps[i].text + '">' + allApps[i].text + '</td>' +
                                        '<td><a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" title="編輯"><i class="fa fa-pencil-square-o fa-2x edit" aria-hidden="true"></i></a> <a href="#" id="deleBtn" title="刪除"><i class="fa fa-trash-o fa-2x error" aria-hidden="true"></i></a></td>' +
                                        '</tr>';
                                    $('#' + appId).find('#autoreply-list').append(str);
                                }
                            }
                        });
                    })
                    .catch((reason) => {
                        console.log(reason);
                    });
            });
        },
        error: (error) => {
            alert('載入失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function findOne(appId, autosHashId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    
    $.ajax({
        type: 'GET',
        url: '/api/apps-autoreplies/apps/' + appId + '/autoreplies/' + autosHashId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let info = data.data;
            var autoreply = info[appId].autoreplies[autosHashId];
            $('#edit-appid').text(appId);
            $('#edit-autoreplyid').text(autosHashId);
            $('#edit-taskTitle').val(autoreply.title);
            $('#edit-taskStart').val(ISODateTimeString(autoreply.startedTime));
            $('#edit-taskEnd').val(ISODateTimeString(autoreply.endedTime));
            $('#edit-taskContent').val(autoreply.text);
        },
        error: (error) => {
            alert('載入失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function update(appId, autosHashId, data) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/apps-autoreplies/apps/' + appId + '/autoreplies/' + autosHashId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let autoreplyObj = data.data[appId].autoreplies[autosHashId];
            $('[rel="' + autosHashId + '"]').parent().remove();
            let str =
                '<tr>' +
                '<td rel="' + autosHashId + '" hidden></td>' +
                '<td>Open</td>' +
                '<td rel="' + autoreplyObj.title + '">' + autoreplyObj.title + '</td>' +
                '<td rel="' + ToLocalTimeString(autoreplyObj.startedTime) + '">' + ToLocalTimeString(autoreplyObj.startedTime) + '</td>' +
                '<td rel="' + ToLocalTimeString(autoreplyObj.endedTime) + '">' + ToLocalTimeString(autoreplyObj.endedTime) + '</td>' +
                '<td rel="' + autoreplyObj.text + '">' + autoreplyObj.text + '</td>' +
                '<td><a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" title="編輯"><i class="fa fa-pencil-square-o fa-2x edit" aria-hidden="true"></i></a> <a href="#" id="deleBtn" title="刪除"><i class="fa fa-trash-o fa-2x error" aria-hidden="true"></i></a></td>' +
                '</tr>';
            $('#' + appId).find('#autoreply-list').append(str);
            //塞入資料庫並初始化
            $('#editModal').modal('hide');
            $('#edit-appid').text('');
            $('#edit-autoreplyid').text('');
            $('#edit-taskTitle').val('');
            $('#edit-taskStart').val('');
            $('#edit-taskEnd').val('');
            $('#edit-taskContent').val('');
            alert('修改成功!');
        },
        error: (error) => {
            alert('修改失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function remove(appId, autosHashId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/apps-autoreplies/apps/' + appId + '/autoreplies/' + autosHashId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: () => {
            $('[rel="' + autosHashId + '"]').parent().remove();
            alert('刪除成功!');
        },
        error: (error) => {
            alert('刪除失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function dataInsert() {
    let appIds = $('#app-select option:selected').val();
    let starttime = Date.parse($('#starttime').val());
    let endtime = Date.parse($('#endtime').val());
    let name = $('#modal-task-name').val();
    let textInput = $('#enter-text').val();
    let obj = {
        title: name,
        startedTime: starttime,
        endedTime: endtime,
        text: textInput
    }
    insert(appIds, obj);
}

function openEdit() {
    //Initialize
    $('#edit-appid').text('');
    $('#edit-autoreplyid').text('');
    $('#edit-taskTitle').val(''); //標題
    $('#edit-taskStart').val(''); //開始時間
    $('#edit-taskEnd').val(''); //結束時間
    $('#edit-taskContent').val(''); //任務內容
    let autoreplyId = $(this).parent().parent().find('td:first').attr('rel');
    let appId = $(this).parent().parent().parent().parent().attr('id');
    findOne(appId, autoreplyId);
} //end open edit

function dataUpdate() {
    let appId = $(this).parent().parent().find('#edit-appid').text();
    let autoreplyId = $(this).parent().parent().find('#edit-autoreplyid').text();
    let name = $('#edit-taskTitle').val(); //標題
    let starttime = Date.parse($('#edit-taskStart').val()); //開始時間
    let endtime = Date.parse($('#edit-taskEnd').val()); //結束時間
    let textInput = $('#edit-taskContent').val(); //任務內容
    var data = {
        title: name,
        startedTime: starttime,
        endedTime: endtime,
        text: textInput
    }

    update(appId, autoreplyId, data);
} //end modal edit

function dataRemove() {
    let confirmDel = confirm("確定要刪除?");
    if (confirmDel) {
        let appId = $(this).parent().parent().parent().parent().attr('id');
        let autoreplyId = $(this).parent().parent().find('td:first').attr('rel');
        remove(appId, autoreplyId);
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

function ToLocalTimeString(millisecond) {
    var date = new Date(millisecond);
    var localDate = date.toLocaleDateString();
    var localTime = date.toLocaleTimeString();
    var localTimeString = localDate + localTime;
    return localTimeString;
}