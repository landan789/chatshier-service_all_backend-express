// Initialize Firebase
firebase.initializeApp(config);
const auth = firebase.auth();
const database = firebase.database();
// log in status
if(window.location.pathname === '/login' || window.location.pathname === '/signup'){
  auth.onAuthStateChanged(user => {
    if(user){
      window.location = '/chat';
    } else {
      console.log('need to sign in');
    }
  });
} else {
  auth.onAuthStateChanged(user => {
    if(!user){
      window.location = '/login';
    }
  });
}
// functions
function logout(){
  auth.signOut()
  .then(response => {
    window.location = '/login';
  })
}
