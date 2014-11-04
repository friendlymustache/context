/*
 * Three main variables - this.topics (dict mapping topics to lists of urls),
 * this.urls (list of urls to which current topic maps),
 * this.topic (current topic)
 * 
 * The elements of this.urls are JSON objects with <url> and <time>
 * attributes
 */

// var ROOT_KEY = 'topic';
// var CURRENT_TOPIC = 'currentTopic';
var NO_TOPIC = 'None';

// Ignore visits lasting less than <VISIT_THRESHOLD> ms.
var VISIT_THRESHOLD = 1000;

var extension = {

  setPromptValue: function(value) {
    $('#prompt').text("Topic: " + value);

  },

  createTopic : function(topic) {
    var topics = extension.topics;
    topics[topic] = [];
    chrome.storage.local.set({'topics' : topics});
    extension.setTopic(topic);
  },

  setTopic: function(topic) {
    // Set current topic in local storage and in memory, passing our error-handling callback
    // to the API set function.
    chrome.storage.local.set({'currentTopic' : topic}, this.handleError());
    this.topic = topic;
    this.urls = this.topics[topic];
  },


  main : function() {
  
    // Get root topics object and current topic, keep them in memory
    chrome.storage.local.get('topics', function(result){
      extension.topics = result.topics;

      // If topics isn't undefined, we've already loaded the extension in the past,
      // so pull the last-used topic and set it to the current topic.
      if(extension.topics !== undefined) {
        chrome.storage.local.get('currentTopic', function(result){
          extension.topic = result.currentTopic;
          extension.urls = extension.topics[extension.topic];
          extension.setPromptValue(extension.topic);
        });
      }

      // If topics is undefined, no topic has ever been entered by a user. Do basic setup
      // tasks for them.
      else {

        extension.topics = {};
        // Initialize empty list to store current topic URLs
        extension.urls = [];
        // Set initial topic to "None"
        extension.topic = NO_TOPIC;
        // Map current topic to empty list for current topic URLs
        extension.topics[extension.topic] = extension.urls;


        // Now that we've built an initial topics dict, save it back to local
        // storage
        chrome.storage.local.set({'topics' : extension.topics}, extension.handleError());

        // Set initial ("None") topic
        extension.setTopic(extension.topic);

      }

      chrome.history.onVisited.addListener(extension.handleVisit());
      $('#set_topic').on('submit', extension.handleSubmit);

    });


  },


  createVisit: function(visitObject) {
    /*
     * Get the list of URLs representing pages visited on the currrent topic,
     * and add the current URL to this list
     */

    extension.urls.push(visitObject);


    // Update storage -- TODO find a better way of doing this than pushing the entire
    // topic dict
    chrome.storage.local.set({'topics' : this.topics}, this.handleError());

  },


  validateVisitDuration : function(lastVisit, currentVisit, currentTime) {
    /*
     * Determines whether the visit described by <lastVisit> lasted
     * long enough to be considered an actual visit - if not, removes it
     * from our list of URLs
     */
    if(lastVisit === undefined) {return;}
    var lastTime = lastVisit.time
    duration = currentTime - lastTime;
    debugger;
    if(duration < VISIT_THRESHOLD) {
      // Remove the last visit -- it was too short
      extension.urls.pop();
      chrome.storage.local.set({'topics' : this.topics}, this.handleError());
    }
  },

  _addVisit: function(lastVisit, currentVisit, currentTime) {
    /* Updates extension's store of urls given a visitItem object
     * representing the last visit to a URL and a visitItem object
     * representing the latest (current) visit to a URL. Fires every
     * time a URL is visited (bound in main())
     */
    var visitUrl = currentVisit.url;
    var numUrls = extension.urls.length;

    if(lastVisit !== undefined) {
      // Determine last visit and time of last visit
      var lastVisitTime = lastVisit.time;
      var duration = currentTime - lastVisitTime;
      // Set duration of last visit
      lastVisit.duration = duration;
    }
  
    // Create entry for current url being visited
    extension.createVisit({url: visitUrl, time: currentTime});     
  },

  addVisit: function(lastVisit, currentVisit, currentTime) {
    debugger;

    extension.validateVisitDuration(lastVisit, currentVisit, currentTime);
    extension._addVisit(lastVisit, currentVisit, currentTime);
  },

  handleError: function(message) {
    return function() {
      if (chrome.runtime.lastError !== undefined) {
        console.log(chrome.runtime.lastError.message);
      }
      else {
        var message = (message === undefined ? "Success!" : message);
        console.log(message);      
      }
    }

  },

  handleVisit: function() {
    /* Handles visiting of a URL */

    // Return callback function with access to extension scope
    return function(currentVisit) {
      var lastVisit = extension.urls[extension.urls.length - 1];
      var currentTime = Date.now();
      extension.addVisit(lastVisit, currentVisit, currentTime);
    } 
  },

  handleSubmit: function(event) {

    event.preventDefault();
    var newTopic = $('#topic_input').val();

    // If we're creating a new topic, create it. Otherwise, just set the
    // current topic to the new topic
    if(extension.topics[newTopic] === undefined) {
      extension.createTopic(newTopic);
    }
    else {
      extension.setTopic(newTopic);        
    }

    $('#topic_input').val("");
    extension.setPromptValue(extension.topic);
  },  

}

$(function() {
  chrome.storage.local.getBytesInUse(function(result) {
   console.log("Bytes in use: %s", result);   
   extension.main();
 });

});




