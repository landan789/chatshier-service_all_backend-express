var admin = require("firebase-admin"); //firebase admin SDK
var utility = require('../helpers/utility');
var tags = {};
tags.get = function(callback){
    tags.getCustom( (tagsData) => {
        tags.getDefault( (defaultData) => {
            tags.getOrder( (orderData) => {
                let resultData = [];
                Object.assign(tagsData, defaultData);
                for( let i=0; i<orderData.length; i++ ) {
                    let id = orderData[i];
                    resultData.push({
                        "id": id,
                        "data": tagsData[id]
                    });
                }
                console.log(resultData);
                callback(resultData);
            })
        });
    });
};
tags.getDefault = function(callback){
  admin.database().ref().child('tags/default').once('value', snapshot=> {
    let tagsData = {};
    if(snapshot.val() !== null){
      tagsData = snapshot.val();
    } else {
      tagsData = require("../config/default-tag.json");
      admin.database().ref().child('tags/default').set(tagsData);
      console.log('default tags loaded');
    }
    for( let i in tagsData ) {
      tagsData[i].name = utility.translateTag(tagsData[i].name, "english", "chinese");
    }
    console.log(tagsData);
    callback(tagsData);
  });
};
tags.getCustom = function(callback){
  admin.database().ref().child('tags/custom').once('value', snapshot=> {
    let tagsData = {};
    if(snapshot.val() !== null){
      tagsData = snapshot.val();
    }
    console.log(tagsData);
    callback(tagsData);
  });
};
tags.getOrder = (callback) => {
    admin.database().ref().child('tags/order').once('value', snapshot=> {
        let order = [];
        if(snapshot.val() !== null){
            order = snapshot.val();
        }
        console.log(order);
        callback(order);
    });

}
tags.updateCustom = obj => {
    admin.database().ref().child('tags/custom').set(obj);
};
tags.updateOrder = (obj) => {
    admin.database().ref().child('tags/order').set(obj);
};
module.exports = tags;
