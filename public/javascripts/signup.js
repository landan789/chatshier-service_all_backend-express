if ('undefined' === typeof window.urlConfig) {
    console.warn('Please set up the configuration file of /config/url-config.js');
}


const TOOLTIP = {
    'SIGNUP_NAME': '請輸入姓名',
    'SIGNUP_EMAIL': '請輸入電子郵件',
    'SIGNUP_PASSWORD': '請輸入密碼',
    'SIGNUP_PASSWORD_CONFIRM': '與密碼不相符'
}

var serviceUrl = location.host;
var wwwUrl = serviceUrl.replace(/^[\w\-]+\./i, 'www.').replace(/\:\d+$/i, '');
urlConfig.wwwwUrl = urlConfig.wwwUrl.replace(/^https?\:\/\//i, '');
var url = 'http://' + ('' === urlConfig.wwwwUrl ? wwwUrl : urlConfig.wwwUrl) + ('' === urlConfig.port ? '' : ':' + urlConfig.port);
var indexUrl = url + urlConfig.index;
var termsUrl = url + urlConfig.terms;
var privacyUrl = url + urlConfig.privacy;

$(document).ready(function() {
    $('#index').attr('href', indexUrl);
    $('#terms').attr('href', termsUrl);
    $('#privacy').attr('href', privacyUrl);
    $('[data-toggle="tooltip"]').tooltip('show'); //避免蓋掉 "請填寫這個欄位"
    $('[data-toggle="tooltip"]').tooltip('destroy'); //避免蓋掉 "請填寫這個欄位"
    $(document).on('click', '#signup', register); //註冊
});

function register(event) {
    // Button loading
    var $this = $(this);
    emailRule = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
    event.preventDefault();
    let name = document.getElementById('signup-name').value;
    let email = document.getElementById('signup-email').value;
    let password = document.getElementById('signup-password').value;
    let passwordConfirm = document.getElementById('signup-password-confirm').value;
    if (name === '') {
        //showError('請輸入姓名。');
        $('#signup-name').tooltip({ title: TOOLTIP.SIGNUP_NAME });
        $('#signup-name').tooltip('show'); //show 請輸入姓名
        setTimeout(function() {
            $('#signup-name').tooltip('destroy');
        }, 3000);
    } else if (email === '') {
        $('#signup-email').tooltip({ title: TOOLTIP.SIGNUP_EMAIL });
        $('#signup-email').tooltip('show'); //show 請輸入電子郵件
        setTimeout(function() {
            $('#signup-email').tooltip('destroy');
        }, 3000);
    } else if (password === '') {
        $('#signup-password').tooltip({ title: TOOLTIP.SIGNUP_PASSWORD });
        $('#signup-password').tooltip('show'); //show 請輸入密碼
        setTimeout(function() {
            $('#signup-password').tooltip('destroy');
        }, 3000);
    } else if (password !== passwordConfirm) {
        $('#signup-password-confirm').tooltip({ title: TOOLTIP.SIGNUP_PASSWORD_CONFIRM });
        $('#signup-password-confirm').tooltip('show'); //show 密碼不相符
        setTimeout(function() {
            $('#signup-password-confirm').tooltip('destroy');
        }, 3000);
    } else {
        $this.button('loading');

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {

                database.ref('users/' + auth.currentUser.uid).set({
                    name: name,
                    email: email
                }).then(() => {
                    document.cookie = "name=" + name + ";domain=" + domain;
                    document.cookie = "email=" + email + ";domain=" + domain;
                    window.dispatchEvent(firbaseEvent);

                });
            }).catch(error => {
                $this.button('reset');
                $('#signup-email').tooltip('show'); //show 請輸入電子郵件
                $('#signup-email').tooltip('show');
                setTimeout(function() {
                    $('#signup-email').tooltip('destroy');
                }, 10000);
            });
    }
};

function showError(msg) {
    $('.error-notify').hide();
    $('.error-notify').text('');
    $('.error-notify').append(msg);
    $('.error-notify').show();
}