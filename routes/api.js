var express = require('express');
var admin = require('firebase-admin');
var router = express.Router();

router.get('/', (req, res, next) => {
	admin.database().ref('users').once('value', snap => {
        let Data = snap.val();
        res.send(Data);
    });
});

router.get('/:id', (req, res, next) => {
	var id = req.params.id;
	admin.database().ref('users/' + id).once('value', snap => {
        let Data = snap.val();
        res.send(Data);
    });
});

module.exports = router;