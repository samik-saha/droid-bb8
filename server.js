var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());


var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

var model = 'https://api.projectoxford.ai/luis/v1/application?id=c413b2ef-382c-45bd-8ff0-f76d60e2a821&subscription-key=a728fc8d1b7b45329ef42dcebd06ddb5';
var recognizer = new builder.LuisRecognizer(model);
//console.log(recognizer);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.matches('builtin.intent.reminder.create_single_reminder', [
    function (session, args, next){
        var reminder_text=builder.EntityRecognizer.findEntity(args.entities, 'builtin.reminder.reminder_text');
        var start_date=builder.EntityRecognizer.findEntity(args.entities, 'builtin.reminder.start_date');
        var start_time=builder.EntityRecognizer.findEntity(args.entities, 'builtin.reminder.start_time');
        
        var reminder=session.dialogData.reminder={
            reminder_text: reminder_text? reminder_text.entity:null,
            start_date: start_date? start_date.entity: null,
            end_date: start_time? start_time.entity: null
        };
        
        if (!reminder_text){
            builder.Prompts.text(session, 'What you wanted to be reminded about?');
        } else{
            next();
        }
    },
    
    function (session, results, next){
        var reminder = session.dialogData.reminder;
        if(results.response){
            reminder.reminder_text=results.response;
        }
        
        if (reminder.reminder_text && !reminder.start_time){
            builder.Prompts.text(session, 'When do you want to set the reminder?');
        }else{
            next();
        }
    },
    
    function (session, results){
        var reminder=session.dialogData.reminder;
        if (results.response){
            reminder.start_time=results.response;
        }
        
        if (reminder.reminder_text && reminder.start_time){
            session.send('Reminder added with message "%s" at "%s"', reminder.reminder_text, reminder.start_time);
        } else{
            session.send('Ok... no problem');
        }
    }
    
    
    ]);

dialog.onDefault([
    function (session, args, next) {
        if (!session.userData.name){
            session.beginDialog('/profile')
        }
        else{
            next()
        }
    },
    function (session, results){
        session.send("Hello %s!", session.userData.name);
    }
]);

dialog.matches(/^change name/i,[
    function (session){
        session.beginDialog('/profile');
    },
    function (session, results){
        session.send('Ok... Changed your name to %s', session.userData.name);
        session.endDialog();
    }
]);


//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session,"Hi! What is your name?");
    },
    function (session, results){
        session.userData.name=results.response
        session.endDialog();
    }
]);