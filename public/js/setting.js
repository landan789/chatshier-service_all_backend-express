/// <reference path='../../typings/client/index.d.ts' />

(function() {
    const SOCKET_NAMESPACE = '/chatshier';
    const SOCKET_SERVER_URL = window.CHATSHIER.URL.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    const SOCKET_EVENTS = window.SOCKET_EVENTS;
    const socket = io(SOCKET_SERVER_URL);

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const WECHAT = 'WECHAT';
    const CHATSHIER = 'CHATSHIER';
    const ACTIVE = '啟用';
    const INACTIVE = '未啟用';

    const NAME_WAS_EMPTY = '1.7';
    const NO_PERMISSION_CODE = '3.16';
    const PASSWORD_WAS_INCORRECT = '2.2';
    const NEW_PASSWORD_WAS_INCONSISTENT = '2.4';

    const ECPAY = 'ECPAY';
    const SPGATEWAY = 'SPGATEWAY';

    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsFields} */
    let appsFields = {};
    /** @type {Chatshier.Models.Groups} */
    let groups = {};
    /** @type {Chatshier.Models.Users} */
    let users = {};

    let api = window.restfulAPI;
    let translate = window.translate;
    let gClientHlp = window.googleClientHelper;
    let fbHlp = window.facebookHelper;
    let transJson = {};

    let $settingModal = $('#setting-modal');

    let userId;
    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    fbHlp.init();

    translate.ready.then(function(json) {
        transJson = json;
    });

    // 動態載入 gapi
    gClientHlp.loadAPI().then(function() {
        return gClientHlp.init(window.CHATSHIER.GOOGLE.CALENDAR);
    }).then(function(isSignedIn) {
        let $gCalendarRow = $('#gcalendar_row');
        $gCalendarRow.removeClass('d-none');

        let $gCalendarCbx = $gCalendarRow.find('#gcalendar_cbx');
        $gCalendarCbx.prop('checked', isSignedIn);
        $gCalendarCbx.on('change', function(ev) {
            let elem = ev.target;
            if (elem.checked) {
                elem.checked = !elem.checked;
                return gClientHlp.signIn().then(function() {
                    elem.checked = true;
                }).catch(function() {
                    elem.checked = false;
                });
            } else {
                elem.checked = !elem.checked;
                return gClientHlp.signOut().then(function() {
                    elem.checked = false;
                }).catch(function() {
                    elem.checked = true;
                });
            }
        });
    });

    // ACTIONS
    $(document).on('click', '.edit-app-btn', editOneApp);
    $(document).on('click', '.remove-app-btn', removeOneApp);
    $(document).on('click', '.app-webhook-id', copyWebhookToClipboard);

    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    $(document).on('click', '#changePasswordBtn', function(ev) {
        let $changePasswordCollapse = $('#changePasswordCollapse');
        $(ev.target).text($changePasswordCollapse.hasClass('show') ? '展開' : '關閉');

        if ($changePasswordCollapse.hasClass('show')) {
            let $changePasswordForm = $changePasswordCollapse.find('.change-password-form');
            $changePasswordForm.find('[name="password"]').val('');
            $changePasswordForm.find('[name="newPassword"]').val('');
            $changePasswordForm.find('[name="newPasswordCfm"]').val('');
        }
        $changePasswordCollapse.collapse('toggle');
    });

    $(document).on('submit', '.change-password-form ', function(ev) {
        ev.preventDefault();

        let $changePasswordForm = $(ev.target);
        let $password = $changePasswordForm.find('[name="password"]');
        let $newPassword = $changePasswordForm.find('[name="newPassword"]');
        let $newPasswordCfm = $changePasswordForm.find('[name="newPasswordCfm"]');
        let password = $password.val();
        let newPassword = $newPassword.val();
        let newPasswordCfm = $newPasswordCfm.val();

        if (!password) {
            return $.notify('舊密碼不能為空', { type: 'warning' });
        } else if (!newPassword) {
            return $.notify('新密碼不能為空', { type: 'warning' });
        } else if (!newPasswordCfm || newPassword !== newPasswordCfm) {
            return $.notify('輸入的新密碼不一致', { type: 'warning' });
        }

        let user = {
            password: password,
            newPassword: newPassword,
            newPasswordCfm: newPasswordCfm
        };
        return api.sign.changePassword(userId, user).then(function(resJson) {
            let jwt = resJson.jwt;
            window.localStorage.setItem('jwt', jwt);
            api.setJWT(jwt);
            window.jwtRefresh();

            $password.val('');
            $newPassword.val('');
            $newPasswordCfm.val('');
            $('#changePasswordCollapse').collapse('hide');
            $('#changePasswordBtn').text('展開');

            return $.notify('密碼變更成功', { type: 'success' });
        }).catch(function(err) {
            switch (err.code) {
                case PASSWORD_WAS_INCORRECT:
                    return $.notify('輸入的舊密碼不正確', { type: 'danger' });
                case NEW_PASSWORD_WAS_INCONSISTENT:
                    return $.notify('輸入的新密碼不一致', { type: 'danger' });
                default:
                    return $.notify('密碼變更失敗', { type: 'danger' });
            }
        });
    });

    $settingModal.on('hidden.bs.modal', clearSettingModalBody);

    $settingModal.on('click', '#setting-modal-submit-btn', function(ev) {
        ev.preventDefault();

        let $modalContent = $(ev.target).parents('.modal-content');
        let type = $modalContent.find('#type').text();

        // updateProfile, updateApp
        switch (type) {
            case 'updateProfile':
                profSubmitBasic();
                break;
            case 'updateApp':
                let $appForm = $modalContent.find('.app-form');
                let appId = $appForm.attr('app-id');
                let app = apps[appId];
                let appType = app.type;

                if (LINE === appType) {
                    let name = $appForm.find('input[name="appName"]').val();
                    let id1 = $appForm.find('input[name="appId1"]').val();
                    let secret = $appForm.find('input[name="appSecret"]').val();
                    let token1 = $appForm.find('input[name="appToken1"]').val();

                    let putApp = {
                        name: name,
                        id1: id1,
                        secret: secret,
                        token1: token1,
                        type: app.type
                    };
                    updateOneApp(appId, putApp); // 點送出後更新APP的資訊
                } else if (FACEBOOK === appType) {
                    let name = $appForm.find('input[name="appName"]').val();
                    let id1 = $appForm.find('input[name="appId1"]').val();
                    let id2 = $appForm.find('input[name="appId2"]').val();
                    let secret = $appForm.find('input[name="appSecret"]').val();
                    let token1 = $appForm.find('input[name="appToken1"]').val();
                    let token2 = $appForm.find('input[name="appToken2"]').val();

                    let putApp = {
                        name: name,
                        id1: id1,
                        id2: id2,
                        secret: secret,
                        token1: token1,
                        token2: token2,
                        type: app.type
                    };
                    updateOneApp(appId, putApp); // 點送出後更新APP的資訊
                } else if (WECHAT === appType) {
                    let name = $appForm.find('input[name="appName"]').val();
                    let id1 = $appForm.find('input[name="appId1"]').val();
                    let secret = $appForm.find('input[name="appSecret"]').val();

                    let putApp = {
                        name: name,
                        id1: id1,
                        secret: secret,
                        type: app.type
                    };
                    updateOneApp(appId, putApp);
                }
                break;
            default:
                break;
        }
    });

    $('#userProfileEdit').on('click', function() {
        let user = users[userId];
        let userName = user.name;
        let company = user.company || '';
        let phone = user.phone || '';
        let address = user.address || '';

        let str =
            '<form id="userForm">' +
                '<div id="type" class="d-none">updateProfile</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">顯示名稱:</label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" value="' + userName + '" name="userName" />' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">公司名稱:</label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" value="' + company + '" name="userCompany" />' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">手機: </label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="tel" value="' + phone + '" name="userPhone"/>' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">地址: </label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" value="' + address + '" name="userAddress"/>' +
                    '</div>' +
                '</div>' +
            '</form>';
        $settingModal.find('.modal-body').append(str);
    });

    // payment modal 處理
    (function() {
        let $paymentModal = $('#paymentModal');
        let $paymentSelect = $paymentModal.find('#paymentSelect');
        let $paymentItemsContainer = $paymentModal.find('#paymentItemsContainer');

        /** @type {Chatshier.Models.AppsPayments} */
        let appsPayments = {};
        /** @type {string} */
        let selectAppId;
        /** @type {string} */
        let paymentId;

        $paymentModal.on('show.bs.modal', loadAppPayment);
        $paymentModal.on('submit', '#paymentSettingForm', replacePayment);
        $paymentSelect.on('change', onChangePayment);
        $paymentItemsContainer.on('change', '#issueInvoiceCbx', appendInvoiceRows);

        function loadAppPayment(ev) {
            let $targetBtn = $(ev.relatedTarget);
            let appId = $targetBtn.attr('app-id');
            selectAppId = appId;
            paymentId = void 0;

            $paymentSelect.val('');
            $paymentItemsContainer.empty();

            return Promise.resolve().then(function() {
                if (!appsPayments[appId]) {
                    return api.appsPayments.findAll(appId, userId).then(function(resJson) {
                        let _appsPayments = resJson.data;
                        if (!_appsPayments[appId]) {
                            return {};
                        }
                        appsPayments[appId] = { payments: {} };
                        Object.assign(appsPayments[appId].payments, _appsPayments[appId].payments);
                        return appsPayments[appId].payments;
                    });
                }
                return appsPayments[appId].payments;
            }).then(function(payments) {
                paymentId = Object.keys(payments).shift();
                if (!paymentId) {
                    return;
                }

                /** @type {Chatshier.Models.Payment} */
                let payment = payments[paymentId];
                $paymentSelect.val(payment.type);
                onChangePayment();

                $paymentItemsContainer.find('[name="paymentMerchantId"]').val(payment.merchantId);
                $paymentItemsContainer.find('[name="paymentHashKey"]').val(payment.hashKey);
                $paymentItemsContainer.find('[name="paymentHashIV"]').val(payment.hashIV);

                let $issueInvoiceCbx = $paymentItemsContainer.find('[name="canIssueInvoice"]');
                $issueInvoiceCbx.prop('checked', !!payment.canIssueInvoice);

                if (payment.canIssueInvoice) {
                    appendInvoiceRows({ target: $issueInvoiceCbx.get(0) });
                    $paymentItemsContainer.find('[name="invoiceMerchantId"]').val(payment.invoiceMerchantId);
                    $paymentItemsContainer.find('[name="invoiceHashKey"]').val(payment.invoiceHashKey);
                    $paymentItemsContainer.find('[name="invoiceHashIV"]').val(payment.invoiceHashIV);
                }
            });
        }

        function onChangePayment() {
            let $paymentElems = $(
                '<label class="col-form-label font-weight-bold">交易商店設定</label>' +
                '<div class="card">' +
                    '<div class="card-body">' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">商店代號:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" name="paymentMerchantId" placeholder="在此貼上 商店代號" required />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">金流服務 Hash Key:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" name="paymentHashKey" placeholder="在此貼上 Hash Key" required />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">金流服務 Hash IV:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" name="paymentHashIV" placeholder="在此貼上 Hash IV" required />' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="mt-3 form-group">' +
                    '<div class="form-check">' +
                        '<input class="form-check-input" type="checkbox" name="canIssueInvoice" id="issueInvoiceCbx" />' +
                        '<label class="form-check-label" for="issueInvoiceCbx">具有開立發票之服務</label>' +
                    '</div>' +
                '</div>'
            );

            $paymentItemsContainer.empty().append($paymentElems);
        }

        function appendInvoiceRows(ev) {
            let paymentType = $paymentSelect.val();
            let $targetCbx = $(ev.target);
            let $rowOfCbx = $targetCbx.parents('.form-group');

            if (!$targetCbx.prop('checked')) {
                $paymentItemsContainer.find('.issue-invoice').remove();
                return;
            }

            /** @type {JQuery<Element> | void} */
            let $issueInvoiceElems;
            switch (paymentType) {
                case ECPAY:
                    $issueInvoiceElems = $(
                        '<label class="col-form-label font-weight-bold issue-invoice">' +
                            '<a href="https://www.ecpay.com.tw/Business/invoice" target="_blank">綠界 ECPay 電子發票服務</a>' +
                        '</label>' +
                        '<div class="card issue-invoice">' +
                            '<div class="card-body">' +
                                '<p class="text-danger small">請確定商店確實具有開立電子發票之服務，否則將無法正常開立發票</p>' +
                                '<div class="form-group">' +
                                    '<label class="col-form-label font-weight-bold">電子發票服務 Hash Key:</label>' +
                                    '<div class="input-container">' +
                                        '<input class="form-control" type="text" name="invoiceHashKey" placeholder="在此貼上 Hash Key" required />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label class="col-form-label font-weight-bold">電子發票服務 Hash IV:</label>' +
                                    '<div class="input-container">' +
                                        '<input class="form-control" type="text" name="invoiceHashIV" placeholder="在此貼上 Hash IV" required/>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                case SPGATEWAY:
                    $issueInvoiceElems = $(
                        '<label class="col-form-label font-weight-bold issue-invoice">' +
                            '<a href="https://inv.pay2go.com/" target="_blank">智付寶 Pay2Go 電子發票服務</a>' +
                        '</label>' +
                        '<div class="card issue-invoice">' +
                            '<div class="card-body">' +
                                '<p class="text-danger small">請確定商店確實具有開立電子發票之服務，否則將無法正常開立發票</p>' +
                                '<div class="form-group">' +
                                    '<label class="col-form-label font-weight-bold">電子發票商店代號:</label>' +
                                    '<div class="input-container">' +
                                        '<input class="form-control" type="text" name="invoiceMerchantId" placeholder="在此貼上 商店代號" required />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label class="col-form-label font-weight-bold">電子發票商店 Hash Key:</label>' +
                                    '<div class="input-container">' +
                                        '<input class="form-control" type="text" name="invoiceHashKey" placeholder="在此貼上 Hash Key" required />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label class="col-form-label font-weight-bold">電子發票商店 Hash IV:</label>' +
                                    '<div class="input-container">' +
                                        '<input class="form-control" type="text" name="invoiceHashIV" placeholder="在此貼上 Hash IV" required/>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                default:
                    break;
            }

            $issueInvoiceElems && $issueInvoiceElems.insertAfter($rowOfCbx);
        }

        function replacePayment(ev) {
            ev.preventDefault();

            /** @type {Chatshier.Models.Payment} */
            let newPayment = {
                type: $paymentSelect.val() || '',
                merchantId: $paymentItemsContainer.find('[name="paymentMerchantId"]').val() || '',
                hashKey: $paymentItemsContainer.find('[name="paymentHashKey"]').val() || '',
                hashIV: $paymentItemsContainer.find('[name="paymentHashIV"]').val() || '',
                canIssueInvoice: $paymentItemsContainer.find('[name="canIssueInvoice"]').prop('checked')
            };

            if (newPayment.canIssueInvoice) {
                newPayment.invoiceHashKey = $paymentItemsContainer.find('[name="invoiceHashKey"]').val() || '';
                newPayment.invoiceHashIV = $paymentItemsContainer.find('[name="invoiceHashIV"]').val() || '';

                switch (newPayment.type) {
                    case ECPAY:
                        newPayment.invoiceMerchantId = newPayment.merchantId;
                        break;
                    case SPGATEWAY:
                        newPayment.invoiceMerchantId = $paymentItemsContainer.find('[name="invoiceMerchantId"]').val() || '';
                        break;
                    default:
                        newPayment.invoiceMerchantId = '';
                        break;
                }
            }

            return Promise.resolve().then(function() {
                if (paymentId) {
                    return api.appsPayments.update(selectAppId, paymentId, userId, newPayment);
                }
                return api.appsPayments.insert(selectAppId, userId, newPayment);
            }).then(function(resJson) {
                let _appsPayments = resJson.data;
                if (!appsPayments[selectAppId]) {
                    appsPayments[selectAppId] = { payments: {} };
                }
                Object.assign(appsPayments[selectAppId].payments, _appsPayments[selectAppId].payments);

                $.notify('設定成功', { type: 'success' });
                $paymentModal.modal('hide');
            }).catch(function() {
                $.notify('發生錯誤，設定失敗', { type: 'danger' });
            });
        }
    })();

    Promise.all([
        findAllGroups(),
        findUserProfile()
    ]).then(function() {
        // 列出所有設定的APPs
        return findAllApps();
    }).then(function() {
        $('.app-container .card-collapse').first().collapse('show');
        return new Promise(function(resolve) {
            socket.emit(SOCKET_EVENTS.USER_REGISTRATION, userId, resolve);
        });
    });

    let $appAddModal = $('#appAddModal');
    let $groupAddModal = $('#groupAddModal');

    $appAddModal.on('click', '#appAddModalSubmitBtn', function(ev) {
        let $appAddModalSubmitBtn = $(ev.target).attr('disabled', true);
        let type = $appAddModal.find('#appTypeSelect option:selected').val();

        let app = {
            type: type,
            group_id: $appAddModal.find('.modal-body form').attr('group-id'),
            name: $appAddModal.find('[name="appName"]').val(),
            id1: $appAddModal.find('[name="appId1"]').val(),
            secret: $appAddModal.find('[name="appSecret"]').val()
        };

        switch (type) {
            case LINE:
                app.token1 = $appAddModal.find('[name="appToken1"]').val();
                break;
            case FACEBOOK:
                app.id2 = $appAddModal.find('[name="appId2"]').val();
                app.token1 = $appAddModal.find('[name="appToken1"]').val();
                app.token2 = $appAddModal.find('[name="appToken2"]').val();
                break;
            case WECHAT:
            default:
                break;
        }

        return insertOneApp(app).then(() => {
            $appAddModalSubmitBtn.removeAttr('disabled');
        });
    });

    $appAddModal.on('click', '.fb-import-button', function(ev) {
        let groupId = $(ev.target).parents('.fb-sdk-item').attr('group-id');
        return fbHlp.signInForPages().then(function(res) {
            if (!res || (res && res.status !== 'connected')) {
                return;
            }

            return fbHlp.getFanPages().then(function(res) {
                // 取得 fb 用戶的所有可管理的粉絲專頁後
                // 濾除已經加入的粉絲專頁
                let fanPages = res.data || [];
                fanPages = fanPages.filter(function(fanPage) {
                    let canLink = true;
                    for (let appId in apps) {
                        let app = apps[appId];
                        if (!(FACEBOOK === app.type && app.group_id === groupId)) {
                            continue;
                        }

                        if (app.id1 === fanPage.id) {
                            canLink = false;
                            break;
                        }
                    }
                    return canLink;
                });

                if (0 === fanPages.length) {
                    $.notify('沒有可進行連結的粉絲專頁', { type: 'warning' });
                    return fanPages;
                }

                return Promise.all(fanPages.map(function(fanPage) {
                    // 抓取粉絲專頁的大頭貼(用於選取時顯示)
                    return fbHlp.getFanPagesPicture(fanPage.id, fanPage.access_token);
                })).then(function(fanPagePics) {
                    // 將可進行連結的粉絲專頁提供給使用者選取
                    return new Promise(function(resolve) {
                        function appAddModalHidden() {
                            $appAddModal.off('hidden.bs.modal', appAddModalHidden);
                            resolve();
                        }
                        $appAddModal.on('hidden.bs.modal', appAddModalHidden);
                        $appAddModal.modal('hide');
                    }).then(function() {
                        return fanPages.map(function(fanPages, i) {
                            let fanPagePic = fanPagePics[i].data;
                            return (
                                '<div class="form-group form-check">' +
                                    '<label class="form-check-label">' +
                                        '<input class="form-check-input" type="checkbox" value="' + i + '" />' +
                                        '<img class="mx-2 fb-fanpage-picture" src="' + fanPagePic.url + '" alt="" />' +
                                        fanPages.name +
                                    '</label>' +
                                '</div>'
                            );
                        }).join('');
                    });
                }).then(function(modalBodyHtml) {
                    let $selectPagesModal = createModal(modalBodyHtml, '選取連結的粉絲專頁');

                    return new Promise(function(resolve) {
                        let $btnSubmit = $selectPagesModal.find('.btn-submit');
                        let closeModal = function(selectedFanPages) {
                            $btnSubmit.off('click');
                            $selectPagesModal.off('hide.bs.modal');
                            resolve(selectedFanPages || []);
                        };

                        $selectPagesModal.on('hide.bs.modal', function() {
                            closeModal([]);
                        });

                        $btnSubmit.on('click', function() {
                            $selectPagesModal.off('hide.bs.modal');
                            $selectPagesModal.modal('hide');

                            let $checkedPages = $selectPagesModal.find('.form-check-input:checked');
                            let selectedFanPages = [];
                            $checkedPages.each(function() {
                                let fanpageIdx = parseInt($(this).val());
                                selectedFanPages.push(fanPages[fanpageIdx]);
                            });
                            closeModal(selectedFanPages);
                        });
                        $selectPagesModal.modal('show');
                    });
                });
            }).then(function(selectedFanPages) {
                if (0 === selectedFanPages.length) {
                    return;
                }

                // 使用者選取完欲連結的粉絲專頁後，將資料轉換為 Chatshier app 資料
                let appsList = selectedFanPages.map(function(fanPage) {
                    let app = {
                        group_id: groupId,
                        type: FACEBOOK,
                        name: fanPage.name,
                        id1: fanPage.id,
                        token2: fanPage.access_token
                    };
                    return app;
                });
                let responses = [];

                // 未處理 bug: 使用 Promise.all 會造成 group 的 app_ids 只會新增一筆
                function nextRequest(i) {
                    if (i >= appsList.length) {
                        return Promise.resolve(responses);
                    }

                    let app = appsList[i];
                    return api.apps.insert(userId, app).then((resJson) => {
                        let _apps = resJson.data;
                        for (let appId in _apps) {
                            apps[appId] = _apps[appId];
                            groups[groupId].app_ids.push(appId);
                            generateAppItem(appId, apps[appId]);
                        }
                        $('[data-toggle="tooltip"]').tooltip();
                        responses.push(resJson);
                        return nextRequest(i + 1);
                    });
                }
                return nextRequest(0).then(function() {
                    $.notify('已成功連結了 ' + selectedFanPages.length + ' 個粉絲專頁', { type: 'success' });
                });
            });
        }).then(function(res) {
            $appAddModal.modal('hide');
            if (!res) {
                return;
            }
            return fbHlp.signOut();
        });
    });

    $appAddModal.on('show.bs.modal', function(ev) {
        let groupId = $(ev.relatedTarget).attr('group-id');
        let $appAddForm = $appAddModal.find('.modal-body form');
        $appAddForm.attr('group-id', groupId);
        $appAddForm.find('[name="appName"]').val('');

        let itemsHtml = {
            [LINE]: (
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appName" placeholder="請輸入名稱" />' +
                    '</div>' +
                '</div>' +
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">Channel ID:</label>' +
                    '<img class="img-fluid my-1" src="./image/apps-1.jpg"/>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appId1" placeholder="在此貼上您的 Channel ID" />' +
                    '</div>' +
                '</div>' +
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">Channel secret: </label>' +
                    '<img class="img-fluid my-1" src="./image/apps-2.jpg"/>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appSecret" placeholder="在此貼上您的 Channel secret" />' +
                    '</div>' +
                '</div>' +
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">Channel access token:</label>' +
                    '<img class="img-fluid my-1" src="./image/apps-3.jpg"/>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appToken1" placeholder="在此貼上您的 Channel access token" />' +
                    '</div>' +
                '</div>' +
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">Use webhooks:</label>' +
                    '<img class="img-fluid my-1" src="./image/apps-4.jpg"/>' +
                    '<div class="">' +
                        '<span class="pl-3 text-muted">請至 Line Developer 啟用 webhook</span>' +
                    '</div>' +
                '</div>' +
                '<hr class="mt-5 mb-0"/>' +
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">webhook URL:</label>' +
                    '<img class="img-fluid my-1" src="./image/apps-5.jpg"/>' +
                    '<div class="">' +
                        '<span class="pl-3 text-muted">請至 Line Developer 貼上 webhook URL</span>' +
                    '</div>' +
                '</div>'
            ),
            [FACEBOOK]: (
                '<div class="form-group fb-sdk-item" group-id="' + groupId + '">' +
                    '<button type="button" class="px-4 py-2 text-center fb-import-button">' +
                        '<i class="fab fa-facebook-square fa-fw"></i>' +
                        '<span>連結粉絲專頁</span>' +
                    '</button>' +
                '</div>'
            ),
            [WECHAT]: (
                '<div class="form-group">' +
                    '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appName" placeholder="請輸入名稱" />' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">App ID:</label>' +
                        '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appId1" placeholder="請至 Wechat Developers 查詢" />' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="col-form-label">App Secret:</label>' +
                    '<div class="input-container">' +
                        '<input class="form-control" type="text" name="appSecret" placeholder="請至 Wechat Developers 查詢" />' +
                    '</div>' +
                '</div>'
            )
        };

        let $appTypeSelect = $appAddForm.find('#appTypeSelect');
        let $appItemsContainer = $appAddForm.find('#appItemsContainer');
        let selectType = $appTypeSelect.val();
        $appItemsContainer.html(itemsHtml[selectType]);

        function appTypeChange(ev) {
            selectType = ev.target.value;
            $appItemsContainer.html(itemsHtml[selectType] || '');
        }
        $appTypeSelect.off('change').on('change', appTypeChange);
        appTypeChange({ target: $appTypeSelect.get(0) });
    });

    $(document).on('change', '#hide-agent-name', function() {
        let appId = $(this).attr('app-id');
        let status = $(this).val();
        let putApp;
        if (status === 'show') {
            putApp = { hideAgentName: true };
            $(this).attr('checked', true);
            $(this).val('hide');
            updateOneApp(appId, putApp);
        } else {
            putApp = { hideAgentName: false };
            $(this).removeAttr('checked');
            $(this).val('show');
            updateOneApp(appId, putApp);
        }
    });

    function findAllGroups() {
        $('#addGroupNameAppBtn').attr('disabled', true);
        return api.groups.findAll(userId).then(function(resJson) {
            $('#addGroupNameAppBtn').removeAttr('disabled');
            groups = resJson.data;
            if (groups && 0 === Object.keys(groups).length) {
                return;
            };

            for (let groupId in groups) {
                if (groups[groupId].isDeleted) {
                    continue;
                }
                showGroupContent(groupId, groups[groupId]);
            }
        });
    }

    function insertOneGroup() {
        let name = $('input[name="groupAddName"]').val();
        let groupName = { name };
        return api.groups.insert(userId, groupName).then(function(resJson) {
            let groups = resJson.data;
            $groupAddModal.modal('hide');
            for (let groupId in groups) {
                showGroupContent(groupId, groups[groupId]);
            }
        });
    }

    function findAllApps() {
        return api.apps.findAll(userId).then(function(resJson) {
            apps = resJson.data;
            for (let appId in apps) {
                if (apps[appId].isDeleted || CHATSHIER === apps[appId].type) {
                    continue;
                }
                generateAppItem(appId, apps[appId]);
            }
            $('.chsr.nav-pills .nav-link:first-child').tab('show');
            $('.app-add-btn').removeAttr('disabled');
            $('[data-toggle="tooltip"]').tooltip();
        });
    }

    function editOneApp(ev) {
        let appId = $(this).attr('app-id');

        return api.apps.findOne(appId, userId).then(function(resJson) {
            let _apps = resJson.data;
            apps[appId] = _apps[appId];
            generateEditAppForm(appId, apps[appId]);
        });
    }

    function insertOneApp(app) {
        return api.apps.insert(userId, app).then(function(resJson) {
            $appAddModal.modal('hide');

            $.notify('新增成功!', { type: 'success' });
            let _apps = resJson.data;
            for (let appId in _apps) {
                apps[appId] = _apps[appId];
                generateAppItem(appId, _apps[appId]);
            }
            $('[data-toggle="tooltip"]').tooltip();
        }).catch((resJson) => {
            $appAddModal.modal('hide');
            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
            }
            if (!resJson.status) {
                $.notify('新增失敗', { type: 'danger' });
            }
        });
    }

    function updateOneApp(appId, appData) {
        return api.apps.update(appId, userId, appData).then(function(resJson) {
            let _apps = resJson.data;
            apps[appId] = _apps[appId];

            let app = apps[appId];
            $('.apps-body .card[app-id="' + appId + '"] .app-name').text(app.name);

            $settingModal.modal('hide');
            $.notify('更新成功!', { type: 'success' });
        }).catch((resJson) => {
            if (!resJson.status) {
                $settingModal.modal('hide');
                $.notify('更新失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $settingModal.modal('hide');
                $.notify('無此權限', { type: 'danger' });
            }
        });
    }

    function removeOneApp(ev) {
        let appId = $(this).attr('app-id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            return api.apps.remove(appId, userId).then(function() {
                delete apps[appId];
                $('.apps-body .card[app-id="' + appId + '"]').remove();

                $.notify('刪除成功!', { type: 'success' });
            }).catch((resJson) => {
                if (!resJson.status) {
                    $.notify('刪除失敗', { type: 'danger' });
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                }
            });
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            let isOK = false;
            let $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }

    /**
     * @param {string} groupId
     * @param {any} group
     */
    function showGroupContent(groupId, group) {
        groups[groupId] = group;

        let groupStr = (
            '<div class="group-tab" role="tab">' +
                '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '-group" aria-expanded="true" aria-controls="' + groupId + '-group">' +
                    (group.name || '') +
                '</a>' +
            '</div>' +
            '<div id="' + groupId + '-group" class="px-3 py-2 card-collapse collapse">' +
                '<button type="button" class="btn btn-light btn-border mt-2 mb-3 app-add-btn" group-id="' + groupId + '" data-toggle="modal" data-target="#appAddModal">' +
                    '<i class="fas fa-plus fa-fw"></i>' +
                    '<span>新增聊天機器人</span>' +
                '</button>' +
                '<div class="apps-body card-columns" group-id="' + groupId + '"></div>' +
            '</div>'
        );
        $('#apps .app-container').append(groupStr);
    }

    function generateAppItem(appId, app) {
        let baseWebhookUrl = window.CHATSHIER.URL.webhookUrl;
        let itemHtml = (
            '<div class="shadow card text-dark bot-item" app-id="' + appId + '">' +
                '<div class="p-3 card-body">' +
                    '<div class="mb-3 d-flex align-items-center">' +
                        '<i class="mr-2 fas fa-user-astronaut fa-fw fa-3x text-chsr"></i>' +
                        '<span class="font-weight-bolde d-inline-grid">' +
                            '<div class="app-name text-dark font-weight-bold">' + app.name + '</div>' +
                            '<div class="app-id1 font-weight-light">' + app.id1 + '</div>' + 
                        '</span>' +
                    '</div>' +
                    (function() {
                        switch (app.type) {
                            case LINE:
                                return (
                                    '<div class="my-5 d-flex justify-content-center align-items-center">' +
                                        '<i class="fab fa-line fa-fw fa-6x line-color"></i>' +
                                    '</div>'
                                );
                            case FACEBOOK:
                                return (
                                    '<div class="my-5 d-flex justify-content-center align-items-center">' +
                                        '<span class="position-relative">' +
                                            '<i class="fab fa-facebook-messenger fa-fw fa-4x fb-messsenger-color position-absolute"></i>' +
                                            '<i class="fab fa-facebook-messenger fa-fw fa-4x text-white pseudo position-absolute"></i>' +
                                            '<i class="fas fa-circle fa-fw fa-4x text-white fb-pseudo-block position-absolute"></i>' +
                                            '<i class="fab fa-facebook fa-fw fa-6x fb-color"></i>' +
                                        '</span>' +
                                    '</div>'
                                );
                            case WECHAT:
                                return (
                                    '<div class="my-5 d-flex justify-content-center align-items-center">' +
                                        '<span class="position-relative">' +
                                            '<i class="fab fa-weixin fa-fw fa-6x wechat-color position-absolute"></i>' +
                                        '</span>' +
                                    '</div>'
                                );
                            default:
                                return '';
                        }
                    })() +

                    '<div class="my-3">' +
                        '<button type="button" class="mr-1 btn btn-light btn-border edit-app-btn" app-id="' + appId + '" data-toggle="modal" data-target="#setting-modal">' +
                            '<i class="fas fa-edit"></i>' +
                        '</button>' +
                        '<button class="ml-1 btn btn-danger remove-app-btn" app-id="' + appId + '">' +
                            '<i class="fas fa-trash-alt"></i>' +
                        '</button>' +
                        '<div class="form-check mt-3">'+
                            '<input class="form-check-input" type="checkbox" value="' + (app.hideAgentName ? 'hide' : 'show') + '" id="hide-agent-name" app-id="' + appId + '" ' + (app.hideAgentName ? 'checked' : '') + '/>' +
                            '<label class="form-check-label">' +
                                '回復訊息不顯示專員名稱' +
                            '</label>'+
                        '</div>' +
                    '</div>' +

                    '<label class="font-weight-bold">Webhook URL:</label>' +
                        '<div class="text-muted-muted app-webhook-id" app-type="' + app.type + '" ' + (FACEBOOK === app.type ? '' : 'data-toggle="tooltip"') +  ' data-placement="top" title="點擊複製至剪貼簿">' +
                        ( FACEBOOK === app.type ? '--' : createWebhookUrl(baseWebhookUrl, app.webhook_id)) +
                    '</div>' +

                    '<div class="position-absolute w-100 p-3 d-flex justify-content-between footer-buttons">' +
                        '<div class="w-100" data-toggle="tooltip" data-placement="top" title="設定金流服務">' +
                            '<button type="button" class="mr-1 btn btn-block set-payment-btn" app-id="' + appId + '" data-toggle="modal" data-target="#paymentModal">' +
                                '<i class="fas fa-hand-holding-usd fa-fw text-muted fa-1p5x"></i>' +
                            '</button>' +
                        '</div>' +
                        (FACEBOOK !== app.type ? '<div class="w-100" data-toggle="tooltip" data-placement="top" title="編輯">' +
                            '<button type="button" class="mr-2 btn btn-block edit-app-btn" app-id="' + appId + '" data-toggle="modal" data-target="#setting-modal">' +
                                '<i class="far fa-edit text-muted fa-1p5x"></i>' +
                            '</button>' +
                        '</div>' : '') +
                        '<div class="w-100" data-toggle="tooltip" data-placement="top" title="刪除">' +
                            '<button class="btn btn-block remove-app-btn" app-id="' + appId + '">' +
                                '<i class="far fa-trash-alt text-muted fa-1p5x"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        itemHtml && $('.apps-body[group-id="' + app.group_id + '"]').append(itemHtml);
    }

    function generateEditAppForm(appId, app) {
        apps[appId] = app;

        let appHtml;
        switch (app.type) {
            case LINE:
                appHtml =
                    '<form class="app-form" app-id="' + appId + '" group-id="' + app.group_id + '">' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.name + '" name="appName" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">Channel ID:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.id1 + '" name="appId1" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">Channel Secret:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.secret + '" name="appSecret" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">Channel Access Token:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.token1 + '" name="appToken1" />' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            case FACEBOOK:
                appHtml =
                    '<form class="app-form" app-id="' + appId + '" group-id="' + app.group_id + '">' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">機器人名稱:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.name + '" name="appName" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">粉絲專頁 ID:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.id1 + '" name="appId1" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App ID:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.id2 + '" name="appId2" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App secret:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.secret + '" name="appSecret" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App client token:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.token1 + '" name="appToken1" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">Page token:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.token2 + '" name="appToken2" />' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            case WECHAT:
                appHtml =
                    '<form class="app-form" app-id="' + appId + '" group-id="' + app.group_id + '">' +
                        '<div class="form-group d-none">' +
                            '<label id="type" class="col-form-label font-weight-bold">updateApp</label>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App Name:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.name + '" name="appName" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App ID:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.id1 + '" name="appId1" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="col-form-label font-weight-bold">App secret:</label>' +
                            '<div class="input-container">' +
                                '<input class="form-control" type="text" value="' + app.secret + '" name="appSecret" />' +
                            '</div>' +
                        '</div>' +
                    '</form>';
                break;
            default:
                break;
        }
        appHtml && $settingModal.find('.modal-body').append(appHtml);
    }

    function clearSettingModalBody() {
        $settingModal.find('.modal-body').empty();
    }

    function findUserProfile() {
        return api.users.find(userId).then(function(resJson) {
            users = resJson.data;
            let user = users[userId];

            $('#prof-id').text(userId);
            $('.user-name .card-title').text(user.name);
            $('#prof-email').text(user.email);
            $('#prof-IDnumber').text(userId);
            $('#prof-company').text(user.company);
            $('#prof-phonenumber').text(user.phone);
            $('#prof-address').text(user.address);
        });
    }

    function profSubmitBasic() {
        let $userForm = $settingModal.find('#userForm');
        let userName = $userForm.find('input[name="userName"]').val();
        let company = $userForm.find('input[name="userCompany"]').val();
        let phone = $userForm.find('input[name="userPhone"]').val();
        let address = $userForm.find('input[name="userAddress"]').val();

        let putUser = {
            name: userName,
            company: company,
            phone: phone,
            address: address
        };

        let phoneRule = /^09\d{8}$/;
        if (phone && !phone.match(phoneRule)) {
            $settingModal.modal('hide');
            $.notify('手機格式錯誤，應為09XXXXXXXX', {type: 'danger'});
            return;
        }

        return api.users.update(userId, putUser).then(function(resJson) {
            let _users = resJson.data;
            Object.assign(users, _users);
            $settingModal.modal('hide');

            let _user = _users[userId];
            $('.user-name .card-title').text(_user.name);
            $('#prof-company').text(_user.company);
            $('#prof-phonenumber').text(_user.phone);
            $('#prof-address').text(_user.address);
        }).catch(function(err) {
            if (NAME_WAS_EMPTY === err.code) {
                $.notify('顯示名稱不能設為空', { type: 'danger' });
                return;
            }
            $.notify('更新失敗', { type: 'danger' });
        });
    }

    function createWebhookUrl(baseWebhookUrl, webhookId) {
        let webhookUrl = baseWebhookUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        return 'https://' + webhookUrl + '/' + webhookId;
    }

    function copyWebhookToClipboard(ev) {
        let text = ev.target.textContent;
        let appType = ev.target.getAttribute('app-type');

        // 由於 LINE Develop 的 webhook 設定會自動加上 https://
        // 因此自動去除 https:// 前輟
        if (LINE === appType) {
            text = text.replace(/^https?:\/\//, '');
        }

        let textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'absolute';
        textarea.style.left = '-99999px';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            $.notify('成功拷貝到剪貼簿', { type: 'success' });
        } catch (ex) {
            $.notify('無法拷貝到剪貼簿，請自行執行拷貝動作', { type: 'warning' });
        } finally {
            document.body.removeChild(textarea);
            textarea = void 0;
        }
    }

    /**
     * @param {string} [bodyHtml=""]
     * @param {string} [titleText=""]
     * @param {string} [cancelText="取消"]
     * @param {string} [submitText="確認"]
     * @return {JQuery<HTMLElement>}
     */
    function createModal(bodyHtml, titleText, cancelText, submitText) {
        bodyHtml = bodyHtml || '';
        titleText = titleText || '';
        cancelText = cancelText || '取消';
        submitText = submitText || '確認';

        let modalHtml = (
            '<div class="chsr modal fade" id="dynamicModal" tabindex="-1" role="dialog">' +
                '<div class="modal-dialog" role="document">' +
                    '<div class="modal-content">' +
                        (function() {
                            if (!titleText) {
                                return '';
                            }
                            return (
                                '<div class="modal-header">' +
                                    '<h4 class="modal-title">' + titleText + '</h4>' +
                                '</div>'
                            );
                        })() +
                        '<div class="modal-body">' + bodyHtml + '</div>' +
                        '<div class="modal-footer">' +
                            '<button type="button" class="btn btn-secondary" data-dismiss="modal">' + cancelText + '</button>' +
                            '<button type="button" class="btn btn-primary btn-submit">' + submitText + '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        let $docBody = $(document.body);
        $docBody.append(modalHtml);
        modalHtml = void 0;

        let $dynamicModal = $docBody.find('#dynamicModal');
        $dynamicModal.on('hidden.bs.modal', function() {
            $dynamicModal.off('hidden.bs.modal');
            $dynamicModal.remove();
            $docBody = $dynamicModal = void 0;
        });
        return $dynamicModal;
    }

    // ===============
    // #region 客戶分類條件 Tab 代碼區塊
    (function() {
        let NEW_TAG_ID_PREFIX = 'temp_field_id';
        let FIELD_TYPES = api.appsFields.TYPES;
        let SETS_TYPES = api.appsFields.SETS_TYPES;

        let fieldPanelCtrl = (function() {
            let instance = new FieldPanelCtrl();

            // 宣告用來處理整個客戶分類條件容器的控制類別
            function FieldPanelCtrl() {
                this.saveListeners = [];
                this.deleteListeners = [];
                this.$appsFieldsWapper = $('#appsFieldsWapper');
            }

            /**
             * @param {string} appId
             */
            FieldPanelCtrl.prototype.toggleItem = function(appId) {
                let fieldCollapseId = appId + '_collapse';
                this.$appsFieldsWapper.find('#' + fieldCollapseId).collapse();
            };

            /**
             * @param {string} appId
             * @param {any} app
             */
            FieldPanelCtrl.prototype.addAppItem = function(appId, app) {
                let _this = this;
                let fieldCollapseId = appId + '_collapse';

                _this.$appsFieldsWapper.append(
                    '<div class="app-name collapsed" role="button" data-toggle="collapse" data-parent="#appsFieldsWapper" href="#' + fieldCollapseId + '" aria-expanded="true" aria-controls="' + fieldCollapseId + '">' +
                        (app.name || '') +
                    '</div>' +
                    '<div id="' + fieldCollapseId + '" class="card-collapse collapse" aria-labelledby="' + appId + '">' +
                        '<button type="button" class="btn btn-light btn-border add-field m-3">' +
                            '<i class="fas fa-plus fa-fw"></i>' +
                            '<span>新增</span>' +
                        '</button>' +
                        '<div class="px-3 d-flex flex-wrap field-body"></div>' +
                        '<div class="text-center my-3">' +
                            '<button type="button" class="btn btn-light btn-border all-confirm font-weight-bold">儲存設定</button>' +
                        '</div>' +
                    '</div>'
                );

                let $fieldCollapse = _this.$appsFieldsWapper.find('#' + fieldCollapseId);
                let $fieldBody = $fieldCollapse.find('.field-body');

                $fieldCollapse.find('.btn.add-field').on('click', function() {
                    let tempFieldId = NEW_TAG_ID_PREFIX + Date.now();
                    _this.addFieldItem(appId, tempFieldId, {
                        text: '新客戶分類條件',
                        type: FIELD_TYPES.CUSTOM,
                        setsType: SETS_TYPES.MULTI_SELECT
                    });

                    let $tempField = $('#' + tempFieldId);
                    let $profWid = $tempField.parents('.prof-wid');
                    $profWid.animate({
                        scrollTop: $tempField.offset().top - $profWid.offset().top + $profWid.scrollTop() - 20
                    }, 300);
                });

                $fieldCollapse.find('.btn.all-confirm').on('click', function(ev) {
                    let $fieldRows = $fieldBody.find('.field-content');
                    let uiFields = {};

                    for (let i = 0; i < $fieldRows.length; i++) {
                        let $row = $($fieldRows[i]);
                        let data = {
                            text: ($row.find('[name="fieldName"]').val() || '').trim(),
                            setsType: $row.find('.field-type select').val(),
                            order: i,
                            canShowingOnForm: $row.find('[name="canShowingOnForm"]').prop('checked')
                        };

                        if (!data.text) {
                            return $.notify('名稱不可設置為空', { type: 'warning' });
                        }

                        switch (data.setsType) {
                            case SETS_TYPES.MULTI_SELECT:
                            case SETS_TYPES.SELECT:
                                // 單選的資料將 textarea 中的文字依照換行符號切割成陣列
                                data.sets = $row.find('.field-sets .sets-item').val().split('\n');
                                break;
                            case SETS_TYPES.CHECKBOX:
                            case SETS_TYPES.NUMBER:
                            case SETS_TYPES.TEXT:
                            default:
                                data.sets = [];
                                break;
                        }

                        // 每一行的 td 客戶分類條件的 ID 都直接使用 fieldId 設定，因此用來設定對應的資料
                        uiFields[$row.attr('id')] = data;
                    }

                    for (let idx in _this.saveListeners) {
                        _this.saveListeners[idx](ev, {
                            appId: appId,
                            uiFields: uiFields
                        });
                    }
                });
            };

            /**
             * @param {string} appId
             * @param {string} fieldId
             * @param {*} field
             */
            FieldPanelCtrl.prototype.addFieldItem = function(appId, fieldId, field) {
                let _this = this;
                let fieldCollapseId = appId + '_collapse';
                let $fieldBody = this.$appsFieldsWapper.find('#' + fieldCollapseId + ' .field-body');

                let generateSetsHtml = function(setsType, setsData) {
                    switch (setsType) {
                        case SETS_TYPES.SELECT:
                        case SETS_TYPES.MULTI_SELECT:
                            return (
                                '<textarea class= "sets-item form-control" rows="3" columns="10" style="resize: vertical" placeholder="以換行區隔資料">' +
                                    (function(sets) {
                                        let transStrs = [];
                                        for (let i in sets) {
                                            transStrs.push(transJson[sets[i]] ? transJson[sets[i]] : (sets[i] || ''));
                                        }
                                        return transStrs;
                                    })(setsData).join('\n') +
                                '</textarea>'
                            );
                        case SETS_TYPES.CHECKBOX:
                        case SETS_TYPES.TEXT:
                        case SETS_TYPES.DATE:
                        case SETS_TYPES.NUMBER:
                        default:
                            return (
                                '<input type="text" class="sets-item form-control" value="無設定" disabled />'
                            );
                    }
                };

                let fieldText = (transJson[field.text] ? transJson[field.text] : (field.text || ''));
                let $fieldContent = $(
                    '<div class="card m-2 p-2 col-12 col-lg-6 field-content" id="' + fieldId + '">' +
                        '<div class="form-group row field-item mb-1">' +
                            '<label class="col-3 col-form-label">名稱:</label>' +
                            '<div class="col-9 d-flex align-items-center">' +
                                '<input class="form-control" type="text" name="fieldName" placeholder="' + fieldText + '" value="' + fieldText + '" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group row field-item field-type my-1">' +
                            '<label class="col-3 col-form-label">類型:</label>' +
                            '<div class="col-9 d-flex align-items-center">' +
                                '<select class="form-control" value="' + field.setsType + '">' +
                                    '<option value="' + SETS_TYPES.MULTI_SELECT + '">多選項</option>' +
                                    '<option value="' + SETS_TYPES.SELECT + '">單一選項</option>' +
                                    '<option value="' + SETS_TYPES.CHECKBOX + '">勾選</option>' +
                                    '<option value="' + SETS_TYPES.NUMBER + '">數字</option>' +
                                    '<option value="' + SETS_TYPES.TEXT + '">文字</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group row field-item field-sets my-1 field-options">' +
                            '<label class="col-3 col-form-label">選項:</label>' +
                            '<div class="col-9 d-flex align-items-center option-content">' +
                                generateSetsHtml(field.setsType, field.sets) +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group row field-item my-1 text-right field-options">' +
                            '<label class="col-12 col-form-label">' +
                                '<input class="form-check-input" type="checkbox" name="canShowingOnForm"' + (field.canShowingOnForm ? ' checked="true"' : '') + ' />' +
                                '是否顯示在顧客表單上' +
                            '</label>' +
                        '</div>' +
                        '<div class="field-item field-delete mt-auto mb-1 py-2 w-100 text-right">' +
                            '<button type="button" class="btn btn-danger btn-sm btn-danger field-delete-btn' + (FIELD_TYPES.SYSTEM === field.type ? ' d-none' : '') + '">' +
                                '<i class="fas fa-times fa-fw"></i>' +
                                '<span>刪除</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>'
                );
                $fieldBody.append($fieldContent);

                let $fieldTypeSelect = $fieldContent.find('.field-type select');
                $fieldTypeSelect.val(field.setsType || '');

                if (field.type !== FIELD_TYPES.CUSTOM) {
                    $fieldTypeSelect.prop('disabled', true);
                    $fieldContent.find('[name="fieldName"]').prop('disabled', true);
                    $fieldContent.find('.field-sets .sets-item').prop('disabled', true);
                }

                $fieldTypeSelect.on('change', function(ev) {
                    let selectedVal = ev.target.value;
                    let $fieldItem = $(ev.target).parents('.field-item');
                    let $fieldOptions = $fieldItem.siblings('.field-options');
                    if (0 === $fieldOptions.length) {
                        $fieldOptions = $(
                            '<div class="form-group row field-item field-sets my-1 field-options">' +
                                '<label class="col-3 col-form-label">選項:</label>' +
                                '<div class="col-9 d-flex align-items-center option-content">' +
                                    generateSetsHtml(selectedVal, ['']) +
                                '</div>' +
                            '</div>'
                        );
                        $fieldOptions.insertAfter($fieldItem);
                    } else {
                        $fieldOptions.find('.option-content').html(generateSetsHtml(selectedVal, ['']));
                    }
                });

                $fieldContent.on('click', '.btn.field-delete-btn', function(ev) {
                    $(ev.target).parents('.field-content').remove();
                    for (let idx in _this.deleteListeners) {
                        _this.deleteListeners[idx]({
                            appId: appId,
                            fieldId: fieldId
                        });
                    }
                });
            };

            FieldPanelCtrl.prototype.onSave = function(handler) {
                let _this = this;
                _this.saveListeners.push(handler);
                return function() {
                    let idx = _this.saveListeners.indexOf(handler);
                    idx >= 0 && _this.saveListeners.length > 0 && _this.saveListeners.splice(idx, 1);
                };
            };

            FieldPanelCtrl.prototype.onDelete = function(handler) {
                let _this = this;
                _this.deleteListeners.push(handler);
                return function() {
                    let idx = _this.deleteListeners.indexOf(handler);
                    idx >= 0 && _this.deleteListeners.length > 0 && _this.deleteListeners.splice(idx, 1);
                };
            };

            return instance;
        })();

        // 設定頁面中 tab 切換時的事件監聽
        // 切換到客戶分類條件頁面時，再抓取客戶分類條件資料
        $('.nav-link[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
            if ('#fields' !== ev.target.hash) {
                // 非客戶分類條件頁面不處理
                return;
            }

            let firstAppId = '';
            fieldPanelCtrl.$appsFieldsWapper.empty();
            return Promise.all([
                api.apps.findAll(userId),
                api.appsFields.findAll(userId)
            ]).then(function(resJsons) {
                apps = resJsons.shift().data;
                appsFields = resJsons.shift().data;

                fieldPanelCtrl.saveListeners.length = 0;
                fieldPanelCtrl.deleteListeners.length = 0;

                for (let appId in apps) {
                    let app = apps[appId] || {};
                    if (CHATSHIER === app.type) {
                        continue;
                    }

                    let fields = appsFields[appId].fields || {};
                    fieldPanelCtrl.addAppItem(appId, app);
                    firstAppId = firstAppId || appId;

                    // 將客戶分類條件資料依照設定的 order 進行排序，根據順序擺放到 UI 上
                    let fieldIds = Object.keys(fields);
                    fieldIds.sort(function(a, b) {
                        let fieldsA = appsFields[appId].fields[a];
                        let fieldsB = appsFields[appId].fields[b];

                        // DEFAULT, SYSTEM 在前 CUSTOM 在後
                        if (FIELD_TYPES.CUSTOM !== fieldsA.type &&
                            FIELD_TYPES.CUSTOM === fieldsB.type) {
                            return false;
                        } else if (FIELD_TYPES.CUSTOM === fieldsA.type &&
                            FIELD_TYPES.CUSTOM !== fieldsB.type) {
                            return true;
                        }
                        return fieldsA.order - fieldsB.order;
                    });

                    for (let i in fieldIds) {
                        let fieldId = fieldIds[i];
                        let field = fields[fieldId];
                        if (field.isDeleted || 'CUSTOM' !== field.type) {
                            delete fields[fieldId];
                            continue;
                        }
                        fieldPanelCtrl.addFieldItem(appId, fieldId, field);
                    }
                }

                // 監聽每行客戶分類條件的儲存事件，根據 UI 上資料的變更
                // 檢查哪些資料需要更新哪些資料需要新增
                fieldPanelCtrl.onSave(function(ev, args) {
                    $(ev.target).attr('disabled', true);
                    let fieldsOrg = appsFields[args.appId].fields;
                    let fieldIds = Object.keys(fieldsOrg);

                    /**
                     * 深層比對目標物件中的資料在來源物件中是否具有相同資料
                     */
                    let fieldHasChanged = function(srcField, destField) {
                        for (let key in destField) {
                            // 因為有翻譯文字的關係
                            // 非自定義客戶分類條件的名稱與系統性別的設定不檢查
                            if (('text' === key && FIELD_TYPES.CUSTOM !== srcField.type) ||
                                ('sets' === key && 'gender' === srcField.alias)) {
                                continue;
                            }

                            if (srcField[key] === destField[key]) {
                                continue;
                            }

                            if (!(srcField[key] instanceof Array && destField[key] instanceof Array)) {
                                return true;
                            } else if (srcField[key].length !== destField[key].length) {
                                return true;
                            }

                            for (let i in destField[key]) {
                                if (srcField[key][i] !== destField[key][i]) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };

                    return Promise.all(fieldIds.map(function(fieldId) {
                        let fieldOrg = fieldsOrg[fieldId];
                        let fieldOnUI = Object.assign({}, args.uiFields[fieldId]);
                        delete args.uiFields[fieldId]; // 確認完用的 UI 資料直接刪除，不需再處理

                        // 需對照 UI 上目前每個客戶分類條件的順序，更新至對應的客戶分類條件
                        if (!!fieldOnUI && fieldHasChanged(fieldOrg, fieldOnUI)) {
                            // 只允許自定義的欄位可進行資料變更動作
                            if (fieldOrg.type === FIELD_TYPES.CUSTOM) {
                                fieldOrg.text = fieldOnUI.text;
                                fieldOrg.setsType = fieldOnUI.setsType;
                                fieldOrg.sets = fieldOnUI.sets;
                                fieldOrg.canShowingOnForm = fieldOnUI.canShowingOnForm;
                            }
                            fieldOrg.order = fieldOnUI.order;
                            return api.appsFields.update(args.appId, fieldId, userId, fieldOrg).then(function(resJson) {
                                let _appsFields = resJson.data;
                                appsFields[args.appId].fields[fieldId] = _appsFields[args.appId].fields[fieldId];
                            });
                        } else if (fieldOrg.isDeleted) {
                            return api.appsFields.remove(args.appId, fieldId, userId).then(function() {
                                delete appsFields[args.appId].fields[fieldId];
                            });
                        }
                        return Promise.resolve();
                    })).then(function() {
                        return Promise.all(Object.keys(args.uiFields).map(function(fieldId) {
                            // 將剩下的 id 檢查是否為新增的客戶分類條件
                            // 新增的客戶分類條件 id 前綴設定為 NEW_TAG_ID_PREFIX 變數
                            // 非新增的客戶分類條件資料不進行資料插入動作
                            if (fieldId.indexOf(NEW_TAG_ID_PREFIX) < 0) {
                                return Promise.resolve();
                            }

                            let fieldOnUI = args.uiFields[fieldId];
                            let newField = {
                                text: fieldOnUI.text,
                                type: FIELD_TYPES.CUSTOM,
                                sets: fieldOnUI.sets,
                                setsType: fieldOnUI.setsType,
                                order: fieldOnUI.order,
                                canShowingOnForm: fieldOnUI.canShowingOnForm
                            };
                            return api.appsFields.insert(args.appId, userId, newField).then(function(resJson) {
                                // 完成資料庫儲存後，將暫時使用的 fieldId 替換成真正資料庫的 fieldId
                                let insertFields = resJson.data;
                                let newFieldId = Object.keys(insertFields[args.appId].fields).shift();
                                appsFields[args.appId].fields[newFieldId] = insertFields[args.appId].fields[newFieldId];
                                $('#' + fieldId + '.field-content').attr('id', newFieldId);
                            });
                        }));
                    }).then(function() {
                        // 客戶分類條件資料處理完成後顯示訊息在 UI 上
                        $.notify('客戶分類條件更新成功', { type: 'success' });
                        $(ev.target).removeAttr('disabled');
                    });
                });

                // 監聽每行客戶分類條件的刪除事件，刪除時在原始資料上標記刪除
                fieldPanelCtrl.onDelete(function(ev) {
                    let field = appsFields[ev.appId].fields[ev.fieldId];
                    if (!field) {
                        return;
                    }
                    field.isDeleted = true;
                });

                // 所有資料載入完後展開第一個 collapse
                fieldPanelCtrl.toggleItem(firstAppId);
            });
        });
    })();
    // #endregion
    // ===============

    // ===============
    // #region 內部部門代碼區塊
    (function() {
        let api = window.restfulAPI;
        let MEMBER_TYPES = api.groupsMembers.TYPES;
        let searchCache = {};
        let keyinWaitTimer = null;

        let $groupAddModal = $('#groupAddModal');
        let $groupAddSubmit = $groupAddModal.find('#groupAddSubmit');
        let $internalGroupPanel = $('#internal-group');
        let $groupBody = $internalGroupPanel.find('.card-body');
        let $groupElems = {};

        $groupAddModal.on('show.bs.modal', function() {
            // 新增部門 modal 顯示時，清空上一次輸入的名稱
            $groupAddModal.find('input[name="groupAddName"]').val('');
        });

        let groupCtrl = (function() {
            function GroupPanelCtrl() {}

            GroupPanelCtrl.prototype.clearAll = function() {
                groups = {};
                $groupElems = {};
                $groupBody.empty();
            };

            GroupPanelCtrl.prototype.showCollapse = function(groupId) {
                instance.hideCollapseAll(groupId);
                $groupElems[groupId].$collapse.collapse('show');
            };

            GroupPanelCtrl.prototype.hideCollapseAll = function(excludeId) {
                for (let groupId in $groupElems) {
                    if (excludeId && excludeId === groupId) {
                        continue;
                    }
                    $groupElems[groupId].$collapse.collapse('hide');
                }
            };

            GroupPanelCtrl.prototype.generateGroupHtml = function(groupId, groupName, member) {
                let html =
                    '<div group-id="' + groupId + '" class="group-tab" role="tab">' +
                        '<a class="group-name collapsed" role="button" data-toggle="collapse" href="#' + groupId + '" aria-expanded="true" aria-controls="' + groupId + '">' +
                            (groupName || '') +
                        '</a>' +
                    '</div>' +
                    '<div id="' + groupId + '" class="chsr-group card-collapse collapse">' +
                        '<div class="px-3 py-2 ' + (MEMBER_TYPES.OWNER === member.type || MEMBER_TYPES.ADMIN === member.type ? '' : 'd-none') + '">' +
                            '<label for="group_name" class="col-form-label">部門名稱: </label>' +
                            '<div class="input-container">' +
                                '<div class="input-group group-name" id="group_name">' +
                                    '<input class="group-name-input form-control" type="text" value="' + groupName + '" placeholder="我的部門" />' +
                                    '<span class="input-group-btn btn-update">' +
                                        '<button class="btn btn-primary">更新</button>' +
                                    '</span>' +
                                // '<span class="input-group-btn btn-delete">' +
                                //     '<button class="btn btn-danger">刪除部門</button>' +
                                // '</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        // '<div class="px-3 py-2">' +
                        //     '<label for="group_photo" class="col-form-label">部門圖片 (URL): </label>' +
                        //     '<div class="input-container">' +
                        //         '<div class="input-group file-container" id="group_photo">' +
                        //             '<span class="input-group-btn">' +
                        //                 '<button class="btn btn-light btn-border file-choose">' +
                        //                     '<i class="fa fa-upload"></i>' +
                        //                 '</button>' +
                        //             '</span>' +
                        //             '<input type="file" class="file-ghost" accept=".png,.jpg,.jpeg,.bmp">' +
                        //             '<p type="input" class="form-control file-text" data-placeholder="選擇一張圖片..."></p>' +
                        //             '<span class="input-group-btn">' +
                        //                 '<img src="image/favicon/favicon.ico" class="img-preview" />' +
                        //             '</span>' +
                        //             '<span class="input-group-btn btn-update">' +
                        //                 '<button class="btn btn-primary">更新</button>' +
                        //             '</span>' +
                        //         '</div>' +
                        //     '</div>' +
                        // '</div>' +

                        '<div class="px-3 py-2 user-invite' + (MEMBER_TYPES.OWNER === member.type || MEMBER_TYPES.ADMIN === member.type ? ' d-flex' : ' d-none') + '">' +
                            '<div class="w-100 position-relative input-container">' +
                                '<input type="email" class="text user-email form-control typeahead" data-provide="typeahead" placeholder="Email 地址" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" autofocus="false" />' +
                            '</div>' +
                            '<div class="ml-2 permission">' +
                                '<div class="input-group text-right">' +
                                    '<div class="input-group-btn">' +
                                        '<button class="btn btn-light btn-block btn-border outline dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                                            '<span class="permission-text">權限</span>' +
                                        '</button>' +
                                        '<div class="dropdown-menu dropdown-menu-right">' +
                                            '<a class="dropdown-item" role="button">READ</a>' +
                                            '<a class="dropdown-item" role="button">WRITE</a>' +
                                            '<a class="dropdown-item" role="button">ADMIN</a>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="ml-auto actions">' +
                                '<div class="text-right">' +
                                    '<button class="btn btn-light btn-block btn-border outline add-button">' +
                                        '<span>邀請</span>' +
                                        '<i class="fas fa-user-plus"></i>' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="d-flex flex-wrap justify-content-center">' +
                            '<div class="w-100 px-2 py-3 row member-list"></div>' +
                        '</div>' +
                    '</div>';
                return html;
            };

            GroupPanelCtrl.prototype.generateMemberHtml = function(memberId, memberUser, member, memberSelf) {
                // 只有部門成員本人可以確認是否加入部門
                let canJoin = member.user_id === userId && !member.status;

                // 部門擁有者及管理員可以踢掉部門成員
                // 部門成員可以自行離開部門
                // 部門擁有者不能離開部門
                let canDelete =
                    (MEMBER_TYPES.OWNER === memberSelf.type ||
                    MEMBER_TYPES.ADMIN === memberSelf.type ||
                    member.user_id === userId) &&
                    MEMBER_TYPES.OWNER !== member.type;

                let html =
                    '<div class="col-12 m-2 card justify-content-around group-member" member-id="' + memberId + '">' +
                        '<div class="d-flex flex-nowrap align-items-center w-100 user chips">' +
                            '<div class="avatar-container">' +
                                '<img class="member-avatar" src="image/avatar-default.png" alt="Member avatar" />' +
                            '</div>' +
                            '<span class="avatar-name">' + (memberUser.name || memberUser.name || '') + '</span>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center permission-group">' +
                            '<div class="mr-3 text-left">權限:</div>' +
                            '<div class="permission-item text-center' + (MEMBER_TYPES.READ === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">R</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (MEMBER_TYPES.WRITE === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">W</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (MEMBER_TYPES.ADMIN === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">A</span>' +
                            '</div>' +
                            '<div class="permission-item text-center' + (MEMBER_TYPES.OWNER === member.type ? ' btn-primary' : '') + '">' +
                                '<span class="permission-text cursor-pointer">O</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center status">' +
                            '<div class="mr-3 text-left">狀態:</div>' +
                            '<div class="status-item text-left">' +
                                '<span class="active ' + (!member.status ? 'd-none' : '') + '">' + ACTIVE + '</span>' +
                                '<span class="inactive ' + (member.status ? 'd-none' : '') + '">' + INACTIVE + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex flex-nowrap align-items-center actions">' +
                            '<div class="mr-3 text-left">操作:</div>' +
                            '<div class="action-container text-left">' +
                                '<a role="button" class="btn-join' + (!canJoin ? ' d-none' : '') + '">' +
                                    '<span class="chsr-icon">' +
                                        '<i class="fas fa-2x fa-plus-circle action-icon"></i>' +
                                    '</span>' +
                                '</a>' +
                                '<a role="button" class="btn-remove' + (!canDelete ? ' d-none' : '') + '">' +
                                    '<span class="chsr-icon">' +
                                        '<i class="fas fa-2x fa-trash-alt action-icon"></i>' +
                                    '</span>' +
                                '</a>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                return html;
            };

            GroupPanelCtrl.prototype.addGroup = function(groupId, group) {
                instance.hideCollapseAll(groupId);
                let members = group.members;
                let userIds = Object.keys(members).map((memberId) => {
                    if (!members[memberId].isDeleted) {
                        return members[memberId].user_id;
                    };
                });
                let index = userIds.indexOf(userId);
                if (0 > index) {
                    // return;
                };

                let memberSelf = members[Object.keys(members)[index]];
                $groupBody.append(instance.generateGroupHtml(groupId, group.name, memberSelf));

                // #region 每個部門相關事件宣告
                // 將部門中經常取用的 element 一次抓取出來，方便存取
                let $collapse = $groupBody.find('.card-collapse#' + groupId);
                $groupElems[groupId] = {
                    $collapse: $collapse,
                    $groupName: $groupBody.find('.group-name'),

                    $fileGhost: $collapse.find('.file-container input.file-ghost'),
                    $fileName: $collapse.find('.file-container .file-text'),
                    $imgPreview: $collapse.find('.file-container .img-preview'),

                    $memberEmail: $collapse.find('.user-email'),
                    $memberList: $collapse.find('.member-list'),
                    $permissionText: $collapse.find('.permission .permission-text')
                };

                // 部門展開時將其他部門收縮起來
                $collapse.on('show.bs.collapse', function(e) {
                    instance.hideCollapseAll(e.target.id);
                });

                // 使用者更新部門名稱的事件處理
                $collapse.on('click', '.group-name .btn-update', function() {
                    let groupData = {
                        name: $(this).parent().find('input').val()
                    };

                    if (groups[groupId].name === groupData.name) {
                        return;
                    }

                    let $updateButton = $(this);
                    $updateButton.attr('disabled', true);

                    return api.groups.update(groupId, userId, groupData).then(function() {
                        groups[groupId].name = groupData.name;
                        $collapse.parent().find('.group-tab .group-name[aria-controls="' + groupId + '"]').text(groupData.name);
                        $.notify('部門名稱更新成功！', { type: 'success' });
                    }).catch(function() {
                        $.notify('部門名稱更新失敗！', { type: 'danger' });
                    }).then(function() {
                        $updateButton.removeAttr('disabled');
                    });
                });

                // 使用者刪除部門的事件處理
                $collapse.on('click', '.group-name .btn-delete', function() {
                    if (!confirm('確定刪除此部門嗎？')) {
                        return;
                    }

                    return api.groups.remove(groupId, userId).then(function() {
                        $collapse.parent().find('.group-tab').remove();
                        $collapse.remove();
                        delete groups[groupId];
                    });
                });

                // 使用者更新部門頭像的事件處理
                $collapse.on('click', '.file-container .btn-update', function() {
                    let groupData = {
                        photo: $groupElems[groupId].groupImgBase64 || ''
                    };

                    if (!groupData.photo) {
                        $.notify('沒有選擇上傳的圖像', { type: 'warning' });
                        return;
                    }
                    return api.groups.update(groupId, userId, groupData).then(function() {
                        groups[groupId].photo = groupData.photo;
                        delete $groupElems[groupId].groupImgBase64;
                        $.notify('部門圖像上傳成功！', { type: 'success' });
                    });
                });

                // 使用者選擇新增成員的權限
                $collapse.on('click', '.permission .dropdown-menu a', function() {
                    $groupElems[groupId].$permissionText.text($(this).text());
                });

                $collapse.on('click', '.actions .add-button', function() {
                    let memberEmail = $groupElems[groupId].$memberEmail.val();
                    let permission = $groupElems[groupId].$permissionText.text();
                    if (!memberEmail) {
                        $.notify('請輸入目標成員的 Email', { type: 'warning' });
                        return;
                    } else if (!MEMBER_TYPES[permission]) {
                        $.notify('請選擇目標成員的權限', { type: 'warning' });
                        return;
                    }

                    let $addButton = $(this);
                    $addButton.attr('disabled', true);

                    return api.users.find(userId, memberEmail).then(function(resJson) {
                        let memberUserId = Object.keys(resJson.data).shift();
                        let postMemberData = {
                            type: MEMBER_TYPES[permission],
                            userid: memberUserId
                        };

                        // 成功更新部門成員後，將新成員的資料合併至本地端的部門資料
                        // 並且清除新增成員的 email 欄位
                        return api.groupsMembers.insert(groupId, userId, postMemberData).then(function(resJson) {
                            let groupMembers = resJson.data[groupId].members;
                            let groupMemberId = Object.keys(groupMembers).shift();
                            groups[groupId].members = Object.assign(groups[groupId].members, groupMembers);
                            return {
                                groupMemberId: groupMemberId,
                                groupMember: groupMembers[groupMemberId]
                            };
                        });
                    }).then(function(insertData) {
                        return api.users.find(userId).then(function(resJson) {
                            users = resJson.data || {};
                            instance.addMemberToList(groupId, insertData.groupMemberId, insertData.groupMember, memberSelf);

                            return new Promise(function(resolve) {
                                let socketBody = {
                                    groupId: groupId,
                                    memberId: insertData.groupMemberId,
                                    memberUserId: insertData.groupMember.user_id,
                                    userId: userId
                                };
                                socket.emit(SOCKET_EVENTS.USER_ADD_GROUP_MEMBER_TO_SERVER, socketBody, resolve);
                            });
                        });
                    }).then(function() {
                        $groupElems[groupId].$memberEmail.val('');
                        $groupElems[groupId].$permissionText.text('權限');
                        $.notify('部門成員新增成功', { type: 'success' });
                    }).catch(function() {
                        $.notify('部門成員新增失敗', { type: 'danger' });
                    }).then(function() {
                        $addButton.removeAttr('disabled');
                    });
                });

                // 點擊檔案上傳觸發隱藏起來的 html5 的 input file
                $collapse.on('click', '.file-container .file-choose', function() {
                    $groupElems[groupId].$fileGhost.click();
                });

                // 選擇圖檔後，將圖像資源載入成 base64 的資料型態
                $groupElems[groupId].$fileGhost.on('change', function() {
                    let files = this.files;
                    if (files.length) {
                        $groupElems[groupId].$fileName.text(($(this).val()).split('\\').pop());

                        let file = files[0];
                        return new Promise(function(resolve, reject) {
                            let fileReader = new FileReader();
                            fileReader.onloadend = function() {
                                resolve(fileReader.result);
                            };
                            fileReader.readAsDataURL(file);
                        }).then(function(imgBase64) {
                            $groupElems[groupId].groupImgBase64 = imgBase64;
                            $groupElems[groupId].$imgPreview.prop('src', imgBase64);
                        });
                    }
                });

                $groupElems[groupId].$memberEmail.typeahead({
                    minLength: 2,
                    fitToElement: true,
                    showHintOnFocus: false,
                    items: 5,
                    source: [],
                    autoSelect: false,
                    matcher: function() {
                        // 總是回傳 ture 代表無視 keyin 內容
                        // typeahead 清單資料以 api 回傳的清單為主
                        return true;
                    },
                    updater: function(item) {
                        // 選擇項目後，將 email 的部分設於 input value
                        return { name: item.email };
                    },
                    displayText: function(item) {
                        // 項目顯示樣式為 [username - example@example.com]
                        return item.name + (item.email ? ' - ' + item.email : '');
                    }
                });

                $groupElems[groupId].$memberEmail.on('keyup', function(ev) {
                    keyinWaitTimer && window.clearTimeout(keyinWaitTimer);
                    if (ev.target.value < 2) {
                        return;
                    }

                    let emailPattern = ev.target.value;
                    keyinWaitTimer = window.setTimeout(function() {
                        return Promise.resolve().then(function() {
                            if (searchCache[emailPattern]) {
                                return searchCache[emailPattern];
                            }

                            return api.users.find(userId, emailPattern, true).then(function(resJson) {
                                let users = resJson.data || {};
                                let userIds = Object.keys(users).filter((_userId) => _userId !== userId);
                                return userIds.map((_userId) => users[_userId]);
                            });
                        }).then(function(searchResults) {
                            // 將搜尋到的結果存到快取中，相同的搜尋字不需再搜尋兩次
                            searchCache[emailPattern] = searchResults;

                            let typeaheadData = $(ev.target).data('typeahead');
                            typeaheadData.setSource(searchResults);
                            typeaheadData.lookup();
                        });
                    }, 500); // 使用者停止 keyin 500ms 後在確定發送搜尋 api
                });
                // #endregion

                // 將部門內的成員資料載入至畫面上
                for (let memberId in group.members) {
                    instance.addMemberToList(groupId, memberId, group.members[memberId], memberSelf);
                }
            };

            GroupPanelCtrl.prototype.addMemberToList = function(groupId, memberId, member, memberSelf) {
                let memberUser = users[member.user_id];
                if (!memberUser) {
                    return;
                };

                let memberItemHtml = instance.generateMemberHtml(memberId, memberUser, member, memberSelf);
                $groupElems[groupId].$memberList.append(memberItemHtml);

                let $memberRow = $groupElems[groupId].$memberList.find('[member-id="' + memberId + '"]');
                let $memberPermission = $memberRow.find('.permission-item');
                let $memberStatus = $memberRow.find('.status');
                let $memberActions = $memberRow.find('.actions');

                // 使用者點擊部門內的事件處理
                $memberPermission.on('click', function() {
                    let $permissionItem = $(this);
                    let $permissionText = $permissionItem.find('.permission-text');
                    let wantPermission = {
                        'R': MEMBER_TYPES.READ,
                        'W': MEMBER_TYPES.WRITE,
                        'A': MEMBER_TYPES.ADMIN,
                        'O': MEMBER_TYPES.OWNER
                    }[$permissionText.text()];

                    if (wantPermission === groups[groupId].members[memberId].type) {
                        // 想變更的權限與目前的權限一樣，無需執行更新
                        return;
                    } else if (MEMBER_TYPES.OWNER === groups[groupId].members[memberId].type) {
                        $.notify('部門擁有者無法變更權限', { type: 'warning' });
                        return;
                    } else if (wantPermission === MEMBER_TYPES.OWNER) {
                        $.notify('權限無法變更為部門擁有者', { type: 'warning' });
                        return;
                    }

                    let putMemberData = { type: wantPermission };
                    return api.groupsMembers.update(groupId, memberId, userId, putMemberData).then(function() {
                        // 成功更新後更新本地端的資料
                        groups[groupId].members[memberId].type = putMemberData.type;
                        $permissionItem.addClass('btn-primary').siblings().removeClass('btn-primary');
                    }).catch((resJson) => {
                        if ('3.11' === resJson.code) {
                            $.notify('權限不足，無法更新成員權限', { type: 'danger' });
                            return;
                        }
                        $.notify('更新成員權限失敗', { type: 'danger' });
                    });
                });

                $memberActions.on('click', '.btn-join', function() {
                    let putMemberData = { status: true };
                    let $self = $(this);
                    return api.groupsMembers.update(groupId, memberId, userId, putMemberData).then(function() {
                        // 更新 API，加入部門
                        groups[groupId].members[memberId].status = putMemberData.status;
                        $memberStatus.find('.active').removeClass('d-none');
                        $memberStatus.find('.inactive').addClass('d-none');
                        $self.remove();
                        $.notify('您已加入 "' + groups[groupId].name + '" 部門', { type: 'success' });
                    }).catch(() => {
                        $.notify('加入部門失敗', { type: 'danger' });
                    });
                });

                $memberActions.on('click', '.btn-remove', function() {
                    let member = groups[groupId].members[memberId];
                    let memberUserId = member.user_id;

                    if (MEMBER_TYPES.OWNER === member.type) {
                        $.notify('部門擁有者無法刪除', { type: 'warning' });
                        return;
                    } else if (!confirm('確定刪除此成員嗎？')) {
                        return;
                    }

                    return api.groupsMembers.remove(groupId, memberId, userId).then(function() {
                        // 成功更新後刪除本地端的資料
                        $memberRow.remove();
                        delete groups[groupId].members[memberId];

                        // 如果是部門成員自行離開部門，離開後刪除整個部門資料
                        if (memberUserId === userId) {
                            $groupBody.find('.group-tab[group-id="' + groupId + '"]').remove();
                            $groupBody.find('.card-collapse#' + groupId).remove();
                            delete groups[groupId];
                        }

                        return new Promise(function(resolve) {
                            let socketBody = {
                                groupId: groupId,
                                memberId: memberId,
                                memberUserId: memberUserId,
                                userId: userId
                            };
                            socket.emit(SOCKET_EVENTS.USER_REMOVE_GROUP_MEMBER_TO_SERVER, socketBody, resolve);
                        });
                    }).then(() => {
                        $.notify('刪除成員成功', { type: 'success' });
                    }).catch(() => {
                        $.notify('刪除成員失敗', { type: 'danger' });
                    });
                });
            };

            let instance = new GroupPanelCtrl();
            return instance;
        })();

        $('.nav-link[data-toggle="pill"]').on('shown.bs.tab', function(ev) {
            if ('#internal-group' !== ev.target.hash) {
                // 非內部部門頁面不處理
                $groupAddSubmit.off('click').on('click', insertOneGroup);
                return;
            }

            $groupAddSubmit.off('click').on('click', function() {
                let $groupNameElem = $groupAddModal.find('input[name="groupAddName"]');
                let groupName = $groupNameElem.val();
                if (!groupName) {
                    return;
                }

                let group = {
                    name: groupName
                };

                return api.groups.insert(userId, group).then(function(resJson) {
                    let groupId = Object.keys(resJson.data).shift();
                    groups[groupId] = resJson.data[groupId];
                    groupCtrl.addGroup(groupId, groups[groupId]);
                    groupCtrl.showCollapse(groupId);
                    $groupNameElem.val('');
                    $groupAddModal.modal('hide');
                });
            });

            groupCtrl.clearAll();
            return Promise.all([
                api.groups.findAll(userId),
                api.users.find(userId)
            ]).then(function(resJsons) {
                groups = resJsons[0].data || {};
                users = resJsons[1].data || {};
                let firstGroupId = '';
                for (let groupId in groups) {
                    firstGroupId = firstGroupId || groupId;
                    let groupData = groups[groupId];
                    if (groupData.isDeleted) {
                        continue;
                    }
                    groupCtrl.addGroup(groupId, groupData);
                }
                firstGroupId && groupCtrl.showCollapse(firstGroupId);
            });
        });
    })();
    // #endregion
    // ===============
})();
