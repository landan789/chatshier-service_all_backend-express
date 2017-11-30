var serviceUrl = location.host;
var domain = serviceUrl.replace(/^[\w\-]+\./i, '.').replace(/\:\d+$/i, '');

// Initialize Firebase
firebase.initializeApp(config);
const auth = firebase.auth();
const database = firebase.database();
// log in status
auth.onAuthStateChanged(user => {
    if (user) {
        getProfile();
        if (location.pathname === '/login' || location.pathname === '/signup') {
            location = '/chat';
        }
    } else if (!user && (location.pathname === '/login' || location.pathname === '/signup')) {
        document.cookie = "name=; email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; " + "domain=" + domain;
        console.log('need to sign in');
    } else {
        location = '/login';
        console.log('need to sign in');
    }
});
// functions
function logout() {
    auth.signOut()
        .then(response => {
            location = '/login';
        })
}

function getProfile() {
    let uid = auth.currentUser.uid;
    console.log(uid);
    database.ref('users/' + uid).once('value', data => {
        let profile = data.val();
        let name = profile.name;
        let email = profile.email;
        document.cookie = "name=" + name + "email=" + email + ";domain=" + domain;
        console.log(name);
    });
}