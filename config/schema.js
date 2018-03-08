const READ = 'READ';
module.exports = {
    APP_CHATROOM_MESSAGE: {
        text: '',
        type: 'text',
        messager_id: '',
        from: '',
        time: Date.now(),
        isDeleted: 0
    },
    GROUP: {
        name: '',
        app_ids: '',
        updatedTime: Date.now(),
        createdTime: Date.now(),
        isDeleted: 0
    },
    GROUP_MEMBER: {
        user_id: '',
        status: 0, // 0 邀請中 ; 1 已加入
        type: READ, // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
        isDeleted: 0,
        updatedTime: Date.now(),
        createdTime: Date.now()
    },
    USER: {
        company: '',
        phone: '',
        address:'',
        group_ids: [],
        createdTime: Date.now(),
        updatedTime: Date.now()
    }
};