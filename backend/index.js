const express = require('express');

const mongoose = require('mongoose');

const routes = require('./routes/user_routes')

const cors = require('cors');

const cookieParser = require('cookie-parser');

const app = express()


app.use(cors({
    credentials:true,
    origin:['http://localhost:4200']
}))
app.use(cookieParser())

app.use(express.json())



app.use('/uploads',express.static('uploads'));

app.use("/api",routes);

mongoose.connect("mongodb://127.0.0.1:27017/jwtproject",{
    useNewUrlParser:true,
})
.then(() => {
    console.log("connected to database")
    app.listen(5000,()=>{
        console.log("App is listening on port 5000 ")
    })
})


   
