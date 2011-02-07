exports.helpers = {
  nameAndVersion: function(name, version) {
    return name + ' v' + version;
  },
  
  appName: 'blogalicious',
  version: '0.1'
};

// flash message class

function FlashMessage(type, msgs) {
  this.type = type;
  this.messages = typeof msgs === String ? [msgs] : msgs;
}

FlashMessage.prototype = {
    get icon() {
      switch (this.type) {
        case 'info':
          return 'ui-icon-info';
        case 'error':
          return 'ui-icon-error';
      }
    },
    
    get stateClass() {
      switch (this.type) {
        case 'info':
          return 'ui-state-highlight';
        case 'error':
          return 'ui-state-error';
      }
    },
    
    toHtml: function() {
      return '<div class="ui-widget">' +
               '<div style="padding: 0pt 0.7em;" class="' + this.stateClass + ' ui-corner-all">' +
               '<p><span style="float: left; margin-right: 0.3em;" class="ui-icon ' + this.icon + '"></span>' +
               this.messages.join('<br />') + '</p>' +
             '</div></div>';
    }
};

exports.dynamicHelpers = {
  flashMessages: function(req, res) {
    var html = '';
    [ 'info', 'error' ].forEach(function(type) {
      var messages = req.flash(type);
      if (messages.length > 0) {
        html += new FlashMessage(type, messages).toHtml();
      }
    });
    return html;
  }
};