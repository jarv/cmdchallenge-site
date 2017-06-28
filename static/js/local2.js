(function($){
    $('#terminal').terminal(function(command, term) {
      if (command !== '') {
        term.echo("foo\n\nbar")
      } else
        term.echo('');        
    }, 
    {
      // greetings: 'Javascript Terminal', // uncomment for custom greetings
      name: 'js_demo',
      height: 300,
      width:900, // adjust width accordingly
      prompt: 'js> '
    });
})(jQuery);
