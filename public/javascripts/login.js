$(document).ready(function() {
    document.cookie = "name=Ted"
    console.log(document.cookie);
    $(document).on('click', '#login-btn', login); //登入
});

function login(event) {
    event.preventDefault();
    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password).then(response => {

    }).catch(error => {
        showError(error.message);
    });
};

function showError(msg) {
    $('.error-notify').hide();
    $('.error-notify').text('');
    $('.error-notify').append(msg);
    $('.error-notify').show();
}