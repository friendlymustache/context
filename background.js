/*
 * Three main variables - this.topics (dict mapping topics to lists of urls),
 * this.urls (list of urls to which current topic maps),
 * this.topic (current topic)
 * 
 * The elements of this.urls are JSON objects with <url> and <time>
 * attributes
 */

// var ROOT_KEY = 'topic';
var CURRENT_TOPIC = 'currentTopic';
var NO_TOPIC = 'None';
var DROPBOX_APP_KEY = '4rvr6lrbusgv4rf';

// Ignore visits lasting less than <VISIT_THRESHOLD> ms.
var VISIT_THRESHOLD = 1000;

var extension = {

  set : function(key, value, callback) {
    var obj = {}
    obj[key] = value;
    chrome.storage.local.set(obj, callback);
  },

  setPromptValue: function(value) {
    $('#prompt').text("Topic: " + value);
  },

  createTopic : function(topic) {
    /* Create a topic and set the current topic to the created topic */
    var urls = [];
    var successMessage = "Topic " + topic + "created!";
    extension.set(topic, urls, extension.handleError(successMessage));
    extension.setTopic(topic);
  }
,
  setTopic: function(topic) {
    // Set current topic in local storage and in memory, passing our error-handling callback
    // to the API set function.
    var successMessage = "Current topic set to " + topic;
    extension.set(CURRENT_TOPIC, topic, extension.handleError(successMessage));
    extension.topic = topic;

    // Get the corresponding list of URLs for the topic from storage. This list
    // should always exist because we always call createTopic on non-existent
    // topics before calling setTopic

    var topic = topic;

    var callbackFunc = function(result) {
      extension.urls = result[topic];
    };

    chrome.storage.local.get(topic, callbackFunc);
  },


  setupDropbox : function() {

    var dropbox = new Dropbox.Client({key: DROPBOX_APP_KEY});
    var authDriver = new Dropbox.AuthDriver.ChromeExtension({
      receiverUrl: 'chrome_oauth_receiver.html'
    });

    dropbox.authDriver(authDriver);

    // Try to finish OAuth authorization.
    dropbox.authenticate({interactive: false}, function (error, client) {
        if (error) {
            console.log('Authentication error: ' + error);
        }
    });

    if (dropbox.isAuthenticated()) {
        return;
    }

    dropbox.authenticate(function(error, client){
      if(error){
        console.log('Authentication error: ' + error);
    });
    extension.dropbox = dropbox;
  },

  main : function() {

    // Set up Dropbox API object
    extension.setupDropbox();


    // Get root topics object and current topic, keep them in memory
    chrome.storage.local.get(CURRENT_TOPIC, function(result){
      extension.topic = result[CURRENT_TOPIC];

      // If we have a last-used topic, pull it and set it to the current topic.
      if(extension.topic !== undefined) {
        // Get the list of URLs corresponding to the current topic
        chrome.storage.local.get(extension.topic, function(result){
          extension.urls = result[extension.topic];
        });
      }

      // If we do not have a last topic, no topic has ever been entered by a user. 
      // Create an initial topic of "None"
      else {
        // save initial topic to storage
       extension.createTopic(NO_TOPIC);
      }

      chrome.history.onVisited.addListener(extension.handleVisit());
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
    var url = visitObject.url;
    var successMessage = "Recorded visit to " + url + " under topic '" + extension.topic + "'";
    extension.set(extension.topic, extension.urls, extension.handleError(successMessage));

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
    if(duration < VISIT_THRESHOLD) {
      // Remove the last visit -- it was too short
      extension.urls.pop();
      extension.set(extension.topic, extension.urls);
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
    extension.validateVisitDuration(lastVisit, currentVisit, currentTime);
    extension._addVisit(lastVisit, currentVisit, currentTime);
  },

  handleError: function(message) {
    var message = message;
    return function() {
      if (chrome.runtime.lastError !== undefined) {
        console.log(chrome.runtime.lastError.message);
      }
      else {
        var logMessage = (message === undefined ? "Success!" : message);
        console.log(logMessage);      
      }
    }

  },

  handleVisit: function() {
    /* Handles visiting of a URL */

    // Return callback function with access to extension scope
    return function(currentVisit) {
      // Only add to list of URLs if topic is not "None"
      if(extension.topic != NO_TOPIC) {
        var lastVisit = extension.urls[extension.urls.length - 1];
        var currentTime = Date.now();
        extension.addVisit(lastVisit, currentVisit, currentTime);
      }
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
    extension.popup.setPromptValue(extension.topic);
  },  

}
extension.main();



