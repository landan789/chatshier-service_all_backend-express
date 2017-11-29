$(document).ready(function() {
    console.log(window.location);
    let www = 'www' + window.location.host.substr(7);
    $('#terms').attr('href', 'https://' + www + '/terms.html');
    $('#privacy').attr('href', 'https://' + www + '/privacy.html');
    $(document).on('click', '#signup', register); //註冊
});

function register(event) {
    event.preventDefault();
    let name = document.getElementById('signup-name').value;
    let email = document.getElementById('signup-email').value;
    let password = document.getElementById('signup-password').value;
    let passwordConfirm = document.getElementById('signup-password-confirm').value;
    if (name === '') {
        showError('請輸入姓名。');
    } else {
        if (password === passwordConfirm) {
            auth.createUserWithEmailAndPassword(email, password).then(() => {
                database.ref('users/' + auth.currentUser.uid).set({
                    name: name,
                    nickname: name,
                    email: email,
                    password: password
                });
            }).catch(error => {
                showError(error.message);
            });
        } else {
            showError('兩組密碼不符。');
        }
    }
};

function showError(msg) {
    $('.error-notify').hide();
    $('.error-notify').text('');
    $('.error-notify').append(msg);
    $('.error-notify').show();
}