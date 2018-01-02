var domain = location.host;
// jQuery
$(document).ready(function() {
    var startUserId = setInterval(() => {
        if(auth.currentUser) {
            clearInterval(startUserId);
            read();
        }
    },1000);
    $(document).on('click', '#modal-submit', modalSubmit); //新增
    $(document).on('click', '#editBtn', openEdit); //打開編輯modal
    $(document).on('click', '#edit-submit', modalEdit);
    $(document).on('click', '#deleBtn', deleteRow); //刪除
});

function read() {
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: 'http://' + domain + '/api/autoreplies/' + id,
        success: (data) => {
            let obj = data.data;
            $.each(obj, (index,item) => {
                if(item !== null) {
                    let str = 
                    '<tr>' + 
                        '<td rel="' + item.autosHashId + '" hidden></td>' +
                        '<td>Open</td>' +
                        '<td rel="' + item.name + '">' + item.name + '</td>' +
                        '<td rel="' + item.start + ' ' + item.end + '">' + item.start + ' - ' + item.end + '</td>' +
                        '<td rel="' + item.content + '">' + item.content + '</td>' +
                        '<td><a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" title="編輯"><i class="fa fa-pencil-square-o fa-2x edit" aria-hidden="true"></i></a> <a href="#" id="deleBtn" title="刪除"><i class="fa fa-trash-o fa-2x error" aria-hidden="true"></i></a></td>' +
                    '</tr>';
                    $('#autoreply-list').append(str);
                }
            });
        },
        error: (error) => {
            alert('載入失敗: ' + error);
            console.log(error);
        }
    })
}

function create(data) {
    var id = auth.currentUser.uid;
    console.log(id)
    console.log(data);
    $.ajax({
        type: 'POST',
        url: 'http://' + domain + '/api/autoreplies/' + id,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: () => {
            $('#quickAdd').modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            alert('新增成功!');

            location.reload();
        },
        error: (error) => {
            alert('新增失敗: ' + error);
            console.log(error);
        }
    });
}

function update(autosHashId,data) {
    $.ajax({
        type: 'PUT',
        url: 'http://' + domain + '/api/autoreplies/' + autosHashId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: () => {
            $('[rel="' + autosHashId + '"]').parent().remove();
            let str = 
            '<tr>' + 
                '<td rel="' + autosHashId + '" hidden></td>' +
                '<td>Open</td>' +
                '<td rel="' + data.name + '">' + data.name + '</td>' +
                '<td rel="' + data.start + ' ' + data.end + '">' + data.start + ' - ' + data.end + '</td>' +
                '<td rel="' + data.content + '">' + data.content + '</td>' +
                '<td><a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" title="編輯"><i class="fa fa-pencil-square-o fa-2x edit" aria-hidden="true"></i></a> <a href="#" id="deleBtn" title="刪除"><i class="fa fa-trash-o fa-2x error" aria-hidden="true"></i></a></td>' +
            '</tr>';
            $('#autoreply-list').append(str);
            //塞入資料庫並初始化
            $('#editModal').modal('hide');
            $('#edit-taskTitle').val('');
            $('#edit-taskStart').val('');
            $('#edit-taskEnd').val('');
            $('#edit-taskContent').val('');
            alert('修改成功!');
        },
        error: (error) => {
            alert('修改失敗: ' + error);
            console.log(error);
        }
    });
}

function del(autosHashId) {
    var id = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: 'http://' + domain + '/api/autoreplies/' + id + '/' + autosHashId,
        success: () => {
            $('[rel="' + autosHashId + '"]').parent().remove();
            alert('刪除成功!');
        },
        error: (error) => {
            alert('刪除失敗: ' + error);
            console.log(error);
        }
    });
}

function modalSubmit() {
    let starttime = $('#starttime').val();
    let endtime = $('#endtime').val();
    let name = $('#modal-task-name').val();
    let textInput = $('#enter-text').val();
    let obj = {
        name: name,
        start: starttime,
        end: endtime,
        content: textInput
    }
    create(obj);
}

function openEdit() {
    //Initialize
    $('#edit-id').text(''); //key
    $('#edit-taskTitle').val(''); //標題
    $('#edit-taskStart').val(''); //開始時間
    $('#edit-taskEnd').val(''); //結束時間
    $('#edit-taskContent').val(''); //任務內容
    let key = $(this).parent().parent().find('td:first').attr('rel');
    let obj = $(this).parent().parent().find('td').each(function(index,item) {
        switch(index) {
            case 0:
                $('#edit-id').text($(this).attr('rel'));
                break;
            case 2:
                $('#edit-taskTitle').val($(this).attr('rel')); //標題
                break;
            case 3:
                let str = $(this).attr('rel');
                var newStart = str.substr(0,16);
                var newEnd = str.substr(str.indexOf(' ')+1,16);
                $('#edit-taskStart').val(newStart); //開始時間
                $('#edit-taskEnd').val(newEnd); //結束時間
                break;
            case 4:
                $('#edit-taskContent').val($(this).attr('rel')); //任務內容
                break;
            default:
                break;
        }
    });
} //end open edit
function modalEdit() {
    let key = $(this).parent().parent().find('#edit-id').text();
    console.log(key)
    var name = $('#edit-taskTitle').val(); //標題
    var starttime = $('#edit-taskStart').val(); //開始時間
    var endtime = $('#edit-taskEnd').val(); //結束時間
    var textInput = $('#edit-taskContent').val(); //任務內容

    var data = {
        name: name,
        start: starttime,
        end: endtime,
        content: textInput
    }

    update(key,data);
} //end modal edit

function deleteRow() {
    let confirmDel = confirm("確定要刪除?");
    if(confirmDel) {
        let key = $(this).parent().parent().find('td:first').attr('rel');
        del(key);
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

function convertTime(date) {
    let newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    let finalDate = ISODateTimeString(newDate);
    return finalDate;
}