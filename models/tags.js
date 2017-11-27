var admin = require("firebase-admin"); //firebase admin SDK
var utility = require('../helpers/utility');
var tags = {};
tags.get = function(callback){
  admin.database().ref().child('tags').once('value', snapshot=> {
    let tagsData;
    if(snapshot.val() !== null){
      tagsData = snapshot.val().Data;
    } else {
      let data = require("../config/default-tag.json");
      tagsData = data.Data;   //這行是只將default tag放進前端，但不存進firebase
      console.log('default tags loaded');
    }
    for( let i=0; i<tagsData.length; i++ ) {
      tagsData[i].name = utility.translateTag(tagsData[i].name, "english", "chinese");
    }
    callback(tagsData);
  });
};
tags.update = obj => {
  for( let i=0; i<obj.Data.length; i++ ) {
    obj.Data[i].name = utility.translateTag(obj.Data[i].name, "chinese", "english");
  }
  admin.database().ref().child('tags').update(obj);
};
module.exports = tags;
