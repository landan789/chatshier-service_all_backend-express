# Chatshier 錢掌櫃

## **資料夾**

### bin
系統開始服務的地方  

### config
錯誤/成功格式訊息  
資料庫設定檔  
群組/聊天室的資料庫格式  
Socket設定

### controllers
執行對應api路徑下的需求取得models的資料  
處理完後把資料傳給前端  
一個檔案代表一個資料庫集合(collection)

### cores
內部核心功能  
controllers用來管理群組跟使用者驗證

### helpers
處理內部server端的函式庫(cipher訊息加密, timer, utility, bot, facebook)


### middlewares
中介函式  
web token及bot parse的功能


### models
處理資料庫存取的地方  
一個檔案代表一個資料庫集合(collection)

### public
處理client端的檔案  
裡面包含javascripts, stylesheets, 圖檔, 設定檔, 函式庫(bootstrap, font-awesome, fullcalendar等)

### routes
處理view engine跟api的路徑  
api的路徑規劃，實際處理交給controllers  
view engine(ejs)的路徑在index.js規劃好，格式跟api一樣

### schedules
排程功能

### services
處理外部server端的函式庫  
LINE跟Facebook bot的訊息接收功能

### sockets
所有跟socket有關的事情都在這裡處理  
底下的controllers只在socket底下使用

### typings
Typescript的設定檔, 介面

### view
網頁的畫面

view engine: ejs

**檔案**

### .eslintrc
ES Lint的設定檔

### app.js
執行中介軟體(middlewares)的檔案

### package.json
專案的設定檔