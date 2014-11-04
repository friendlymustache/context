/*
 * Three main variables - this.topics (dict mapping topics to lists of urls),
 * this.urls (list of urls to which current topic maps),
 * this.topic (current topic)
 * 
 * The elements of this.urls are JSON objects with <url> and <time>
 * attributes
 */


var ROOT_KEY = 'topics';
var CURRENT_TOPIC = 'current_topic';
var NO_TOPIC = 'None';

var extension = {

  setTopic: function(topic) {
    // Set current topic in local storage and in memory, passing our error-handling callback
    // to the API set function.
    chrome.storage.local.set({CURRENT_TOPIC : topic}, this.handleError("Successfully saved topic to chrome storage: "));
    this.topic = topic;
    this.urls = this.topics[topic];
  },


  main : function() {
  
    // Get root topics object and current topic, keep them in memory
    chrome.storage.local.get(ROOT_KEY, function(result){
      debugger;
      extension.topics = result.ROOT_KEY;

      if(extension.topics !== undefined) {
        console.log("Topics defined");
        chrome.storage.local.get(CURRENT_TOPIC, function(result){
          debugger;
          extension.topic = result.CURRENT_TOPIC;
          extension.urls = extension.topics[extension.topic];
        });
      }

      // If topics is undefined, no topic has ever been entered by a user. Do basic setup
      // tasks for them.
      else {
        console.log("Topics undefined");      

        extension.topics = {};

        // Initialize empty list to store current topic URLs
        extension.urls = [];
        // Set initial topic to "None"
        extension.topic = NO_TOPIC;
        // Map current topic to empty list for current topic URLs
        extension.topics[extension.topic] = extension.urls;


        // Now that we've built an initial topics dict, save it back to local
        // storage
        debugger;
        chrome.storage.local.set({ROOT_KEY : extension.topics}, extension.handleError("Successfully saved root topic entry"));

        // Set initial ("None") topic
        extension.setTopic(extension.topic);

      }

      chrome.history.onVisited.addListener(extension.handleVisit());
      $('#set_topic').on('submit', extension.handleSubmit);

    });


  },


  createVisit: function(visit_object) {
    /*
     * Get the list of URLs representing pages visited on the currrent topic,
     * and add the current URL to this list
     */

    this.urls.push(visit_object);

    // Update storage -- TODO find a better way of doing this than pushing the entire
    // topic dict
    chrome.storage.local.set({ROOT_KEY : this.topics}, this.handleError("Successfully created visit object"));

  },

  addVisit: function(last_visit, current_visit) {
    /* Updates extension's store of urls given a visitItem object
     * representing the last visit to a URL and a visitItem object
     * representing the latest (current) visit to a URL. Fires every
     * time a URL is visited (bound in main())
     */
    var visit_url = current_visit.url;
    var current_time = Date.now();
    var num_urls = this.urls.length;

    // Determine last visit and time of last visit
    var last_visit = this.urls[num_urls - 1];
    var last_visit_time = last_visit.time;

    var duration = current_time - last_visit_time;

    // Set duration of last visit
    last_visit.duration = duration;
    // Create entry for current url being visited
    createVisit({url: visit_url, time: current_time});     
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

    // Create reference to extension for scoping
    var extension_var = this;

    // Return callback function with access to extension scope
    return function(current_visit) {
      var last_visit = this.urls[this.urls.length - 1];
      extension_var.addVisit(last_visit, current_visit);
    } 
  },

  handleSubmit: function(event) {
    event.preventDefault();
    var new_topic = $('#topic_input').val();
    extension.setTopic(new_topic);


    $('#topic_input').val("");
    $('#prompt').text("Topic: " + extension.topic);
  },

}


// Run our kitten generation script as soon as the document's DOM is ready.
$(function() {
chrome.storage.local.getBytesInUse(function(result) { console.log("Bytes in use: %s", result);   extension.main();
 })

});




