require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const cors = require('cors');


const adminRoute = require('./routes/adminRoute');
const parentRoute = require('./routes/parentRoute');

// express app
const app = express();
app.use(express.json());


// connect to mongodb & listen for requests
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err));
    

// register view engine
app.set('view engine', 'ejs');


// middleware & static files
app.use(cors())
app.use(express.json())
app.use(morgan('dev'));
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())



// let uri = ""; // Declare the 'uri' variable

app.use(session({
    secret: "Keybord",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: dbURI
    }),

}))

app.use('/' , adminRoute);
app.use('/parent' , parentRoute);



// app.use((req, res) => {
//   res.status(404).render('404', { title: '404' });
// });
