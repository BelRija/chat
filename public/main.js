//on load the page
$(function () {

    var socket = io();
    var send_to="";
    var name="";
//get the name 
    socket.on('get username',function(username){
        if(username!=null)
            name=username;  
    });

//--------create/update list with usernames--------
    socket.on('get users', function(msg){ 
  
        $('#users').empty();
        for(var i=0; i < msg.length; i++){
            if(msg[i]!=null){
              //write the name of current user bold
                if(msg[i]==name) $('#users').append($('<li>'+'<b>'+msg[i]+'</b>'+'</li>'));
                else $('#users').append($('<li id="nam" class="nam" name="nam">'+msg[i]+'</li>'));
            }
        } 
    //when the name in list is clicked (*private message)
        $("#users li").click(function(){
            if($(this).text()!=name){
              //add the Name of receiver into the input field
              $('#inputField').val('[@'+$(this).text()+'] ');
              //save the name of receiver (*private message)
              send_to=$(this).text();
            }
          });
    });
  
    //-------- show the message in chat when
        // -------- new user connected
    socket.on('connected',function(data){
        if(data!=null)
            $('#messages').append($('<li id="newUser">'+' <strong>@'+data + '</strong> just joined the chat'+'</li>'));
    });
        // -------- user disconnected
    socket.on('disconnected',function(data){
        if(data.length!=0)
            $('#messages').append($('<li id="newUser">'+' <strong>@'+data + '</strong> just left the chat'+'</li>'));
    });
  
 //-------- "Send" button is clicked --------
    $('form').submit(function(){
        //INput file object
        var file=$('#sendFile')[0];
        var private = false;     

        //Input message field
        var message=$('#inputField').val();
    //if the message field not empty
        if(message.length!=0){
            //object with user´s name and message
            var msg = { "uname":name, "message":message};
            //*private message
            if(message.split(' ')[0].includes('@'+send_to)){   
                private=true;      
                //separate the receiver name from the message
                if(message.split(' ')[1].length!=0){
                    message=message.split(' ');
                    message.splice(0,1);
                    //message object include the names of receiver and sender and the message self
                    msg = { "to":send_to, "from":name, "message":message.join(' '), "private":private};
                    //send the message object
                    socket.emit('private message',msg);
                }
            //not private(to all users)
            }else {
                socket.emit('chat message', msg);  
            }       
          }
            
        //chek if the file added to send
        if($('#sendFile')[0].files.length!=0){          
        //data from Form for post to server
           var data = new FormData();
           //file
            data.append('file', file.files[0] );
            //additions
            data.append('from',name);//sender´s name
            data.append('private',private);//check for private message
            data.append('to',send_to);//receiver´s name
        //helper method
            sendFilePost(data);
        }
          //clear the input field after send
          $('#inputField').val('');
          //reset the form
          $("#inputFieldForm").get(0).reset();
          
        return false;
    });

//-------- Incoming message --------
    socket.on('chat message', function(msg){    
  
          //show new message in chat
        $('#messages').append($('<li>')
            .append($('<p id="from">'+'['+new Date()
                .toLocaleString().split(",")[1]+'] '+msg.uname+": "+'<b>'+msg.message+'</b>'+'</p>')));
          
        //auto-scroll to bottom
        window.scrollTo(0, document.getElementById('chat').scrollHeight);
    });
        
//-------- Incoming *private message --------
    socket.on('private message',function(msg){
        //when receiver´s screen show the name of sender otherwíse show the name of receiver
        if(msg.to!=name)
            msgAppends=" private message to "+"<strong>@"+msg.to+"</strong>";
        else msgAppends=" private message from "+"<strong>@"+msg.from+"</strong>"
        //Show the message
        if(msg.message.length!=0){
            $('#messages').append($('<li>')
                .append($('<p id="p_from">'+'['+new Date()
                    .toLocaleString().split(",")[1]+'] '+msgAppends+": "+'<b>'+msg.message+'</b>'+'</p>')));
    
            //scroll to bottom
            window.scrollTo(0, document.getElementById('chat').scrollHeight);
        }
    });

//--- when file added
   $('#sendFile').bind('change', function(e){
        //file-object
        var file = e.originalEvent.target.files[0];
    });

//Send message with the file via post message
    function sendFilePost(data){
        const promise = $.ajax({
          url: 'https://mychatcc.eu-de.mybluemix.net/file',
          type: "POST",
          data: data,
          processData: false,
          contentType: false,
          success: function(data){console.log("Success: "+data)},
          error: function(er){console.log("ERROR: "+er)}
        });	
    }

//--- receive file and show in the chatroom
    socket.on('file', function (msg) {
            //type of the incoming file (default "img")
            var type = "img";      
            var id='<p id="from">';
            var fileType=msg.fileType.split("/")[0];

            //if private message add the names of sender and receiver
            var msgAppends=msg.from;

            //when private - red text
            if(msg.private){
                id='<p id="p_from">';
                if(msg.to!=name) msgAppends=" private message to "+"<strong>@"+msg.to+"</strong>";
                else msgAppends=" private message from "+"<strong>@"+msg.from+"</strong>";
            }
            //when video
            if (fileType==='video')
                type = "video controls";
            if (fileType==='audio')
                type = "audio controls";

            // when video or image, show the content
            if (fileType==='image' || fileType==='video') {
                $('#messages').append($('<li id="media">'+''+id+'['+new Date()
                    .toLocaleString().split(",")[1]+'] '+ msgAppends +": "+
                        "<a target='_blank' rel='noopener'  download='"+msg.fileName + "' href='data:"+msg.fileType+";base64," + msg.file + "'><"+ type+" src='data:"+msg.fileType+";base64," +msg.file+"'></a>"+'</p>'+
                '</li>'));
            // show files as link to download and content( audio)
            }else{
                $('#messages').append($('<li id="media">'+''+id+'['+new Date()
                    .toLocaleString().split(",")[1]+'] '+msgAppends+": "+
                        "<a class='link' target='_blank' download='"+msg.fileName + "' href='data:"+msg.fileType+";base64," + msg.file + "'>"+"<"+ type+" src='data:"+msg.fileType+";base64," +msg.file+"'>"+msg.fileName+"</a>" +'</p>'+
                '</li>'));
            }
        //scroll to bottom
        window.scrollTo(0, document.getElementById('chat').scrollHeight);
    });

//-----when user disconnect, delete from the list
    function deleteUser(username){
        if(arr.length!=0){
          for(var i=0;i<arr.length;i++){
            if(username==arr[i].name)
            arr.splice(arr.indexOf(username),1);      
          }
        }
    }

});