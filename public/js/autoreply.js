var domain = location.host;
// jQuery
$(document).ready(function() {
    var startUserId = setInterval(() => {
        if (auth.currentUser) {
            clearInterval(startUserId);
            // find();
            loadAppIdNames();
        }
    }, 1000);
    $(document).on('click', '#modal-submit', dataInsert); // 新增
    $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
    $(document).on('click', '#edit-submit', dataUpdate);
    $(document).on('click', '#delete-btn', dataRemove); // 刪除
    $(document).on('change', '#appId-names', findOne);
});

var TableObj = function() {
    this.tr = $('<tr>');
    this.th = $('<th>').attr('id', 'title');
    this.td1 = $('<td>').attr('id', 'started-time');
    this.td2 = $('<td>').attr('id', 'ended-time');
    this.td3 = $('<td>').attr('id', 'text');
    this.td4 = $('<td>');
    this.UpdateBtn = $('<button>').attr('type', 'button')
        .addClass('btn btn-default fa fa-pencil')
        .attr('id', 'edit-btn')
        .attr('data-toggle', 'modal')
        .attr('data-target', '#editModal')
        .attr('aria-hidden', 'true');
    this.DeleteBtn = $('<button>').attr('type', 'button')
        .addClass('btn btn-default fa fa-trash-o')
        .attr('id', 'delete-btn');
};

function loadAppIdNames() {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/apps/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let apps = data.data;
            for (let appId in apps) {
                var app = apps[appId];
                let option1 = $('<option>').text(app.name).attr('id', appId);
                let option2 = $('<option>').text(app.name).attr('id', appId);
                $('#appId-names').append(option1);
                $('#app-select').append(option2);
            }
        },
        error: (error) => {
            console.log('查詢失敗: ' + error);
        }
    });
}

function insert(appId, data) {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'POST',
        url: '/api/apps-autoreplies/apps/' + appId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            $('option').removeAttr('selected');
            let autoreplies = data.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];
            var list = new TableObj();
            var title = list.th.text(autoreply.title);
            var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
            var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
            var text = list.td3.text(autoreply.text);
            var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
            var trGrop = list.tr.attr('id', autoreplyId).attr('rel', appId).append(title, startedTime, endedTime, text, btns);
            $('#autoreply-tables').append(trGrop);
            $('#quickAdd').modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            $('option#' + appId).attr('selected', 'selected');
            findOne();
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
                                        '<td id = started-time rel="' + allApps[i].startedTime + '">' + ToLocalTimeString(allApps[i].startedTime) + '</td>' +
                                        '<td id = ended-time rel="' + allApps[i].endedTime + '">' + ToLocalTimeString(allApps[i].endedTime) + '</td>' +
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

function findOne() {
    $('#autoreply-tables').empty();
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    var appId = $('#appId-names').find(':selected').attr('id');

    $.ajax({
        type: 'GET',
        url: '/api/apps-autoreplies/apps/' + appId + '/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let autoreplies = data.data[appId].autoreplies;
            for (let autoreplyId in autoreplies) {
                let autoreply = autoreplies[autoreplyId];
                var list = new TableObj();
                var title = list.th.text(autoreply.title);
                var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
                var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
                var text = list.td3.text(autoreply.text);
                var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
                var trGrop = list.tr.attr('id', autoreplyId).attr('rel', appId).append(title, startedTime, endedTime, text, btns);
                $('#autoreply-tables').append(trGrop);
            }
        },
        error: (error) => {
            alert('載入失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function update(appId, autosHashId, data) {
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/apps-autoreplies/apps/' + appId + '/autoreplies/' + autosHashId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
            'Authorization': jwt
        },
        success: (data) => {
            let autoreplies = data.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];
            $('#' + autoreplyId).empty();
            var list = new TableObj();
            var title = list.th.text(autoreply.title);
            var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
            var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
            var text = list.td3.text(autoreply.text);
            var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
            $('#' + autoreplyId).append(title, startedTime, endedTime, text, btns);

            // 塞入資料庫並初始化
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
    var jwt = localStorage.getItem('jwt');
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/apps-autoreplies/apps/' + appId + '/autoreplies/' + autosHashId + '/users/' + userId,
        headers: {
            'Authorization': jwt
        },
        success: () => {
            $('#' + autosHashId).remove();
            alert('刪除成功!');
        },
        error: (error) => {
            alert('刪除失敗: ' + error.msg);
            console.log(error);
        }
    });
}

function dataInsert() {
    let appIds = $('#app-select option:selected').attr('id');
    let starttime = Date.parse($('#starttime').val());
    let endtime = Date.parse($('#endtime').val());
    let name = $('#modal-task-name').val();
    let textInput = $('#enter-text').val();
    let obj = {
        title: name,
        startedTime: starttime,
        endedTime: endtime,
        text: textInput
    };
    insert(appIds, obj);
}

function openEdit() {
    let appId = $(this).parent().parent().attr('rel');
    let autoreplyId = $(this).parent().parent().attr('id');
    let title = $(this).parent().parent().find('#title').text();
    let startedTimeMilli = parseInt($(this).parent().parent().find('#started-time').attr('rel'));
    let startedTime = ISODateTimeString(startedTimeMilli);
    let endedTimeMilli = parseInt($(this).parent().parent().find('#ended-time').attr('rel'));
    let endedTime = ISODateTimeString(endedTimeMilli);
    let text = $(this).parent().parent().find('#text').text();
    // Initialize
    $('#edit-appid').text(appId);
    $('#edit-autoreplyid').text(autoreplyId);
    $('#edit-taskTitle').val(title); // 標題
    $('#edit-taskStart').val(startedTime); // 開始時間
    $('#edit-taskEnd').val(endedTime); // 結束時間
    $('#edit-taskContent').val(text); // 任務內容
} // end open edit

function dataUpdate() {
    let appId = $(this).parent().parent().find('#edit-appid').text();
    let autoreplyId = $(this).parent().parent().find('#edit-autoreplyid').text();
    let name = $('#edit-taskTitle').val(); // 標題
    let starttime = Date.parse($('#edit-taskStart').val()); // 開始時間
    let endtime = Date.parse($('#edit-taskEnd').val()); // 結束時間
    let textInput = $('#edit-taskContent').val(); // 任務內容
    var data = {
        title: name,
        startedTime: starttime,
        endedTime: endtime,
        text: textInput
    };

    update(appId, autoreplyId, data);
} // end modal edit

function dataRemove() {
    let confirmDel = confirm('確定要刪除?');
    if (confirmDel) {
        let appId = $(this).parent().parent().attr('rel');
        let autoreplyId = $(this).parent().parent().attr('id');
        remove(appId, autoreplyId);
    }
}

function ISODateTimeString(d) {
    d = new Date(d);

    function pad(n) { return n < 10 ? '0' + n : n; }
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
