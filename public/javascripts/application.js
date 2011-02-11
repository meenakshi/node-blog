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
    
    /*
    lastfm.user.getRecentTracks({ user: 'schaermu' }, { success: function(data){
          console.log(data);
        }, error: function(code, message) {
          
        }
    });
    */
    // hook up submit buttons to submit function
    $('#submit-button').click(submitForm);
    
    // hookup delete code
    $('.delete-post').click(function(e) {
      e.preventDefault();
      if (confirm('Soll dieses Posting wirklich gelöscht werden?')) {
        var element = $(this),
            form = $('<form></form>');
        
        form
          .attr({
            method: 'POST',
            action: '/post/' + element.attr('rel')
          })
          .hide()
          .append('<input type="hidden" />')
          .find('input')
          .attr({
            'name': '_method',
            'value': 'delete'
          })
          .end();
        $('body').append(form);
        form.submit();
      }
    });
  });
  
  function submitForm() {
    document.forms[0].submit();
  }
  
  // manage flash messages
  function hideFlashMessages() {
    $(this).fadeOut();
  }
  setTimeout(function() {
    $('.flash').each(hideFlashMessages);
  }, 5000);
  $('.flash').click(hideFlashMessages);
})();