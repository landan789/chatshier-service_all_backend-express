if ('undefined' === typeof window.urlConfig) {
    console.warn('Please set up the configuration file of /config/url-config.js');
}
var serviceUrl = location.host;
var wwwUrl = serviceUrl.replace(/^[\w\-]+\./i, 'www.').replace(/\:\d+$/i, '');

urlConfig.wwwwUrl = urlConfig.wwwUrl.replace(/^https?\:\/\//i, '');
var url = 'http://' + ('' === urlConfig.wwwwUrl ? wwwUrl : urlConfig.wwwUrl) + ('' === urlConfig.port ? '' : ':' + urlConfig.port);
var indexUrl = url + urlConfig.index;
$(document).ready(function() {
    $('#index').attr('href', indexUrl);
    $('[data-toggle="tooltip"]').tooltip('show'); //避免蓋掉"請填寫這個欄位"
    $('[data-toggle="tooltip"]').tooltip('destroy'); //避免蓋掉"請填寫這個欄位"
    $(document).on('click', '#login-btn', login); //登入
});

function login(event) {
    //Button loading
    var $this = $(this);
    $this.button('loading');

    event.preventDefault();
    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(result => {
            let uid = auth.currentUser.uid;
            database.ref('users/' + uid).once('value', data => {
                let profile = data.val();
                let name = profile.name;
                let email = profile.email;
                document.cookie = "name=" + name + ";domain=" + domain;
                document.cookie = "email=" + email + ";domain=" + domain;
                window.dispatchEvent(firbaseEvent);
            });
        })
        .catch(error => {
            $this.button('reset'); //Button loading reset
            showError(error.message);

            console.log("password wrong!");
            $('#login-password').tooltip('show'); //show 密碼錯誤
            setTimeout(function() {
                $('#login-password').tooltip('destroy');
            }, 3000);
        });
}

function showError(msg) {
    $('.error-notify').hide();
    $('.error-notify').text('');
    $('.error-notify').append(msg);
    $('.error-notify').show();
}