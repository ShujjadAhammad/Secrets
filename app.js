//jshint esversion:6
require('dotenv').config()
const express=require("express")
const bodyParser=require("body-parser")
const ejs=require("ejs")
const mongoose=require("mongoose")
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app=express();

app.use(express.static("public"))
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({
  extended:true
}))

app.use(session({
  secret:"Our little secret.",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

//to configure with resp to mongoose
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

//The createStrategy is responsible to setup passport-local LocalStrategy
passport.use(User.createStrategy());
//serializeUser determines which data of the user object should be stored in the session
// passport.serializeUser(User.serializeUser());
//Generates a function that is used by Passport to deserialize users into the session
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    console.log("user deserialize---------------------->")
    console.log(user);
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         console.log("user---------------------->")
         console.log(user);
         return done(err, user);
       });
  }
));

app.get("/",(req,res)=>{
  res.render("home");
})

app.get("/login",(req,res)=>{
  res.render("login");
})

app.get("/register",(req,res)=>{
  res.render("register");
})

app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}},(err,foundUser)=>{
    if(err){
      console.log(err)
    }
    else{
      if(foundUser)
      res.render("secrets",{usersWithSecrets:foundUser})
    }
  })
});

app.get("/submit",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.post("/submit",(req,res)=>{
  const submittedSecret=req.body.secret;
  User.findById(req.user.id,(err,foundUser)=>{
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save(()=>{
          res.redirect("/secrets")
        })
      }
    }

  })
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
//---------------------->Bcrypt code--------------------------->
//const bcrypt = require('bcrypt');
//const saltRounds = 5;-> required packages
// app.post("/register",(req,res)=>{
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//       // Store hash in your password DB.
//       const user=new User({
//         email:req.body.username,
//         password:hash
//       })
//       user.save((err)=>{
//         if(err){
//           console.log(err)
//         }
//         else{
//           res.render("secrets");
//         }
//       })
//   });
//
//
//
// })


app.post("/register",(req,res)=>{
User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    })
  }
});

})

app.get("/logout",(req,res)=>{
    req.logout();
    res.redirect('/');
});

// <-------------------bcrypt encryption------------>
//
// app.post("/login",(req,res)=>{
//   const username=req.body.username;
//   const password=req.body.password
//
//   User.findOne({email:username},(err,foundUser)=>{
//     if(err){
//       console.log(err);
//     }
//     else{
//       if(foundUser){
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//           // result == true
//           if(result===true){
//             res.render("secrets");
//           }
//       });
//
//
//       }
//     }
//   })
//
// })

app.post("/login",(req,res)=>{
  const user=new User({
    username:req.body.username,
    password:req.body.password
  })
   req.login(user,function(err){
     if(err){
       console.log(err)
     }
     else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       })
     }
   })


})


app.listen(3000,()=>{
  console.log("Server up and running");
})
