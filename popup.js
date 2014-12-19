/*
 * Three main variables - this.topics (dict mapping topics to lists of urls),
 * this.urls (list of urls to which current topic maps),
 * this.topic (current topic)
 * 
 * The elements of this.urls are JSON objects with <url> and <time>
 * attributes
 */

var CURRENT_TOPIC = 'currentTopic';
var NO_TOPIC = 'None';

// Ignore visits lasting less than <VISIT_THRESHOLD> ms.
var VISIT_THRESHOLD = 1000;

var popup = {

  setPromptValue: function(value) {
    $('#prompt').text("Topic: " + value);

  },


  main : function() {
    
    // Get a reference to background page (actually an event page)
    chrome.runtime.getBackgroundPage(function(result){
      popup.background = result.extension;
    });

    // Get root topics object and current topic, keep them in memory
    chrome.storage.local.get(CURRENT_TOPIC, function(result){
      popup.topic = (result.currentTopic === undefined ? NO_TOPIC : result.currentTopic);
      popup.setPromptValue(popup.topic);  
      $('#set_topic').on('submit', popup.handleSubmit);      
    });

    },

  handleSubmit: function(event) {

    event.preventDefault();
    var newTopic = $('#topic_input').val();

    // If we're creating a new topic, create it. Otherwise, just set the
    // current topic to the new topic

    chrome.storage.local.get(newTopic, function(object) {
      var result = object.newTopic;
      if(result === undefined) {
        popup.background.createTopic(newTopic);
      }
      else {
        popup.background.setTopic(newTopic);        
      }
      $('#topic_input').val("");
      popup.topic = newTopic;
      popup.setPromptValue(newTopic);

    });


  },  

}

$(function() { 
   popup.main();
 });




