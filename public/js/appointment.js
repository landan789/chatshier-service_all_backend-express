/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var $modal = $('#appointmentAddModal');
    var $productSelector = $('#product-select');

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
    $jqDoc.on('keyup', '#insert-product-name', insertProduct);
    $jqDoc.on('click', '#renew', refreshModal);
    $jqDoc.on('click', '#delete-member-btn', deleteMember);
    $jqDoc.on('click', '#delete-product-btn', deleteProduct);
    $productSelector.change(determineNewProduct);
    $modal.on('hidden.bs.modal', refreshModal);

    function determineNewProduct() {
        let optionVal = $(this).val();
        if (NEW === optionVal) {
            $('.member-add').addClass('d-none');
            $('#member-list').empty();
            return $('#insert-product-name').val('');
        }
        $('#insert-product-name').val(optionVal);
        $('.member-add').removeClass('d-none');
    }

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
    }

    function insertProduct(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            // 1. api insert product
            let productName = $(this).val();
            let productFormat =
            `<div productName="${productName}">
                <h5>產品：${productName} <i class="fas fa-trash-alt text-danger float-right cursor-pointer my-2 mx-1" id="delete-product-btn" name="${productName}"></i></h5>
                <hr/>
                <div id="${productName}"></div>
            </div>`;
            let productDropdown =
            `<option value="${productName}">${productName}</option>`;
            // 2. api implementing
            // 3. add product to product list
            $(`#all-product-list`).append(productFormat);
            $(`#product-select`).append(productDropdown);
            // 4. remove d-none class of member-add
            $('.member-add').removeClass('d-none');
        }
    }

    function insertMember(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            let member = $(this).val();
            let product = $modal.find('#insert-product-name').val();
            // 1. api insert member
            let str = showModalMember(member); // requires member id for deletion to work
            let str2 = showMember(member);
            $('#member-list').append(str);
            $(`#all-product-list #${product}`).append(str2);
            $('#insert-member-name').val('');
        }
    }

    function deleteProduct() {
        let name = $(this).attr('name');
        $(this).parents(`[productName="${name}"]`).remove();
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
        $modal.find('#insert-product-name').val('');
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

    function showMember(name) {
        $jqDoc.on('click', '.input-group-prepend', () => {
            $(`.form-control[name="${name}-date-input"]`).focus();
            $(`#${name}-date-input`).datetimepicker(timePickerInitOpts);
        });
        let currentDate = new Date();
        return `<div class="pb-3" memberName="${name}">
            <h5><b>姓名</b>：${name}</h5>
            <div id="accordion">
                <div class="card">
                    <div class="card-header pb-0 pt-3" id="time">
                    <h5 class="mx-2 my-0">
                        <div class="form-group row">
                            <div class="col-2">
                                <button class="btn btn-link" data-toggle="collapse" data-target="#${name}" aria-expanded="true" aria-controls="${name}">
                                    時間表
                                </button>
                            </div>
                            <div class="col-10">
                                <div class="input-group date" id="${name}-date-input">
                                    <span class="input-group-addon input-group-prepend">
                                        <span class="input-group-text">
                                            <i class="far fa-calendar-alt"></i>
                                        </span>
                                    </span>
                                    <input type="text" class="form-control" value="${toDatetimeLocal(currentDate)}" name="${name}-date-input" placeholder="請選擇日期" />
                                </div>
                            </div>
                        </div>
                    </h5>
                </div>
                <div id="${name}" class="p-3 collapse" aria-labelledby="time" data-parent="#accordion">
                    <div class ="day-view-container">
                        <div class="timings">
                            <div> <span> 12:00 </span>AM </div>
                            <div> 12:30 </div>
                            <div> <span> 1:00 </span>AM </div>
                            <div> 1:30 </div>
                            <div> <span> 2:00 </span>AM </div>
                            <div> 2:30 </div>
                            <div> <span> 3:00 </span>AM </div>
                            <div> 3:30 </div>
                            <div> <span> 4:00 </span>AM </div>
                            <div> 4:30 </div>
                            <div> <span> 5:00 </span>AM </div>
                            <div> 5:30 </div>
                            <div> <span> 6:00 </span>AM </div>
                            <div> 6:30 </div>
                            <div> <span> 7:00 </span>AM </div>
                            <div> 7:30 </div>
                            <div> <span> 8:00 </span>AM </div>
                            <div> 8:30 </div>
                            <div> <span> 9:00 </span>AM </div>
                            <div> 9:30 </div>
                            <div> <span> 10:00 </span>AM </div>
                            <div> 10:30 </div>
                            <div> <span> 11:00 </span>AM </div>
                            <div> 11:30 </div>
                            <div> <span> 12:00 </span>PM </div>
                            <div> 12:30 </div>
                            <div> <span> 1:00 </span>PM </div>
                            <div> 1:30 </div>
                            <div> <span> 2:00 </span>PM </div>
                            <div> 2:30 </div>
                            <div> <span> 3:00 </span>PM </div>
                            <div> 3:30 </div>
                            <div> <span> 4:00 </span>PM </div>
                            <div> 4:30 </div>
                            <div> <span> 5:00 </span>PM </div>
                            <div> 5:30 </div>
                            <div> <span> 6:00 </span>PM </div>
                            <div> 6:30 </div>
                            <div> <span> 7:00 </span>PM </div>
                            <div> 7:30 </div>
                            <div> <span> 8:00 </span>PM </div>
                            <div> 8:30 </div>
                            <div> <span> 9:00 </span>PM </div>
                            <div> 9:30 </div>
                            <div> <span> 10:00 </span>PM </div>
                            <div> 10:30 </div>
                            <div> <span> 11:00 </span>PM </div>
                            <div> 11:30 </div>
                        </div>
                        <div class="days" id="events">
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
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
            $productSelector.find('[value="new"]').attr('selected', true);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });
})();
