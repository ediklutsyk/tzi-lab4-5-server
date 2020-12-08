const {v4: uuidv4} = require('uuid');

const userRoutes = (app, fs) => {

    // variables
    const usersDataPath = './data/users.json';
    const sessionsDataPath = './data/sessions.json';
    const weakPasswordsList = [
        "123456",
        "password",
        "12345678",
        "1234",
        "dragon",
        "qwerty",
        "letmein",
        "seball",
        "master",
        "pass",
        "hunter",
        "batman",
        "superman",
        "secret",
        "111111",
        "cheese"
    ];

    // helper methods
    const readFile = (callback, returnJson = false, filePath = usersDataPath, encoding = 'utf8') => {
        fs.readFile(filePath, encoding, (err, data) => {
            if (err) {
                throw err;
            }
            callback(returnJson ? JSON.parse(data) : data);
        });
    };

    const writeFile = (fileData, callback, filePath = usersDataPath, encoding = 'utf8') => {
        fs.writeFile(filePath, fileData, encoding, (err) => {
            if (err) {
                throw err;
            }
            callback();
        });
    };

    const findAll = (callback) => {
        readFile(data => {
            callback(data);
        }, true);
    }

    const save = (user, callback) => {
        findAll((data) => {
            let users = [...data];
            let userById = users.findIndex(item => item.id === user.id);
            if (userById === -1) {
                users.push(user);
                console.log(users)
                writeFile(JSON.stringify(users, null, 2), () => {
                    callback();
                });
            } else {
                users[userById] = user
                writeFile(JSON.stringify(users, null, 2), () => {
                    callback();
                });
            }
        });
    }

    const countSession = (userId, callback) => {
        readFile(data => {
            callback(data.filter(item => item.userId === userId).length)
        }, true, sessionsDataPath);
    }

    const createNewSession = (userId, callback) => {
        readFile(data => {
            let session = {
                id: uuidv4(),
                userId: userId
            }
            data.push(session)
            writeFile(JSON.stringify(data, null, 2), () => {
                callback(session.id);
            }, sessionsDataPath);
        }, true, sessionsDataPath);
    }

    const logoutAll = (userId, callback) => {
        readFile(data => {
            data = data.filter(item => item.userId !== userId)
            writeFile(JSON.stringify(data, null, 2), () => {
                callback();
            }, sessionsDataPath);
        }, true, sessionsDataPath);
    }

    const validateSession = (sessionId, callback) => {
        readFile(data => {
            let session = data.find(item => item.id === sessionId)
            if (session !== undefined) {
                return callback(true)
            }
            return callback(false)

        }, true, sessionsDataPath);
    }

    const logout = (sessionId, callback) => {
        readFile(data => {
            data = data.filter(item => item.id !== sessionId)
            writeFile(JSON.stringify(data, null, 2), () => {
                callback();
            }, sessionsDataPath);
        }, true, sessionsDataPath);
    }

    // Add headers
    app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });


    app.post('/sign-in', (req, res) => {
        findAll((data) => {
            let user = data.find(item => item.username === req.body.username);
            if (user !== undefined) {
                if (user.password === req.body.password) {
                    if (req.body.lga === true) {
                        logoutAll(user.id, () => {
                            createNewSession(user.id, (data) => {
                                return res.status(200).json({id: data});
                            });
                        })
                    } else {
                        countSession(user.id, (data) => {
                            console.log('count sessions', data)
                            if (data < 3) {
                                createNewSession(user.id, (data) => {
                                    return res.status(200).json({id: data});
                                });
                            } else {
                                return res.status(200).json({message: 'Session limit'});
                            }
                        })
                    }
                } else {
                    return res.status(200).json({message: 'Wrong pass'});
                }
            } else {
                return res.status(200).json({message: 'Wrong username'});
            }
        }, true);
    })

    app.get('/users', (req, res) => {
        findAll((data) => {
            res.json(data);
        })
    });

    app.post('/users', (req, res) => {
        findAll(data => {
            if (weakPasswordsList.includes(req.body.password)){
                res.status(200).json({message: 'Password is too weak, please try another one'});
            } else {
                let user = {
                    ...req.body,
                    id: data.length + 1
                };
                save(user, () => {
                    res.status(200).json({id: user.id});
                })
            }
        });
    });

    app.get('/validate/:id', (req, res) => {
        const sessionId = req.params["id"];
        validateSession(sessionId, (data) => {
            if (data) {
                res.status(200).json({status: 'valid'});
            } else {
                res.status(400).json({status: 'invalid'});
            }
        })
    });

    app.get('/logout/:id', (req, res) => {
        const sessionId = req.params["id"];
        logout(sessionId, () => {
            res.status(200).json({message: 'ok'});
        })
    });

};

module.exports = userRoutes;