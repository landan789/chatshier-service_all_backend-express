git submodule sync

git submodule update --init

# replace config file content and rename to react.chatshier
content="$(sed -e "s/window.config/const firebaseConfig/g" public/config/firebaseConfig.js)"
exportStr=" export default firebaseConfig;"
content="$content$exportStr"
rm -f react.chatshier/src/config/firebase.js
echo $content >> react.chatshier/src/config/firebase.js

content="$(sed -e "s/window.urlConfig/const urlConfig/g" public/config/url-config.js)"
exportStr=" export default urlConfig;"
content="$content$exportStr"
rm -f react.chatshier/src/config/url.js
echo $content >> react.chatshier/src/config/url.js

# enter submodule
cd react.chatshier

# git pull origin develop

npm update

npm run build

cd ..
# leave submodule

rm -Rf public/static

rm -f views/react.ejs

cp react.chatshier/build/index.html views/react.ejs

cp -R react.chatshier/build/static public/static
