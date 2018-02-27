# Chatshier 錢掌櫃

## **一、資料夾**

### 1. bin
系統開始服務的地方  
npm start指令的起始點(./bin/www)

### 2. config
全域的設定檔
* 錯誤/成功格式訊息  
* 資料庫設定檔  
* 群組/聊天室的資料庫格式  
* Socket設定

### 3. controllers
執行對應api路徑下的需求取得models的資料  
處理完後把資料傳給前端

### 4. cores
內部核心功能  
* controllers - 用來管理群組跟使用者驗證

### 5. helpers
處理內部server端的函式庫
* cipher - 使用cipher套件把接收的訊息加密
* timer - 操作時間的格式至unix time
* utility - 判斷接收訊息的類型並轉換該類型的顯示方式 範例：圖檔要新增img標籤
* bot - 接收訊息後的判斷，使否有需要回覆訊息
* facebook - facebook bot的訊息判斷


### 6. middlewares
中介函式
* web token - 使用者token判斷是否有權限
* bot parse - 接收webhook後判斷使用者是否有權限

### 7. models
處理資料庫存取的地方  
一個檔案代表一個資料庫集合(collection)

### 8. public
處理client端的檔案
* config - client端的firebase, socket, chatshier設定
* css - stylesheet資料夾
* image - 圖檔資料夾
* js - javascript client端資料夾
* json - 專案格式檔
* lib - 函式庫(含bootstrap, font-awesome, fullcalendar等)

### 9. routes
處理view engine跟api的路徑
* api.js - api路徑，使用controllers取得資料
* index.js - view engine的路徑

### 10. schedules
排程功能

### 11. services
處理外部server端的函式庫
* bot.js - LINE跟Facebook bot的訊息接收

### 12. sockets
所有跟socket有關的事情都在這裡處理
* controllers - socket的處理
* index.js - 處理socket的檔案

### 13. typings
Typescript的設定檔, 介面

### 14. view
網頁的畫面

view engine: ejs

## **二、檔案**

### 1. eslintrc
ES Lint的設定檔

### 2. app.js
執行中介軟體(middlewares)的檔案

### 3. package.json
專案的設定檔

------------

# 下一段 Coding Style
