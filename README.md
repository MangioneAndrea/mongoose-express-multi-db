# mongoose-multi-db

> :warning: Even if I'm actively working on it, the library is still in beta. Use it at your own risk

## motivation
For multitenant projects you might have the need to have multiple connections to a mongoDB instance where each tenant has its own database. Sadly mongoose does not allow this, as it does not allow reusing a connection for different databases. With the native mongoDB client it's not an issue at all. Using mongoose makes it insanely hard to do!

## Usage

### simple (js)
The following example will get the db name from the origin and apply it to search for the db. (in this case it will be the db `localhost`)
```javascript
    const mongooseMiddleware = require("mongoose-multi-db")

    app.use(mongooseMiddleware({
        mongoUri: "mongodb://localhost:27017/",
        modelsPaths: "absolute/path/to/models"
    }))

    app.get("/user", (req, res)=>{
        const myCoolId = ...
        const user = req.tenant.getModel("users").findOne({_id: myCoolId}).lean()
        res.json(user)
    })
```

### db depends on something else (js)
This example shows how the db can be chosen by different factors like a jwt token if you have always the same origin :). Here you can also verify that no other db is being accessed (you should always watch out nobody touches the admin db!)
```javascript
    const mongooseMiddleware = require("mongoose-multi-db")
    const jwt = require('jsonwebtoken')

    app.use(mongooseMiddleware({
        mongoUri: "mongodb://localhost:27017/",
        modelsPaths: "absolute/path/to/models",
        getDBName: (req)=>{
            const token = req.headers.authorization.split(' ')[1]
            if(token){
                const decoded = jwt.verify(token, "mySecret")
                return decoded.targetDB
            }else{
                return "authdb"
            }
        }
    }))
```