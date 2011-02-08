(function() {
  $(document).ready(function() {
    // load latest posts and append to list
    $.get('/rest/json/latest', function(data) {
      $.each(data, function(post) {
        var listEl = $('<li><a href="' + data[post].url + '">' + data[post].title + '</a></li>');
        $('#latest-posts ul').append(listEl);
      });
    });
    
    // load lastfm data
    /* Create a cache object */
    var cache = new LastFMCache();

    /* Create a LastFM object */
    var lastfm = new LastFM({
        apiKey    : 'c33d3038bde36317f65e0d31c94c863c',
        apiSecret : 'e9daaee45e7d5b400516605160f5fab7',
        cache     : cache
    });
    
    /* Load some artist info. */
    lastfm.user.getRecentTracks({ user: 'schaermu' }, { success: function(data){
          /* Use data. */
          
        }, error: function(code, message) {
          /* Show error message. */
        
        }
    });
  });
  
  // manage flash messages
  function hideFlashMessages() {
    $(this).fadeOut();
  }
  setTimeout(function() {
    $('.flash').each(hideFlashMessages);
  }, 5000);
  $('.flash').click(hideFlashMessages);
})();