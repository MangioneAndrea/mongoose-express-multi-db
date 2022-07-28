# mongoose-express-multi-db

> :warning: Even if I'm actively working on it, the library is still in beta. Use it at your own risk

## motivation
For multitenant projects you might have the need to have multiple connections to a mongoDB instance where each tenant has its own database. Sadly mongoose does not allow this, as it does not allow reusing a connection for different databases. With the native mongoDB client it's not an issue at all. Using mongoose makes it insanely hard to do!

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Installation is done by running
```console
$ npm install mongoose-express-multi-db
```

## Usage
### JS

#### simple
The following example will get the db name from the origin and apply it to search for the db. (in this case it will be the db `localhost`)
```javascript
    const mongooseMiddleware = require("mongoose-express-multi-db")

    ...

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

#### db depends on something else
This example shows how the db can be chosen by different factors like a jwt token if you have always the same origin :). Here you can also verify that no other db is being accessed (you should always watch out nobody touches the admin db!)
```javascript
    const mongooseMiddleware = require("mongoose-express-multi-db")
    const jwt = require('jsonwebtoken')
        
    ...

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
#### express ends before the server closes (avoid memory leaks)
If you are testing the functions the connections should be closed before opening them again. This is a common issue with jest or mocha. So just write something like this
```javascript
    const mongooseMiddleware, {killMiddlewareConnections} = require("mongoose-express-multi-db")

    ...

    app.use(mongooseMiddleware({
        mongoUri: "mongodb://localhost:27017/",
        modelsPaths: "absolute/path/to/models"
    }))

    server = app.listen(PORT, () => console.log(`server started: Port:${PORT}`));
    server.addListener("close", () => killMiddlewareConnections(app))
```

### TS
#### Add model typings
In order to get typings you need to define what models do what. You might put the `type KnownModels` in a separate file. You have to update it each time you need it in order not to have type errors
```ts

import mongooseMiddleware, {Tenant} from "mongoose-express-multi-db"
...

// You can use the type or the type of the model, it has the same result
import type MyCollectionModel from "absolute/path/to/models/MyModel"
import { MyType } from "absolute/path/to/models/MyModel"

type KnownModels = {
    FromModel: typeof MyCollectionModel, // Model<MyCollection> (Model<{name:string}>)
    FromType: MyType // MyType ({name:string})
}

declare global {
    namespace Express {
        interface Request {
            tenant: Tenant<KnownModels>
        }
    }
}
app.use(mongooseMiddleware<KnownModels>({
    mongoUri: uri,
    modelsPaths: "absolute/path/to/models"
}))

// Works the same with models and types
const MyElement1 = req.tenant.getModel("FromModel").findOne().lean() // {name:string} | null
const MyElement2 = req.tenant.getModel("FromInterface").findOne().lean() // {name:string} | null

```