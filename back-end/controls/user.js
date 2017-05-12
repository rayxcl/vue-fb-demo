let sql = require('../sql/sql');
let moment = require('moment');
let bcrypt = require('bcryptjs');
let func = require('../sql/func');

function formatData(rows) {
    return rows.map(row => {
        let date = moment(row.create_time).format('YYYY-MM-DD');
        let obj = {};

        switch (row.role) {
            case 1:
                obj.role = '普通用户';
                break;
            case 2:
                obj.role = '管理员';
                break;
            case 100:
                obj.role = '超级管理员';
        }

        delete row.password;

        return Object.assign({}, row, {create_time: date}, obj);
    });
}

module.exports = {

    fetchAll (req, res) {
        func.connPool(sql.queryAll, 'user', rows => {
            rows = formatData(rows);
            res.json(rows);
        });

    },

    // 添加用户
    addOne (req, res) {
        let name = req.body.name;
        let pass = req.body.pass;
        let role = req.body.role;
        let query = 'INSERT INTO user(user_name, password, role) VALUES(?, ?, ?)';

        // 密码加盐
        bcrypt.hash(pass, 10, (err, hash) => {
            if (err) console.log(err);

            pass = hash;

            let arr = [name, pass, role];

            func.connPool(query, arr, rows => {
                res.status(201).send('done');
            });

        });

    },


    // 删除用户
    deleteOne (req, res) {

        let id = req.body.id;

        func.connPool(sql.del, ['user', id], rows => {
            res.status(201).send('done');
        });

    },

    // 批量删除
    deleteMulti (req, res) {
        let id = req.body.id;

        func.connPool('DELETE FROM user WHERE id IN ?', [[id]], rows => {
            res.status(201).send('done');
        });

    },

    // 登录
    login (req, res) {
        let user_name = req.body.user_name;
        let pass = req.body.pass;

        func.connPool('SELECT * from user where user_name = ?', [user_name], rows => {

            if (!rows.length) {
                res.status(204).send('用户名不存在');
                return;
            }

            let password = rows[0].password;
            bcrypt.compare(pass, password, (err, sure) => {
                if (sure) {
                    let user = {
                        user_id: rows[0].user_id,
                        user_name: rows[0].user_name,
                        role: rows[0].role,
                    };

                    req.session.login = user;

                    res.status(201).json(user);
                } else {
                    res.status(204).send('密码错误');
                }
            });

        });

    },


    // 自动登录
    autoLogin (req, res) {
        let user = req.session.login;
        if (user) {
            res.status(201).send(user);

        } else {
            res.status(204).send('not found');
        }
    },

    // 注销
    logout (req, res) {
        req.session.login = null;

        res.status(201).send('done');
    },

    // 权限控制
    controlVisit (req, res, next) {
        if (req.session.login.role && req.session.login.role < 10) {
            res.status(204).send('权限不够');
            return;
        }

        next();
    },

    // 权限变更
    changeRole (req, res) {
        let role = req.body.role;
        let change_role = req.body.change_role;

        if (role < 10 || change_role === 100) {
            res.status(204).end();

            return;
        }

        let change_user = req.body.change_user;

        func.connPool('UPDATE user SET role= ? WHERE user_name = ?', [change_user], rows => {

            res.status(201).send('done');
        });

    },

};