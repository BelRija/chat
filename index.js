var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var router = express.Router();
const bodyParser = require('body-parser');
var fs  = require('fs');
var path = require('path');
let port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;

//Array with users as object
var clientsobj=[];
var currentUsername;

// Add this line below
app.use(bodyParser.urlencoded({ extended: false }));
// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: 'application/*+json' }));
// parse an HTML body into a string
app.use(bodyParser.text({ type: 'text/html' }));
app.use(bodyParser.json());
// app.use(bodyParser());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST,GET,PUT,DELETE");
  next();
});

//-------- Get the path to the `public` folder.
//-------- __dirname is the folder that `index.js` is in.
var publicPath = path.resolve(__dirname, 'public');

//-------- Serve this path with the Express static file middleware.
app.use(express.static("public"));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/login.html');
});
 
//--------POST login

app.post('/login',function(req,res){
  res.sendFile(__dirname + '/public/chat.html');
});

app.post('/chatroom', function(req, res) {
  //the name from login field
  var username = req.body.username;  
  var clients=getArrayWithNames();
  if(username!=null)
  //if the list is no empty
  if(clients.length!=0){
    for(var i=0; i < clients.length; i++){ 
      //check the name
      if(username===clients[i]){
        //if user with the same name already exists - go back to login site with the feedback message
        res.redirect("login.html"+"?e="+ encodeURIComponent('Incorrect username')); 
      }  
    }
  }
  // console.log("New user: "+username); 
  //add the name into the list
  clients.push(username); 
  currentUsername=username;
  res.sendFile(__dirname + '/public/chat.html');
});

//-------- Connection --------
io.on('connection', function(socket){
    console.log('-> a user connected: ');
    if(currentUsername!=null)
    socket.emit('get username', currentUsername); //connect user´s name
    var username=currentUsername;

  //send the message to all other user
    socket.broadcast.emit('connected',username);
  
  //add the object with the username and socket id to the array
    clientsobj.push({'name':username,'id':socket.id});

  //send the list with names to all users (sockets?)
    io.emit("get users",getArrayWithNames());

//-------- Chat-Message --------
    socket.on('chat message', function(msg){  
    //  msg=msg+happyOrUnhappy(msg);

      //send the message to all users
      io.emit('chat message', msg);     
    });
//-------- Private message --------
    socket.on('private message',function(msg){
      //create message object
      var message={'from':msg.from,'message':msg.message,"to":msg.to};

      // sending to individual socketid
      io.to(getId(msg.to)).emit('private message', message); //receiver
      io.to(socket.id).emit('private message', message); //sender
    });

 //-------- User disconnect --------     
    socket.on('disconnect', function(){
      console.log('user disconnected ');
      //delete the disconnected user from array
      deleteUser(username);
      //send the updated array in order to update the list with users
      io.emit("get users",getArrayWithNames());
      //send the message to all other user
      socket.broadcast.emit('disconnected',username);
    });
  });

app.use('/',router);

//---------Outgoing message with file (post method)--------------------
//-------------------------------------------
var busboy = require('connect-busboy');
app.use(busboy());
//-------------------------------------------
app.post('/file', function(req, res){
  //Stream
  var fstream;
  //create message-object
  var msg={ 'path':"",'fileName':"",'fileType':"","file":"","from":"","to":"","private":""};

    req.pipe(req.busboy);
    var private=false; 
    //additions (senders and receivers names and private-check)
    req.busboy.on('field', function(key, value,keyTruncated, valueTruncated){
      if(key==="from")
        msg.from=value; //sender´s name
      if(key==="private"){
        if(value=="true")
          msg.private=true//private message
      }
      if(key==="to")
        msg.to=value;//receiver´s name
   });
   //sent file
    req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
      //create Stream
      fstream = fs.createWriteStream(path.resolve(__dirname+"/test/"+filename));
      file.pipe(fstream);
      var bufs = [];      
      file.on('data',function(data) {
        bufs[bufs.length] = data;
      }).on('end', function() {
        var buf = Buffer.concat(bufs);
        //pipe 
        res.pipe(file);
        //fill the message
        msg.path=file.path;
        msg.fileName=filename;
        msg.fileType=mimetype;
        //file in base64 format
        msg.file=buf.toString('base64');
        //*private message
        if(msg.private){
          io.to(getId(msg.to)).emit('file', msg); //receiver
          io.to(getId(msg.from)).emit('file', msg); //sender
          //chat message (to all)
        }else io.sockets.emit('file', msg);  
      });
      //close stream, send feedback to response
          fstream.on('close', function () {
          res.send('success!');
        });
    });
  });

//-------- get the array with names of all users --------
function getArrayWithNames(){
  var array=[];
  if(clientsobj.length!=0){
    for(var i=0;i<clientsobj.length;i++){
      array.push(clientsobj[i].name);
    }
  }
  // console.log("Array with all users objects: "+JSON.stringify(clientsobj));
  return array;
}

//-------- get client ID by username --------
function getId(username){
  var id;
  if(username!=null)
    if(clientsobj.length!=0)
      for(var i=0;i<clientsobj.length;i++){
        if(username==clientsobj[i].name){
          id=clientsobj[i].id;
        }
      }
  return id;
}

//-------- delete user from Array --------
function deleteUser(username){
  if(username!=null)
    if(clientsobj.length!=0){
      for(var i=0;i<clientsobj.length;i++){
        if(username==clientsobj[i].name){
          var obj={"name":clientsobj[i].name,"id":clientsobj[i].id};
          clientsobj.splice(clientsobj.findIndex(arr => arr.name==username),1);  
        }  
      }
    }
}




/*
	return toneRequest
*/
function createToneRequest (request) {
	let toneChatRequest;

  if (request.texts) {
	 toneChatRequest = {utterances: []};

	 for (let i in request.texts) {
	  let utterance = {text: request.texts[i]};
	   toneChatRequest.utterances.push(utterance);
	 }
  }

  return toneChatRequest;
}

/*
	return state of happyness
*/
function happyOrUnhappy (response) {
  const happyTones = ['satisfied', 'excited', 'polite', 'sympathetic'];
  const unhappyTones = ['sad', 'frustrated', 'impolite'];

  let happyValue = 0;
  let unhappyValue = 0;

  for (let i in response.utterances_tone) {
    let utteranceTones = response.utterances_tone[i].tones;
    for (let j in utteranceTones) {
      if (happyTones.includes(utteranceTones[j].tone_id)) {
        happyValue = happyValue + utteranceTones[j].score;
      }
      if (unhappyTones.includes(utteranceTones[j].tone_id)) {
        unhappyValue = unhappyValue + utteranceTones[j].score;
      }
    }
  }

  if (happyValue >= unhappyValue) {
    return 'happy';
  }else {
    return 'unhappy';
  }
}

/*
Tone API IBM
*/
app.post('/tone', (req, res, next) => {
	
  let toneRequest = createToneRequest(req.body);
  console.log("request  "+ toneRequest);

  if (toneRequest) {console.log("toneRequest: "+ toneRequest);

    toneAnalyzer.tone_chat(toneRequest, (err, response) => {
      if (err) {
        return next(err);
      }
      let answer = {mood: happyOrUnhappy(response)};

      return res.json(answer);
	});
	
  } else {
    return res.status(400).send({error: 'Invalid Input'});
  }

});




// --- Start the server ---
http.listen(port, function(){
  console.log('listening on *:'+ port);
});