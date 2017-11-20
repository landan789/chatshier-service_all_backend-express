$(document).ready(function() {
  $(document).on('click', '#login-btn', login); //登入
  $(document).on('click', '#google-log', googleLog); //Google登入
});

function login() {
  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  auth.signInWithEmailAndPassword(email, password).then(response => {}).catch(error => {
    showError(error.message);
  });
};

function showError(msg) {
  $('#log-error').hide();
  $('#log-error').text('');
  $('#log-error').append(msg);
  $('#log-error').show();
}
