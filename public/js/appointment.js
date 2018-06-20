/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var $modal = $('#appointmentAddModal');
    var $itemSelector = $('#item-select');

    var api = window.restfulAPI;
    var nowSelectAppId = '';
    var userId;

    const NEW = 'NEW';

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    const datetimePickerInitOpts = {
        sideBySide: true,
        locale: 'zh-tw',
        defaultDate: Date.now(),
        icons: {
            time: 'far fa-clock',
            date: 'far fa-calendar-alt',
            up: 'fas fa-chevron-up',
            down: 'fas fa-chevron-down',
            previous: 'fas fa-chevron-left',
            next: 'fas fa-chevron-right',
            today: 'fas fa-sun',
            clear: 'far fa-trash-alt',
            close: 'fas fa-times'
        }
    };

    const timePickerInitOpts = {
        format: 'YYYY-MM-DD',
        locale: datetimePickerInitOpts.locale,
        icons: datetimePickerInitOpts.icons
    };

    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $jqDoc.on('keyup', '#insert-member-name', insertMember);
    $jqDoc.on('keyup', '#insert-item-name', insertItem);
    $jqDoc.on('click', '#renew', refreshModal);
    $jqDoc.on('click', '#delete-member-btn', deleteMember);
    $jqDoc.on('click', '#delete-item-btn', deleteItem);
    $itemSelector.change(determineNewItem);
    $modal.on('hidden.bs.modal', refreshModal);

    function determineNewItem() {
        let optionVal = $(this).val();
        if (NEW === optionVal) {
            $('.member-add').addClass('d-none');
            $('#member-list').empty();
            return $('#insert-item-name').val('');
        }
        $('#insert-item-name').val(optionVal);
        $('.member-add').removeClass('d-none');
    }

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
    }

    function loadOneItem(name) {
        return `<div itemName="${name}" class="my-3">
            <h5>產品：${name} <i class="fas fa-trash-alt text-danger float-right cursor-pointer my-2 mx-1" id="delete-item-btn" name="${name}"></i></h5>
            <hr/>
            <div class="${name}-timetable"></div>
        </div>`;
    }

    function loadOneItemSelectOption(name) {
        return `<option value="${name}">${name}</option>`;
    }

    function insertItem(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            // 1. api insert item
            let itemName = $(this).val();
            let productFormat = loadOneItem(itemName);
            let productDropdown = loadOneItemSelectOption(itemName);
            // 2. api implementing
            // 3. add product to product list
            $(`#all-item-list`).append(productFormat);
            $itemSelector.append(productDropdown).find(`option[value=${itemName}]`).attr('selected', true);
            // 4. remove d-none class of member-add
            $('.member-add').removeClass('d-none');
            loadTimetable(itemName, [], []);
        }
    }

    function insertMember(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            let member = $(this).val();
            let product = $modal.find('#insert-item-name').val();
            // 1. api insert member
            let str = showModalMember(member); // requires member id for deletion to work
            $('#member-list').append(str);
            $('#insert-member-name').val('');
        }
    }

    function deleteItem() {
        let name = $(this).attr('name');
        $(this).parents(`[itemName="${name}"]`).remove();
        $(`option[value="${name}"]`).remove();
    }

    function deleteMember() {
        // 1. api deletion
        $(this).parents('.list-group-item').remove();
        let memberName = $(this).attr('name');
        $(`[memberName="${memberName}"]`).remove();
    }

    function refreshModal() {
        $modal.find('[value="NEW"]').attr('selected', true).siblings().removeAttr('selected');
        $modal.find('#insert-item-name').val('');
        $modal.find('.member-add').addClass('d-none');
        $modal.find('#insert-member-name').val('');
        $modal.find('#member-list').empty();
    }

    function showModalMember(name) {
        return `<li class="list-group-item">
                    <div class="form-group row">
                        <div class="col-8">
                            <input class="form-control form-control-sm" type="text" value="${name}" />
                        </div>
                        <div class="col-4">
                            <i class="fas fa-trash-alt text-danger float-right cursor-pointer my-2 mx-1" id="delete-member-btn" name="${name}"></i>
                            <i class="fas fa-pencil-alt float-right cursor-pointer my-2 mx-1"></i>
                        </div>
                    </div>
                </li>`;
    }

    function showMember(itemName) {
    }

    function loadTimetable(itemId, members, events) {
        let timetable = new Timetable();
        timetable.setScope(8, 3);
        if (0 < members.length) timetable.addLocations(members);
        if (0 < events.length) timetable.addEvent('Sightseeing', 'Rotterdam', new Date(2018,7,17,9,00), new Date(2018,7,17,11,30), { url: '#' });
        // timetable.addLocations(members);
        // if (0 < members.length) {
        //     members.map((member) => {
        //         timetable.addEvent('Sightseeing', 'Rotterdam', new Date(2018,7,17,9,00), new Date(2018,7,17,11,30), { url: '#' });
        //     });
        // }
        let renderer = new Timetable.Renderer(timetable);
        renderer.draw(`.${itemId}-timetable`);
    }

    function toDatetimeLocal(date) {
        var YYYY = date.getFullYear();
        var MM = ten(date.getMonth() + 1);
        var DD = ten(date.getDate());

        function ten(i) {
            return (i < 10 ? '0' : '') + i;
        }

        return YYYY + '-' + MM + '-' + DD;
    }

    return api.apps.findAll(userId).then(function(respJson) {
        var apps = respJson.data;
        var $dropdownMenu = $appDropdown.find('[aria-labelledby="appsDropdown"]');

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted ||
                app.type === api.apps.enums.type.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');

            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $itemSelector.find('[value="new"]').attr('selected', true);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });
})();
