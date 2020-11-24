$(function() {

  // input empty pseudo
  $.extend($.expr.pseudos, {
    inputEmpty: function(el) {
      return !$(el).val();
    }
  });

  // drawer
  $.openDrawer= function() {
    $("body").append('<div id="drawer-mask"></div>');
    $("#drawer").addClass('show');
    setTimeout(function() {
      $("#drawer-mask").addClass('show');
    }, 50);
  };
  $.closeDrawer= function() {
    $("#drawer, #drawer-mask").addClass('fade');
    setTimeout(function() {
      $("#drawer").removeClass('show fade');
      $("#drawer-mask").remove();
    }, 400);
  };

  // syntax highlighter
  $(".syntax-highlight-input").on('highlighting keyup', function(e) {
    const caretPosition= e.target.selectionStart;
    const $this= $(this);
    const $autocomplete= $this.parent().children(".syntax-highlight-autocomplete");
    const $highlighter= $this.parent().children(".syntax-highlight-text");
    const suggestions= $this.attr('data-suggestions')?.split('|') || [];
    let text= $this.val();
    // open/close suggestions
    const [predict]= text.substr(0, caretPosition).match(/[A-z_\["]*$/) || [''];
    const suggestsList= suggestions.filter(function(item) {
      const haystack= item?.toLocaleLowerCase();
      const needle= predict?.toLocaleLowerCase();
      return needle && haystack!==needle && haystack.includes(needle);
    });
    if(suggestsList.length>0) {
      const {
        left,
        top
      }= getCaretCoordinates(this, caretPosition);
      $autocomplete.addClass('show').css({
        transform: 'translateX(-25%)',
        left,
        top: top+24
      }).data('predict', predict).empty();
      suggestsList.forEach(function(item) {
        $autocomplete.append(`
          <a class="dropdown-item small" href="#">${item}</a>
        `);
      });
    } else if(e.key?.toLocaleLowerCase()!=='shift') { // avoid combination key trigger
      $autocomplete.filter(".show").removeClass('show');
    }
    // save caret position
    $this.data('caret-position', caretPosition);
    // parse operator
    let html= text.replace(/\|\||<<|<=|!=|=~|!~|==|>=|>>|&&|\*\*|\+|\/|\*|\||\^|<|%|-|=|&|>/g, function(grab) {
      return(`<span style="color: red;">${grab}</span>`);
    });
    //parse vlaue
    html= html.replace(/\[sensorid\]|\[value\]|\[value_before_formula\]|\[severity\]|\[severity_changes\]/g, function(grab) {
      return(`<span style="color: orange;">${grab}</span>`);
    });
    // parse constant
    html= html.replace(/true|false|"critical"|"major"|"normal"/ig, function(grab) {
      return(`<span style="color: blue;">${grab}</span>`);
    });
    $highlighter.html(html);
  });

  $(document).on('click', ".syntax-highlight-autocomplete>a", function(e) {
    const $this= $(this);
    const $input= $this.closest(".syntax-highlight").children(".syntax-highlight-input");
    const caretPosition= $input.data('caret-position');
    const predict= $this.parent().data('predict');
    const value= $input.val();
    const text= $this.text();
    const val= value.substr(0, caretPosition-predict.length)+text+value.substr(caretPosition);
    $input.val(val).trigger('highlighting').trigger('focus');
    const newCaretPosition= (caretPosition+text.length)-predict.length;
    $input[0].setSelectionRange(newCaretPosition, newCaretPosition);
    e.stopPropagation();
    e.preventDefault();
  });

  $(document).on('click', function() {
    $(".syntax-highlight-autocomplete.show").removeClass('show');
  });

  String.prototype.insertString= function(text, position) {
    return this.substr(0, position)+text+this.substr(position);
  };

  String.prototype.deleteString= function(length, position) {
    const rightLength= (length>0) ? length: 0;
    const leftLength= (length<0) ? length: 0;
    return this.substr(0, position+leftLength)+this.substr(position+rightLength);
  };

});