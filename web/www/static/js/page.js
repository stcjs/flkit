$(function(){
  $.fn.delegates = function(configs){
      el = $(this[0]);
      for(var name in configs){
          var value = configs[name];
          if (typeof value == 'function') {
              var obj = {};
              obj.click = value;
              value = obj;
          };
          for(var type in value){
              el.delegate(name, type, value[type]);
          }
      }
      return this;
  }

  var modalNeedInit = true;
  var editorInstance = null;
  var caseListData = {};

  function initModal(){
    if (!modalNeedInit) {
      //return;
    }
    var html = $('#modalTpl').html();
    $('#modalBody').html(html);
    initEditor();
    initOptions();
  }
  function initOptions(){
    var hash = location.hash.slice(1).split(':');
    var lang = hash[0] || 'html';
    var name = hash[1] || 'lexer';
    var options = gOptions[lang][name];
    var html = [];
    for(var key in options){
      var item = options[key];
      if (typeof item === 'boolean') {
        html.push('<div class="checkbox" style="margin-right:20px;"><label>' + key + ': <input name="' + key + '" type="checkbox" '+ (item ? 'checked' : '')+'></label></div>')
      }else if (typeof item === 'string') {
        html.push('<div class="form-group" style="margin-right:20px;width:120px;"><input type="text" value="'+item+'" class="form-control" name="'+key+'" placeholder="'+key+'"></div>')
      }
    }
    $('#extraOptions').html(html.join(''))
  }
  function getLang(){
    var hash = location.hash.slice(1);
    return hash.split(':')[0] || 'html';
  }
  function initEditor(){
    var lang = getLang();
    editorInstance = CodeMirror.fromTextArea($('#codeArea')[0], {
        lineNumbers: true,
        styleActiveLine: true,
        matchBrackets: true,
        mode: lang,
        lineWrapping: true,
        viewportMargin: Infinity
    });
    editorInstance.setOption("theme", "solarized dark")
  }
  function getTestData(){
    var name = location.hash.slice(1).split(':');
    var lang = name[0] || 'html';
    name = name[1] || 'lexer';
    var code = editorInstance.getValue();
    var tpl = $('#tpl').val();
    var ld = $('#ld').val();
    var rd = $('#rd').val();
    var options = {};
    var oldData = gOptions[lang][name];
    var els = $('#extraOptions').find('input');
    els.each(function(i, el){
      el = $(el);
      var type = el.attr('type');
      var name = el.attr('name');
      var value;
      switch(type){
        case 'checkbox':
          value = el[0].checked;
          break;
        case 'text':
          value = el[0].value;
          break;
      }
      if (value !== oldData[name]) {
        options[name] = value;
      }
    })
    return {
      lang: lang,
      name: name,
      code: code,
      tpl: tpl,
      ld: ld,
      rd: rd,
      options: JSON.stringify(options)
    }
  }
  var htmlMaps = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '\n': '\\n',
    '\t': '\\t',
    '\b': '\\b'
  }
  var escape_html = function (str) {
    return (str + "").replace(/[<>'"\n\t]/g, function(a){
      return htmlMaps[a];
    })
  }
  function init(){
    var name = (location.hash || '#').slice(1).split(':');
    var lang = name[0] || 'html';
    name = name[1] || 'lexer';
    $.get('/index/list', {
      name: name,
      lang: lang
    }).done(function(data){
      if (data.errno) {
        return alert(data.errmsg);
      }
      $('#caseNums').html(data.data.length);
      var html = [];
      data.data.forEach(function(item){
        caseListData[item.key] = item;
        if (item.success) {
          html.push('<div data-key="' + item.key + '" class="alert alert-success cast-item" role="alert">');
        }else{
          html.push('<div data-key="' + item.key + '" class="alert alert-danger cast-item" role="alert">');
        }
        html.push('<div>' + escape_html(item.code) + '</div>')
        html.push('<span class="glyphicon glyphicon-refresh btn-refresh" title="Retest"></span>');
        html.push('</div>');
      })
      $('#caseList').html(html.join(''))
    })
  }
  

  var hash = location.hash.slice(1);
  if (hash) {
    $('#langSelect').val(hash);
  }
  init();

  // setTimeout(function(){
  //   $($('.alert-danger .btn-refresh')[0]).trigger('click');
  // }, 500)

  $(document.body).delegates({
    '#addTestBtn': function(){
      $('.modal-add-test').modal({
        keyboard: false
      })
      initModal();
    },
    '#testItBtn': function(){
      var data = getTestData();
      if (!data.code) {
        editorInstance.focus();
        return;
      }
      $.post('/index/test', data).done(function(data){
        var value = data.errmsg;
        if (!data.errno) {
          if (typeof data.data === 'string') {
            value = data.data;
          }else{
            value = JSON.stringify(data.data, undefined, 4);
          }
        }
        $('#testResultArea').val(value);
      })
    },
    '#saveCaseBtn': function(){
      var data = getTestData();
      if (!data.code) {
        editorInstance.focus();
        return;
      }
      $.post('/index/save', data).done(function(data){
        location.reload();
        // $('.modal-add-test').modal({
        //   show: false
        // })
      })
    },
    '.btn-refresh': function(){
      var key = $(this).parents('div.alert').attr('data-key');
      var data = caseListData[key];
      $('.modal-add-test').modal({
        keyboard: false
      })
      initModal();
      editorInstance.getDoc().setValue(data.code);
      setTimeout(function(){
        editorInstance.focus();
      }, 2000)
      $('#tpl').val(data.tpl);
      $('#ld').val(data.ld);
      $('#rd').val(data.rd);
      var options = data.options;
      var extraOptions = $('#extraOptions');
      for(var key in options){
        if (typeof options[key] === 'boolean') {
          extraOptions.find('[name="' + key + '"]')[0].checked = options[key];
        };
      }
      setTimeout(function(){
        $('#testItBtn').trigger('click');
        //$('#saveCaseBtn').trigger('click');
      }, 100)
    },
    '#langSelect': {
      change: function(){
        var value = this.value;
        location.hash = value;
        init();
      }
    }
  })

})