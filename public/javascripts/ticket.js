/**
 * 宣告專門處理 Ticket 相關的 API 類別
 */
var TicketAPI = (function() {
    var responseChecking = function(response) {
        return Promise.resolve().then(function() {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then(function(respJson) {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * TicketAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    var ticketAPI = function(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有設定待辦事項
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.getAll = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 取得使用者某一個 App 的待辦事項
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.getOne = function(ticketAppId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 新增一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} newTicketData - 欲新增的待辦事項資料
     */
    ticketAPI.prototype.insert = function(ticketAppId, userId, newTicketData) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        var reqInit = {
            method: 'POST',
            headers: this.reqHeaders,
            body: JSON.stringify(newTicketData)
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 更新目標待辦事項資料
     *
     * @param {*} ticketAppId - 目標待辦事項的 App ID
     * @param {*} ticketId - 目標待辦事項的 ID
     * @param {*} userId - 使用者的 firebase ID
     * @param {*} modifiedTicketData - 已編輯後欲更新的待辦事項資料
     */
    ticketAPI.prototype.update = function(ticketAppId, ticketId, userId, modifiedTicketData) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        var reqInit = {
            method: 'PUT',
            headers: this.reqHeaders,
            body: JSON.stringify(modifiedTicketData)
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 刪除一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} ticketId - 目標待辦事項的 ID
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.remove = function(ticketAppId, ticketId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        var reqInit = {
            method: 'DELETE',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    return ticketAPI;
})();

var ChatshierAppAPI = (function() {
    var responseChecking = function(response) {
        return Promise.resolve().then(function() {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then(function(respJson) {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * TicketAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    var chatshierAppAPI = function(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有在 Chatshier 內設定的 App
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    chatshierAppAPI.prototype.getAll = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    return chatshierAppAPI;
})();

(function() {
    var ticketInfo = {};
    var agentInfo = {};

    var userId = '';
    var socket = io.connect();
    var jqDoc = $(document);
    var lastSelectedTicket = null;
    var ticketContent = null;
    var ticketAPI = new TicketAPI(null);
    var chatshierAppAPI = new ChatshierAppAPI(null);

    !urlConfig && (urlConfig = {}); // undefined error handle
    !urlConfig.apiUrl && (urlConfig.apiUrl = window.location.origin); // 預設 website 與 api server 為同一網域

    auth.ready.then(function(currentUser) {
        userId = currentUser.uid; // 儲存全域用變數 userId
        ticketContent = $('.ticket-content');
        ticketAPI.jwt = chatshierAppAPI.jwt = window.localStorage.getItem('jwt');
        ticketAPI.reqHeaders.set('Authorization', ticketAPI.jwt);
        chatshierAppAPI.reqHeaders.set('Authorization', chatshierAppAPI.jwt);

        // 等待 firebase 登入完成後，再進行 ticket 資料渲染處理
        if ('/ticket' === location.pathname) {
            jqDoc.on('click', '.ticketContent', showMoreInfo); // 查看待辦事項細節
            jqDoc.on('click', '#ticket-info-modify', modifyTicket); // 修改待辦事項
            // jqDoc.on('click', '.edit', showInput);
            // jqDoc.on('click', '.inner-text', function(event) {
            //     event.stopPropagation();
            // });
            jqDoc.on('focusout', '.inner-text', hideInput);
            jqDoc.on('keypress', '.inner-text', function(e) {
                if (13 === e.which) $(this).blur();
            });

            $('#ticket-info-delete').click(function() {
                var alertWarning = $('#alert-warning');

                alertWarning.find('p').html('是否要刪除表單?');
                alertWarning.show();
                alertWarning.find('#yes').off('click').on('click', function() {
                    alertWarning.hide();

                    return ticketAPI.remove(lastSelectedTicket.ticketAppId, lastSelectedTicket.ticketId, userId).then(function() {
                        loadTable();

                        var alertDanger = $('#alert-danger');
                        alertDanger.children('span').text('表單已刪除');
                        window.setTimeout(function() {
                            alertDanger.show();
                            window.setTimeout(function() { alertDanger.hide(); }, 3000);
                        }, 1000);
                    });
                });

                alertWarning.find('#no').off('click').on('click', function() {
                    alertWarning.hide();
                });
            });

            loadTable();
        } else if ('/tform' === location.pathname) {
            jqDoc.on('click', '#add-form-submit', submitAdd); // 新增 ticket
            jqDoc.on('click', '#add-form-goback', function() { location.href = '/ticket'; }); // 返回 ticket
            // loadAgentList();
            loadUserAllApps($('select#add-form-app'));
        }

        $('#ticket_search_bar').keyup(searchBar);
    });

    function loadTable() {
        ticketContent.empty();

        // 取得所有的 appId tickets
        return ticketAPI.getAll(userId).then(function(respJson) {
            for (var ticketAppId in respJson.data) {
                var tickets = respJson.data[ticketAppId].tickets;

                // 批此處理每個 tickets 的 app 資料
                for (var ticketId in tickets) {
                    var ticketData = tickets[ticketId];
                    if (ticketData.isDeleted) {
                        // 如果此 ticket 已被標注刪除，則忽略不顯示
                        continue;
                    }
                    ticketData.ticketId = ticketId;
                    ticketData.ticketAppId = ticketAppId;
                    ticketInfo[ticketId] = ticketData;

                    // 將每筆 ticket 資料反映於 html DOM 上
                    ticketContent.append(
                        '<tr id="' + ticketId + '" class="ticketContent" data-toggle="modal" data-target="#ticket-info-modal">' +
                        '<td style="border-left: 5px solid ' + priorityColor(ticketData.priority) + '">' + ticketData.requesterId + '</td>' +
                        '<td>' + (!ticketData.requester ? '' : ticketData.requester.name) + '</td>' +
                        '<td id="description">' + ticketData.description.substring(0, 10) + '</td>' +
                        '<td id="status" class="status">' + statusNumberToText(ticketData.status) + '</td>' +
                        '<td id="priority" class="priority">' + priorityNumberToText(ticketData.priority) + '</td>' +
                        '<td id="time">' + displayDate(ticketData.dueBy) + '</td>' +
                        '<td>' + dueDate(ticketData.dueBy) + '</td>' +
                        '</tr>');
                }
            }
        }).catch(function(error) {
            if ('401 Unauthorized' === error.message) {
                // 只有在 promise reject 會收到 401，代表 firebase 登入失敗，等待 100ms 後重新執行
                console.log('firebase retrying...');
                window.setTimeout(function() { loadTable(); }, 100);
            }
        });
    }

    function loadAgentList() {
        return new Promise(function(resolve, reject) {
            socket.emit('get agents profile', function(agentsProfile) {
                if (!agentsProfile) {
                    return reject(new Error('agents profile is undefined'));
                }
                var agentInfo = agentsProfile;
                var agentList = [];
                var agentKey = Object.keys(agentInfo);
                var optionStr;

                agentKey.map(function(agent) {
                    agentList.push({ name: agentInfo[agent].name, id: agent });
                });

                agentList.map(function(info) {
                    optionStr += '<option value="' + info.id + '">' + info.name + '</option>';
                });
                $('#add-form-agents').append(optionStr);
                resolve();
            });
        });
    }

    /**
     * 載入使用者所有的 app 清單，將清單儲存至選擇器中，供使用者選取 (/ticketForm 使用)
     *
     * @param {any} targetSelectElem - 目標選擇器元素(此需為 jquery 物件)
     */
    function loadUserAllApps(targetSelectElem) {
        if (!targetSelectElem) {
            return Promise.resolve();
        }

        return chatshierAppAPI.getAll(userId).then(function(respJson) {
            var appData = respJson.data;
            if (Object.keys(appData).length > 0) {
                targetSelectElem.empty();
                for (var appId in appData) {
                    targetSelectElem.append('<option value=' + appId + '>' + appData[appId].name + '</option>');
                }
            }
        });
    }

    // function showInput() {
    //     var prop = $(this).parent().children("th").attr("class");
    //     var original = $(this).text();
    //     if (prop.indexOf('due date') != -1) {
    //         var day = new Date(original);
    //         day = Date.parse(day) + 8 * 60 * 60 * 1000;
    //         day = new Date(day);
    //         // console.log(day);
    //         $(this).html("<input type='datetime-local' class='inner-text' value='" + day.toJSON().substring(0, 23) + "'></input>");
    //     } else if (prop == 'description') {
    //         $(this).html("<textarea  class='inner-text form-control'>" + original + "</textarea>");
    //     } else {
    //         $(this).html("<input type='text' class='inner-text' value='" + original + "' autofocus>");
    //     }
    // }

    function hideInput() {
        var change = $(this).val();
        if ('datetime-local' === $(this).attr('type')) {
            $(this).parent().html(displayDate(change));
        }
        $(this).parent().html("<textarea  class='inner-text form-control'>" + change + '</textarea>');
    }

    function showSelect(prop, n) {
        var html = "<select class='selected form-control'>";
        if ('priority' === prop) {
            html += '<option value=' + n + '>' + priorityNumberToText(n) + '</option>';
            for (var i = 1; i < 5; i++) {
                if (i === n) continue;
                html += '<option value=' + i + '>' + priorityNumberToText(i) + '</option>';
            }
        } else if ('status' === prop) {
            html += '<option value=' + n + '>' + statusNumberToText(n) + '</option>';
            for (var i = 2; i < 6; i++) {
                if (i === n) continue;
                html += '<option value=' + i + '>' + statusNumberToText(i) + '</option>';
            }
        } else if ('responder' === prop) {
            html += "<option value='未指派'>請選擇</option>";
            n.map(function(agent) {
                html += '<option value=' + agent.id + '>' + agent.name + '</option>';
            });
        }
        html += '</select>';
        return html;
    }

    /**
     * 顯示 ticket 更多資訊
     */
    function showMoreInfo() {
        var ticketId = $(this).attr('id');
        // var idNum = $(this).find('td:first').text();
        var ticketData = ticketInfo[ticketId];
        lastSelectedTicket = ticketData;

        var infoInputTable = $('.info_input_table').empty();
        return new Promise(function(resolve, reject) {
            // socket.emit('get agents profile', function(socketData) {
            //     if (!socketData) {
            //         return reject(new Error('no socket data.'));
            //     }
            //     var agentList = [];
            //     agentInfo = socketData; // 所有 agent 的名單物件
            //     Object.keys(agentInfo).map(function(agent) agentList.push({ name: agentInfo[agent].name, id: agent }));

            //     return database.ref('tickets/' + userId + '/t' + idNum).once('value', function(snapshot) {
            //         var value = snapshot.val();
            //         if (value) {
            //             $('option[value="' + value.owner + '"]').attr('selected', 'selected');
            //         }
            //     }).then(function() {
            //         resolve(agentList);
            //     });
            // });
            resolve([]);
        }).then(function(agentList) {
            $('#ID-num').text(ticketData.id).css('background-color', priorityColor(ticketData.priority));
            $('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticketData.priority));
            $('.modal-title').text(!ticketData.requester ? '' : ticketData.requester.name);

            var moreInfoHtml =
                '<tr>' +
                '<th>客戶ID</th>' +
                '<td class="edit">' + (!ticketData.requester ? '' : ticketData.requester.id) + '</td>' +
                '</tr>' +
                // '<tr>' +
                //     '<th class="agent">負責人</th>' +
                //     '<td class="form-group">' + showSelect('responder', agentList) + '</td>' +
                // '</tr>' +
                '<tr>' +
                '<th class="priority">優先</th>' +
                '<td class="form-group">' + showSelect('priority', ticketData.priority) + '</td>' +
                '</tr>' +
                '<tr>' +
                '<th class="status">狀態</th>' +
                '<td class="form-group">' + showSelect('status', ticketData.status) + '</td>' +
                '</tr>' +
                '<tr>' +
                '<th class="description">描述</th>' +
                '<td class="edit form-group">' +
                '<textarea class="inner-text form-control">' + ticketData.description + '</textarea>' +
                '</td>' +
                '</tr>' +
                '<tr>' +
                '<th class="time-edit">到期時間' + dueDate(ticketData.dueBy) + '</th>' +
                '<td class="form-group">' +
                '<input class="display-date-input form-control" type="datetime-local" value="' + displayDateInput(ticketData.dueBy) + '">' +
                '</td>' +
                '</tr>' +
                '<tr>' +
                '<th>建立日期</th>' +
                '<td>' + displayDate(ticketData.createdTime) + '</td>' +
                '</tr>' +
                '<tr>' +
                '<th>最後更新</th>' +
                '<td>' + displayDate(ticketData.updatedTime) + '</td>' +
                '</tr>';
            infoInputTable.append(moreInfoHtml);
        });
    } // end of showMoreInfo

    function displayDate(date) {
        var origin = new Date(date);
        origin = origin.getTime();
        var gmt8 = new Date(origin);
        var yy = gmt8.getFullYear();
        var MM = (gmt8.getMonth() + 1) < 10 ? '0' + (gmt8.getMonth() + 1) : (gmt8.getMonth() + 1);
        var dd = gmt8.getDate();
        var hh = gmt8.getHours() < 10 ? '0' + gmt8.getHours() : gmt8.getHours();
        var mm = gmt8.getMinutes() < 10 ? '0' + gmt8.getMinutes() : gmt8.getMinutes();
        var ss = gmt8.getSeconds() < 10 ? '0' + gmt8.getSeconds() : gmt8.getSeconds();
        return yy + '/' + MM + '/' + dd + ' ' + hh + ':' + mm + ':' + ss;
    }

    function dueDate(day) {
        var html = '';
        var nowTime = new Date().getTime();
        var dueday = Date.parse(displayDate(day));
        var hr = dueday - nowTime;
        hr /= 1000 * 60 * 60;
        // hr = Math.round(hr) ;
        // return hr ;
        if (hr < 0) {
            html = '<span class="overdue">過期</span>';
        } else {
            html = '<span class="non overdue">即期</span>';
        }
        return html;
    } // end of dueDate

    function displayDateInput(date) {
        var origin = new Date(date);
        origin = origin.getTime();
        var gmt8 = new Date(origin);
        var yyyy = gmt8.getFullYear();
        var MM = (gmt8.getMonth() + 1) < 10 ? '0' + (gmt8.getMonth() + 1) : (gmt8.getMonth() + 1);
        var dd = gmt8.getDate();
        var hh = gmt8.getHours() < 10 ? '0' + gmt8.getHours() : gmt8.getHours();
        var mm = gmt8.getMinutes() < 10 ? '0' + gmt8.getMinutes() : gmt8.getMinutes();
        var ss = gmt8.getSeconds() < 10 ? '0' + gmt8.getSeconds() : gmt8.getSeconds();
        return yyyy + '-' + MM + '-' + dd + 'T' + hh + ':' + mm + ':' + ss;
    } // end of displayDate

    function responderName(id) {
        // console.log(agentInfo);
        for (var i in agentInfo) {
            if (agentInfo[i].id === id) return agentInfo[i].contact.name;
        }
        return 'unassigned';
    } // end of responderName

    function submitAdd() {
        var requesterName = $('#add-form-name').val();
        var requesterId = $('#add-form-uid').val(); // 因為沒有相關可用的string，暫時先儲存在to_emails這個功能下面
        var requesterEmail = $('#add-form-email').val();
        var requesterPhone = $('#add-form-phone').val();

        // 驗證
        var emailReg = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;
        var phoneReg = /\b[0-9]+\b/;
        var errorElem = $('#error');
        var ticketAppId = $('select#add-form-app option:selected').val();

        if (!ticketAppId) {
            errorElem.append('請選擇App');
            window.setTimeout(function() {
                errorElem.empty();
            }, 3000);
        } else if (!emailReg.test(requesterEmail)) {
            errorElem.append('請輸入正確的email格式');

            var formEmail = $('#form-email');
            formEmail.css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                formEmail.css('border', '1px solid #ccc');
            }, 3000);
        } else if (!phoneReg.test(requesterPhone)) {
            errorElem.append('請輸入正確的電話格式');

            var formPhone = $('#form-phone');
            formPhone.css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                formPhone.css('border', '1px solid #ccc');
            }, 3000);
        } else if (!requesterId) {
            errorElem.append('請輸入clientId');

            var formSubject = $('#form-subject');
            formSubject.css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                formSubject.css('border', '1px solid #ccc');
            }, 3000);
        } else if (!$('#add-form-description').val()) {
            errorElem.append('請輸入說明內容');
            $('#add-form-description').css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                $('#add-form-description').css('border', '1px solid #ccc');
            }, 3000);
        } else if (!requesterName) {
            errorElem.append('請輸入客戶姓名');
            $('#add-form-name').css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                $('#add-form-name').css('border', '1px solid #ccc');
            }, 3000);
        } else {
            var status = parseInt($('#add-form-status option:selected').val());
            var priority = parseInt($('#add-form-priority option:selected').val());
            // var ownerAgent = $('#add-form-agents option:selected').val();
            var description = $('#add-form-description').val();

            var nowTime = new Date().getTime();
            var dueDate = nowTime + 86400000 * 3; // 過期時間設為3天後

            var newTicket = {
                createdTime: nowTime,
                description: !description ? '' : description,
                dueBy: dueDate,
                frDueBy: null,
                frEscalated: false,
                fwdEmails: [],
                isEscalated: false,
                priority: priority,
                replyCcEmails: [],
                requester: {
                    email: requesterEmail,
                    id: requesterId,
                    name: requesterName,
                    phone: requesterPhone
                },
                requesterId: requesterId,
                source: null,
                spam: null,
                status: status,
                subject: '',
                toEmails: [],
                type: null,
                updatedTime: nowTime
            };

            return ticketAPI.insert(ticketAppId, userId, newTicket).then(function() {
                window.location.href = '/ticket'; // 返回 ticket 清單頁
            });
        }
    }

    /**
     * 在 ticket 更多訊息中，進行修改 ticket 動作
     */
    function modifyTicket() {
        var modifyTable = $('#ticket-info-modal .info_input_table');
        modifyTable.find('input').blur();

        var ticketPriority = parseInt(modifyTable.find('th.priority').parent().find('td select').val());
        var ticketStatus = parseInt(modifyTable.find('th.status').parent().find('td select').val());
        var ticketDescription = modifyTable.find('th.description').parent().find('td.edit').text();
        var ticketDueBy = modifyTable.find('th.time-edit').parent().find('td input').val();

        // 準備要修改的 ticket json 資料
        var modifiedTicket = {
            ccEmails: lastSelectedTicket.ccEmails,
            createdTime: new Date(lastSelectedTicket.createdTime).getTime(),
            description: ticketDescription,
            dueBy: new Date(ticketDueBy).getTime(),
            frDueBy: new Date(lastSelectedTicket.frDueBy).getTime(),
            frEscalated: lastSelectedTicket.frEscalated,
            fwdEmails: lastSelectedTicket.fwdEmails,
            isEscalated: lastSelectedTicket.isEscalated,
            priority: ticketPriority,
            replyCcEmails: lastSelectedTicket.replyCcEmails,
            requester: lastSelectedTicket.requester,
            requesterId: lastSelectedTicket.requesterId,
            source: lastSelectedTicket.source,
            spam: lastSelectedTicket.spam,
            status: ticketStatus,
            subject: lastSelectedTicket.subject,
            toEmails: lastSelectedTicket.toEmails,
            type: lastSelectedTicket.type,
            updatedTime: new Date().getTime()
        };

        // 發送修改請求 api 至後端進行 ticket 修改
        return ticketAPI.update(lastSelectedTicket.ticketAppId, lastSelectedTicket.ticketId, userId, modifiedTicket).then(function() {
            loadTable();

            var alertSuccess = $('#alert-success');
            alertSuccess.children('span').text('表單已更新');
            window.setTimeout(function() {
                alertSuccess.show();
                window.setTimeout(function() { alertSuccess.hide(); }, 3000);
            }, 1000);
        }).catch(function(error) {
            console.error(error);
            var alertDanger = $('#alert-danger');
            alertDanger.children('span').text('表單更新失敗，請重試').show();
            window.setTimeout(function() { alertDanger.hide(); }, 4000);
        });
    }

    function ISODateTimeString(d) {
        d = new Date(d);

        function pad(n) {
            return n < 10 ? '0' + n : n;
        }
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function priorityColor(priority) {
        switch (priority) {
            case 4:
                return 'rgb(230, 100, 100)';
            case 3:
                return 'rgb(233, 198, 13)';
            case 2:
                return 'rgb(113, 180, 209)';
            case 1:
                return 'rgb(126, 215, 170)';
            default:
                return 'N/A';
        }
    }

    function statusNumberToText(status) {
        switch (status) {
            case 5:
                return 'Closed';
            case 4:
                return 'Resolved';
            case 3:
                return 'Pending';
            default:
                return 'Open';
        }
    }

    function priorityNumberToText(priority) {
        switch (priority) {
            case 4:
                return '急';
            case 3:
                return '高';
            case 2:
                return '中';
            default:
                return '低';
        }
    } // end of priorityNumberToText

    function searchBar() {
        var content = $('.ticket-content tr');
        var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
        content.show().filter(function() {
            var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text1.indexOf(val);
        }).hide();
    }

    // =========[SORT CLOSE]=========
    function sortCloseTable(n) {
        var table = $('.ticket-content');
        var rows;
        var switching = true;
        var i;
        var x;
        var y;
        var shouldSwitch;
        var dir = 'asc'; // Set the sorting direction to ascending:
        var switchcount = 0;

        // Make a loop that will continue until
        // no switching has been done:
        while (switching) {
            // start by saying: no switching is done:
            switching = false;
            rows = table.find('tr');
            // Loop through all table rows (except the
            // first, which contains table headers):
            for (i = 0; i < (rows.length - 1); i++) {
                // start by saying there should be no switching:
                shouldSwitch = false;
                // Get the two elements you want to compare,
                // one from current row and one from the next:
                x = rows[i].childNodes[n];
                y = rows[i + 1].childNodes[n];
                // check if the two rows should switch place,
                // based on the direction, asc or desc:
                if ('asc' === dir) {
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        // if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                } else if ('desc' === dir) {
                    if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        // if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            if (shouldSwitch) {
                // If a switch has been marked, make the switch
                // and mark that a switch has been done:
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                // Each time a switch is done, increase this count by 1:
                switchcount++;
            } else {
                // If no switching has been done AND the direction is "asc",
                // set the direction to "desc" and run the while loop again.
                if (0 === switchcount && 'asc' === dir) {
                    dir = 'desc';
                    switching = true;
                }
            }
        }
    }
})();
