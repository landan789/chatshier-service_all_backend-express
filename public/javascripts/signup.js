(function() {
    if (!window.urlConfig) {
        console.warn('Please set up the configuration file of /config/url-config.js');
    }

    var TOOLTIP = {
        'SIGNUP_NAME': '請輸入姓名',
        'SIGNUP_EMAIL': '請輸入電子郵件',
        'SIGNUP_PASSWORD': '請輸入密碼',
        'SIGNUP_PASSWORD_CONFIRM': '與密碼不相符',
        'EMAIL_ALREADY_IN_USE': '此電子郵件已註冊',
        'INVALID_EMAIL': '無效電子郵件',
        'OPERATION_NOT_ALLOWED': '操作不允許',
        'WEAK_PASSWORD': '密碼強度低'
    };

    var serviceUrl = location.host;
    var wwwUrl = serviceUrl.replace(/^[\w-]+\./i, 'www.').replace(/:\d+$/i, '');
    urlConfig.wwwwUrl = urlConfig.wwwUrl.replace(/^https?:\/\//i, '');
    var domain = serviceUrl.replace(/^[\w-]+\./i, '.').replace(/:\d+$/i, '');
    var url = 'http://' + ('' === urlConfig.wwwwUrl ? wwwUrl : urlConfig.wwwUrl) + ('' === urlConfig.port ? '' : ':' + urlConfig.port);
    var indexUrl = url + urlConfig.index;
    var termsUrl = url + urlConfig.terms;
    var privacyUrl = url + urlConfig.privacy;

    $(document).ready(function() {
        $('#index').attr('href', indexUrl);
        $('#terms').attr('href', termsUrl);
        $('#privacy').attr('href', privacyUrl);
        $('[data-toggle="tooltip"]').tooltip('show'); // 避免蓋掉 "請填寫這個欄位"
        $('[data-toggle="tooltip"]').tooltip('destroy'); // 避免蓋掉 "請填寫這個欄位"
        $(document).on('click', '#signup', signup); // 註冊
    });

    function signup(event) {
        // Button loading
        // var emailRule = /^\w+((-\w+)|(\.\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
        event.preventDefault();
        var name = document.getElementById('signup-name').value;
        var email = document.getElementById('signup-email').value;
        var password = document.getElementById('signup-password').value;
        var passwordConfirm = document.getElementById('signup-password-confirm').value;
        if ('' === name) {
            // showError('請輸入姓名。');
            $('#signup-name').tooltip({ title: TOOLTIP.SIGNUP_NAME });
            $('#signup-name').tooltip('show'); // show 請輸入姓名
            window.setTimeout(function() {
                $('#signup-name').tooltip('destroy');
            }, 3000);
        } else if ('' === email) {
            $('#signup-email').tooltip({ title: TOOLTIP.SIGNUP_EMAIL });
            $('#signup-email').tooltip('show'); // show 請輸入電子郵件
            window.setTimeout(function() {
                $('#signup-email').tooltip('destroy');
            }, 3000);
        } else if ('' === password) {
            $('#signup-password').tooltip({ title: TOOLTIP.SIGNUP_PASSWORD });
            $('#signup-password').tooltip('show'); // show 請輸入密碼
            setTimeout(function() {
                $('#signup-password').tooltip('destroy');
            }, 3000);
        } else if (password !== passwordConfirm) {
            $('#signup-password-confirm').tooltip({ title: TOOLTIP.SIGNUP_PASSWORD_CONFIRM });
            $('#signup-password-confirm').tooltip('show'); // show 密碼不相符
            window.setTimeout(function() {
                $('#signup-password-confirm').tooltip('destroy');
            }, 3000);
        } else {
            $(this).button('loading');
            var userInfo = {
                name,
                email
            };
            auth.createUserWithEmailAndPassword(email, password)
                .then(() => {
                    document.cookie = 'name=' + name + ';domain=' + domain;
                    document.cookie = 'email=' + email + ';domain=' + domain;
                    database.ref('users/' + auth.currentUser.uid).update(userInfo);
                }).catch(error => {
                    var errorCode = error.code;
                    if ('auth/email-already-in-use' === errorCode) {
                        $('#signup-email').tooltip({ title: TOOLTIP.EMAIL_ALREADY_IN_USE });
                        $('#signup-email').tooltip('show'); // show 此電子郵件已註冊
                    }

                    if ('auth/invalid-email' === errorCode) {
                        $('#signup-email').tooltip({ title: TOOLTIP.INVALID_EMAIL });
                        $('#signup-email').tooltip('show'); // show 無效電子郵件
                    }

                    if ('auth/operation-not-allowed' === errorCode) {
                        $('#signup-email').tooltip({ title: TOOLTIP.OPERATION_NOT_ALLOWED });
                        $('#signup-email').tooltip('show'); // show 操作不允許
                    }

                    if ('auth/weak-password' === errorCode) {
                        $('#signup-password').tooltip({ title: TOOLTIP.WEAK_PASSWORD });
                        $('#signup-password').tooltip('show'); // show 密碼強度低
                    }

                    $(this).button('reset');
                    window.setTimeout(function() {
                        $('#signup-email').tooltip('destroy');
                        $('#signup-password').tooltip('destroy');
                    }, 10000);
                });
        }
    };

    function showError(msg) {
        var $errorNotify = $('.error-notify');
        $errorNotify.hide();
        $errorNotify.text('');
        $errorNotify.append(msg);
        $errorNotify.show();
    }
})();
