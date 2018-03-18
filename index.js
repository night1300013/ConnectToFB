var Alexa = require('alexa-sdk');
var FB = require('fb');
var util = require('util');

// Messages used for Alexa to tell the user
var repeatWelcomeMessage = "you can read your feed, and write a post using this skill.";

var welcomeMessage = "Welcome to connect to facebook, " + repeatWelcomeMessage;

var stopSkillMessage = "Bye! See you next time!";

var helpText = "You can say things like read my feed, or make a post, what would you like to do?";

var tryLaterText = "Please try again later."

var noAccessToken = "There was a problem getting the correct token for this skill, " + tryLaterText;

var anythingElse = "Is there anything else I can help with? You can read the feed, or make a post."

var accessToken = "";

// Create a new session handler
const handlers = {
   'NewSession': function () {

       // Access token is pass through from the session information
       accessToken = this.event.session.user.accessToken;

       // If we have an access token we can continue.
       if (accessToken) {
           FB.setAccessToken(accessToken);
           this.emit(':ask', welcomeMessage, repeatWelcomeMessage);
       }
       else {
           // If we dont have an access token, we close down the skill. This should be handled better for a real skill.
           this.emit(':tell', noAccessToken, tryLaterText);
       }
   },

   // Read fb feed handler
   'readFeedIntent': function () {
       var alexa = this;

       // Again check if we have an access token
       if (accessToken) {
           // Call FB module and get my feed with status_type, description, sotry, and message, limit to 5 posts
           FB.api("/me/feed?fields=status_type,message,story,description&limit=2", function (response) {
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
                       alexa.response.speak(output).listen(anythingElse).ls;
                       alexa.emit(":responseReady");
                   } else {
                       // report problem with parsing data
                       alexa.emit(':tell', "There was an issue getting data.");
                   }
               } else {
                   // Handle errors here.
                   console.log(response.error);
               }
           });
       } else {
           this.emit(':tell', noAccessToken, tryLaterText);
       }
   },
   // Write a post to Facebook feed handler.
   'writePostIntent': function () {

       var alexa = this;

       // Chack if we have access tokens.
       if (accessToken) {
           FB.api("/me/feed", "POST",
           {
               // Message to be posted
               "message": "This is Alexa, I can now access a whole new world of information, good luck!"
           }, function (response) {
               if (response && !response.error) {
                   // Alexa output for successful post
                   alexa.response.speak("Post successful!").listen(anythingElse, anythingElse);
                   alexa.emit(":responseReady");
               } else {
                   console.log(response.error);
                   // Output for Alexa, when there is an error.
                   alexa.emit(':ask', "There was an error posting to your feed, please try again");
               }
           });

       }else{
           this.emit(':tell', noAccessToken, tryLaterText);
       }
   },

   'AMAZON.CancelIntent': function () {
       // Triggered wheen user asks Alexa top cancel interaction
       this.emit(':tell', stopSkillMessage);
   },

   'AMAZON.StopIntent': function () {
       // Triggered wheen user asks Alexa top stop interaction
       this.emit(':tell', stopSkillMessage);
   },

   // Triggered wheen user asks Alexa for help
   'AMAZON.HelpIntent': function () {
       this.emit(':ask', helpText, helpText);
   },

   // Triggered when no intent matches Alexa request
   'Unhandled': function () {
       this.emit(':ask', helpText, helpText);
   }
};

// Add handlers.
exports.handler = function (event, context, callback) {
   const alexa = Alexa.handler(event, context);
   alexa.registerHandlers(handlers);
   alexa.execute();
};
