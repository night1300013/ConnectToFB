var Alexa = require('alexa-sdk');
var FB = require('fb');

const APP_ID = process.env.APP_ID;

// Messages used for Alexa to tell the user
var repeatWelcomeMessage = "you can say read my feed, or write a post using this skill.";

var welcomeMessage = "Welcome to connect to facebook, " + repeatWelcomeMessage;

var stopSkillMessage = "Bye! See you next time!";

var helpText = "You can say things like read my feed, or make a post, what would you like to do?";

var tryLaterText = "Please try again later."

var noAccessToken = "There was a problem getting the correct token for this skill, " + tryLaterText;

var anythingElse = "Is there anything else I can help with? You can read the feed, or make a post. Say stop to stop this skill."

var askPost = "What would you like to post?"

var cannotRecognize = "I don't know what you say. " + askPost

var accessToken = "";

var ua = require('universal-analytics');
var intentTrackingID = ua(process.env.UA_KEY);


const STATES = {
    STARTMODE: '_STARTMODE', //The mode can read or write the post
    FETCHMODE: '_FETCHMODE', //Try to fetch user's input
};

// Create a new session handler
const newSessionHandlers = {
   'NewSession': function () {
       this.handler.state = STATES.STARTMODE;
       // Access token is pass through from the session information
       accessToken = this.event.session.user.accessToken;

       // If we have an access token we can continue.
       if (accessToken) {
           FB.setAccessToken(accessToken);
           this.emit(':ask', welcomeMessage, repeatWelcomeMessage);
           var log = ("NewSession: Got the access token successfully").toString();
           intentTrackingID.event("success", log).send();
       }
       else {
           // If we dont have an access token, we close down the skill. This should be handled better for a real skill.
           this.emit(':tell', noAccessToken, tryLaterText);
           intentTrackingID.event("invalid request","NewSession: no access token").send();
       }
   },

   'AMAZON.CancelIntent': function () {
       // Triggered wheen user asks Alexa top cancel interaction
       this.emit(':tell', stopSkillMessage);
       var log = ("Cancel successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   'AMAZON.StopIntent': function () {
       // Triggered wheen user asks Alexa top stop interaction
       this.emit(':tell', stopSkillMessage);
       var log = ("Stop successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   // Triggered wheen user asks Alexa for help
   'AMAZON.HelpIntent': function () {
       this.emit(':ask', helpText, helpText);
       var log = ("Got help successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   // Triggered when no intent matches Alexa request
   'Unhandled': function () {
       this.emit(':ask', helpText, helpText);
       intentTrackingID.event("invalid request","cannot handle this request").send();
   }
 };

const startConnectHandlers = Alexa.CreateStateHandler(STATES.STARTMODE, {
   // Read fb feed handler
   'readFeedIntent': function () {
       var self = this;

       // Again check if we have an access token
       if (accessToken) {
           // Call FB module and get my feed with status_type, description, sotry, and message, limit to 5 posts
           FB.api("/me/feed?fields=status_type,message,story,description&limit=5", function (response) {
               if (response && !response.error) {
                   // If we have data
                   if (response.data) {
                       var output = "";
                       // Take the top 5 posts and parse them to be read out by Alexa.
                       for (var i = 0; i < response.data.length; i++) {
                           if (response.data[i].status_type == "mobile_status_update") {
                               output += "<break time=\"1s\"/><p>Post " + (i+1) + " is " + response.data[i].message + ". </p>";
                           } else if (response.data[i].status_type == "shared_story") {
                               output += "<break time=\"1s\"/><p>Post " + (i+1) + " is " + response.data[i].description + ". " + "My message is " + response.data[i].message + ". </p>";
                           } else if (response.data[i].status_type == "added_photos") {
                               if (response.data[i].message == null) {
                                   output += "<break time=\"1s\"/><p>Post " + (i+1) + " is a photo. </p>"
                               } else {
                                   output += "<break time=\"1s\"/><p>Post " + (i+1) + " is a photo. My message is " + response.data[i].message + ". </p>";
                               }
                           }
                           if (response.data[i].story != null) {
                               output += response.data[i].story
                           }
                       }
                       self.response.speak(output).listen(anythingElse);
                       self.emit(":responseReady");
                       var log = ("readFeedIntent: Got the response data successfully").toString();
                       intentTrackingID.event("success", log).send();
                   } else {
                       // report problem with parsing data
                       self.emit(':tell', "There was an issue getting data.");
                       intentTrackingID.event("invalid request","readFeedIntent: no response data").send();
                   }
               } else {
                   // Handle errors here.
                   console.log(response.error);
                   intentTrackingID.event("error", response.error.toString()).send();
               }
           });
       } else {
           self.emit(':tell', noAccessToken, tryLaterText);
           intentTrackingID.event("invalid request","readFeedIntent: no access token").send();
       }
   },

   // Write a post to Facebook feed handler.
   'startPostIntent': function () {
       var self = this;
       self.handler.state = STATES.FETCHMODE;
       self.response.speak(askPost).listen(askPost);
       self.emit(':responseReady');
       // report a success
       var log = ("startPostIntent: success").toString();
       intentTrackingID.event("success", log).send();
   },

   'AMAZON.CancelIntent': function () {
       // Triggered wheen user asks Alexa top cancel interaction
       this.emit(':tell', stopSkillMessage);
       var log = ("Cancel successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   'AMAZON.StopIntent': function () {
       // Triggered wheen user asks Alexa top stop interaction
       this.emit(':tell', stopSkillMessage);
       var log = ("Stop successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   // Triggered wheen user asks Alexa for help
   'AMAZON.HelpIntent': function () {
       this.emit(':ask', helpText, helpText);
       var log = ("Got help successfully").toString();
       intentTrackingID.event("success", log).send();
   },

   // Triggered when no intent matches Alexa request
   'Unhandled': function () {
       this.emit(':ask', helpText, helpText);
       intentTrackingID.event("invalid request","cannot handle this request").send();
   }
});

const writePostHandlers = Alexa.CreateStateHandler(STATES.FETCHMODE, {
    'writePostIntent': function () {
        var self = this;
        var message = this.event.request.intent.slots.Message.value;
        self.attributes['message'] = message;
        self.emit(':ask', "Are you say " + message + " ?");
        var log = ("writePostIntent: " + message).toString();
        intentTrackingID.event("success", log).send();
    },

    'AMAZON.YesIntent': function(message) {
        var self = this;
        if (accessToken) {
            FB.api("/me/feed", "POST",
            {
                // Message to be posted
                "message": this.attributes['message']
            }, function (response) {
                if (response && !response.error) {
                    // Alexa output for successful post
                    self.response.speak("Post successful!").listen(anythingElse, anythingElse);
                    self.emit(":responseReady");
                    var log = ("AMAZON.YesIntent: Post to facebook successfully").toString();
                    intentTrackingID.event("success", log).send();
                } else {
                    console.log(response.error);
                    // Output for Alexa, when there is an error.
                    self.emit(':ask', "There was an error posting to your feed, please try again");
                    intentTrackingID.event("error", response.error.toString()).send();
                }
            });

        } else{
            self.emit(':tell', noAccessToken, tryLaterText);
            intentTrackingID.event("invalid request", "AMAZON.YesIntent: no access token").send();
        }
        self.handler.state = STATES.STARTMODE;
    },

    'AMAZON.NoIntent': function(intent, session, response) {
        var self = this;
        self.response.speak(askPost).listen(askPost);
        self.emit(':responseReady');
        var log = ("AMAZON.NoIntent: ask for input again").toString();
        intentTrackingID.event("success", log).send();
    },

    'AMAZON.CancelIntent': function () {
        // Triggered wheen user asks Alexa top cancel interaction
        this.emit(':tell', stopSkillMessage);
        var log = ("Cancel successfully").toString();
        intentTrackingID.event("success", log).send();
    },

    'AMAZON.StopIntent': function () {
        // Triggered wheen user asks Alexa top stop interaction
        this.emit(':tell', stopSkillMessage);
        var log = ("Stop successfully").toString();
        intentTrackingID.event("success", log).send();
    },

    // Triggered wheen user asks Alexa for help
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', helpText, helpText);
        var log = ("Got help successfully").toString();
        intentTrackingID.event("success", log).send();
    },

    // Triggered when no intent matches Alexa request
    'Unhandled': function () {
        this.emit(':ask', helpText, helpText);
        intentTrackingID.event("invalid request","cannot handle this request").send();
    }
});

// Add handlers.
exports.handler = function (event, context, callback) {
   const alexa = Alexa.handler(event, context);
   alexa.appId = APP_ID;
   alexa.registerHandlers(newSessionHandlers, startConnectHandlers, writePostHandlers);
   alexa.execute();
};
