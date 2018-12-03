var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');
var multer = require('multer')
var upload = multer({
    dest: 'C:/tmp'
});
var fs = require('fs');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017';
var app = express();

app.use(bodyParser.urlencoded({
    extended: true
})); //FALSE
app.use(bodyParser.json());

app.use(function (req, res, next) {
    // 设置响应头来处理跨域问题
    res.set({
        'Access-Control-Allow-Origin': '*'
    });

    next();
});
// 登陆的请求地址；localhost:3000/api/login.html
app.post('/api/login', function (req, res) {
    console.log(11);
    var username = req.body.username;
    var password = req.body.password;
    var admin = req.body.admin;
    console.log(username);
    console.log('==============================')
    console.log(admin);
    var results = {};

    MongoClient.connect(url, {
        useNewUrlParser: false
    }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '链接数据库失败';
            res.json(results);
            return;
        }
        //链接数据库。
        var db = client.db('shop'); //db.client
        //链接表。查询数据
        db.collection('user').find({
            username: username,
            password: password
        }).toArray(function (err, data) {
            if (err) {
                results.code = -1;
                results.msg = '查询失败';
            } else if (data.length <= 0) {
                results.code = -1;
                results.msg = '用户名或密码错误';
            } else {
                //登陆成功
                results.code = 0;
                results.msg = '登陆成功';
                results.data = {
                    nickname: data[0].nickname,
                    admin: data[0].admin
                };
            }
            client.close();
            res.json(results);
        });
    });
});


// 注册的请求地址http://localhost:3000/api/register
app.post('/api/register', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var nickname = req.body.nickname;
    var admin = req.body.admin;
    var sex = req.body.sex;
    var results = {};

    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '链接数据库失败';
            res.json(results);
            return;
        }
        var db = client.db('shop');
        //async 异步操作需要cb(结果出去)，才能进行下一步操作；
        async.series([
            function (cb) {
                db.collection('user').find({
                    username: username
                }).count(function (err, num) {
                    if (err) {
                        console.log(err);
                        // return err;
                        results.code = -1;
                        results.msg = '查询失败';
                        cb(err);
                    } else if (num > 0) {
                        console.log('========')
                        //这个人已经注册了，
                        results.code = -1;
                        results.msg = '注册失败';
                        cb(err)
                    } else {
                        //可以注册了
                        cb(null);
                    }
                });

            },
            function (cb) {
                db.collection('user').insertOne({
                    username: username,
                    password: password,
                    nickname: nickname,
                    sex: sex,
                    admin: admin
                }, function (err, data) {
                    console.log(111);
                    if (err) {
                        results.code = -1;
                        results.msg = '查询失败';
                        console.log(err);
                        cb(err)
                    } else {
                        console.log(data)
                        results.code = 0;
                        results.msg = '注册成功';
                        results.data = {
                            nickname: nickname
                        };
                        cb(null)
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                console.log(err);
                res.send(err)
                //ajax 状态码response,证明程序一直在判断，需要res.send(结果出去)
            } else {
                console.log(result);
                res.send(results);
            }
            client.close();
        });
    });

});



// 用户页面的请求地址 http://localhost：3000/api/users
app.post('/api/users', function (req, res) {
    //分页
    var page = parseInt(req.body.page) || 1; //页码
    var pageSize = parseInt(req.body.pageSize) || 5; //每页显示5条
    var totalSize = 0; //总条数 
    var data = [];
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '链接数据库失败';
            res.json(results);
            return;
        }
        var db = client.db('shop');
        //进行异步操作
        async.series([
            function (cb) {
                db.collection('user').find().toArray(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num.length;
                        console.log(totalSize);
                        cb(null);
                    }

                });
            },
            function (cb) {
                db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, data);
                    }
                });

            },

        ], function (err, result) {
            if (err) {
                res.send('error', {
                    message: '错误',
                    error: err
                });
            } else {
                var totalPage = Math.ceil(totalSize / pageSize); //总页数
                res.json({
                    list: result[1],
                    totalPage: totalPage,
                    pageSize: pageSize,
                    currentPage: page
                });
            }
            client.close();
        });

    });

});
//删除的请求地址
app.post('/api/delete', function (req, res) {
    var nickname = req.body.nickname;
    var results='';
    console.log('======');
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function (err, client) {
        if (err) {
            res.send('error', {
                message: '链接失败',
                error: err
            });
            return;
        }
        var db = client.db('shop');
        db.collection('user').deleteOne({
            nickname,
        }, function (err, data) {
            console.log(data);
            if (err) {
                res.send('error', {
                    message: '删除失败',
                    error: err
                })
            } else {
                results.code = 0;
                results.msg = '成功';
                results.data = {
                    nickname: nickname
            }
        }

            client.close();
        });
    });
});


// 手机管理的请求地址http://localhost:3000/api/phone
// app.post('/api/phone/add', upload.single('file'), function (req, res) {
//             // var phoneimg = req.body.phoneimg;
//             var phonename = req.body.phonename;
//             var phonestyle = req.body.phonestyle;
//             var phoneprice = req.body.phoneprice;
//             var secondprice = req.body.secondprice;
//             var results = {};
//             console.log(req);
//             var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
//             var newFileName = path.resolve(__dirname, '../public/', filename);
//             try {
//                 // fs.renameSync(req.file.path, newFileName);
//                 var data = fs.readFileSync(req.file.path);
//                 fs.writeFileSync(newFileName, data);

//                 // console.log(req.body);
//                 // res.send('上传成功');
//                 // 操作数据库写入y
//                 MongoClient.connect(url, {
//                     useNewUrlParser: true
//                 }, function (err, client) {
//                     if (err) {
//                         results.code = -1;
//                         results.msg = '链接数据库失败';
//                         res.json(results);
//                         return;
//                     }
//                     var db = client.db('shop');
//                     //async 异步操作需要cb(结果出去)，才能进行下一步操作；
//                     db.collection('phone').insertOne({
//                         phonename: phonename,
//                         // phoneimg: phoneimg,
//                         phonestyle: phonestyle,
//                         phoneprice: phoneprice,
//                         secondprice: secondprice,
//                         phoneName: req.body.phoneName,
//                         fileName: filename
//                     }, function (err, data) {
//                         if (err) {
//                             res.send('error', {
//                                 message: '添加失败',
//                                 error: err
//                             })
//                         } else {
//                             results.code = 0;
//                             results.message = '添加成功';
//                             res.send(results);
//                         }

//                         client.close();
//                     });

//                 });

//             });
app.post('/api/phone/add', upload.single('file'), function (req, res) {
    console.log(req.file);
    // 如果想要通过浏览器访问到这张图片的话，是不是需要将图片放到public里面去,
    //创建一个文件phoneImg，存储照片
    var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
    //给照片添加当前时间，相同照片可以传进来
    var newFileName = path.resolve(__dirname, './public/', filename);
    var phonename = req.body.phonename;
    var phonestyle = req.body.phonestyle;
    var phoneprice = req.body.phoneprice;
    var secondprice = req.body.secondprice;
    var results = {};

    console.log(newFileName);
    try {
        // fs.renameSync(req.file.path, newFileName);
        var data = fs.readFileSync(req.file.path);
        fs.writeFileSync(newFileName, data);

        // console.log(req.body);
        // res.send('上传成功');
        // 操作数据库写入
        MongoClient.connect(url, {
            useNewUrlParser: true
        }, function (err, client) {

            var db = client.db('shop');
            db.collection('phone').insertOne({
                fileName: filename,
                phonename: req.body.phonename,
                phonestyle: req.body.phonestyle,
                phoneprice: req.body.phoneprice,
                secondprice: req.body.secondprice,

            }, function (err) {
                if(err){
                    res.json({
                        code : -1,
                        msg : '添加失败'
                    })
                }else{
                    res.json({
                        code : 0,
                        msg : '成功'
                    })
                }
            });

        });
    } catch (error) {
        res.render('error', {
            message: '新增手机失败',
            error: error
        });
    }
});


//     //手机管理渲染数据
    app.post('/api/phone', function (req, res) {
        //分页
        var page = parseInt(req.body.page) || 1; //页码
        var pageSize = parseInt(req.body.pageSize) || 5; //每页显示5条
        var totalSize = 0; //总条数 
        var data = [];
        MongoClient.connect(url, {
            useNewUrlParser: true
        }, function (err, client) {
            if (err) {
                results.code = -1;
                results.msg = '链接数据库失败';
                res.json(results);
                return;
            }
            var db = client.db('shop');
            //进行异步操作
            async.series([
                function (cb) {
                    db.collection('phone').find().toArray(function (err, num) {
                        if (err) {
                            cb(err);
                        } else {
                            totalSize = num.length;
                            // console.log(totalSize);
                            cb(null);
                        }
                    });
                },
                function (cb) {
                    db.collection('phone').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, data);
                        }
                    });
                },
            ], function (err, result) {
                if (err) {
                    res.send('error', {
                        message: '错误',
                        error: err
                    });
                } else {
                    var totalPage = Math.ceil(totalSize / pageSize); //总页数
                    res.json({
                        list: result[1],
                        totalPage: totalPage,
                        pageSize: pageSize,
                        currentPage: page
                    });
                }
                client.close();
            });
        });
    });

//手机管理的分页接口


app.post('/api/phone', function (req, res) {
    //分页
    var page = parseInt(req.body.page) || 1; //页码
    var pageSize = parseInt(req.body.pageSize) || 5; //每页显示5条
    var totalSize = 0; //总条数 
    var data = [];
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '链接数据库失败';
            res.json(results);
            return;
        }
        var db = client.db('shop');
        //进行异步操作
        async.series([
            function (cb) {
                db.collection('phone').find().toArray(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num.length;
                        console.log(totalSize);
                        cb(null);
                   }
                });
            },
            function (cb) {
                db.collection('phone').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, data);
                    }
                });
            },
        ], function (err, result) {
            if (err) {
                res.send('error', {
                    message: '错误',
                    error: err
                });
            } else {
                var totalPage = Math.ceil(totalSize / pageSize); //总页数
                res.json({
                    list: result[1],
                    totalPage: totalPage,
                    pageSize: pageSize,
                    currentPage: page
                });
            }
            client.close();
        });

    });

});

app.listen(3000);