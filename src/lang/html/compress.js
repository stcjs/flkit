import Base from '../../util/base.js';
import Tokenize from './tokenize.js';
import TokenType from '../../util/token_type.js';
import {
  token2Text,
  isTagAttrDefaultValue,
  isTagAttrOnlyName,
  isAttrValueNoQuote,
  isOptionalEndTag,
  isVoidElement,
  isSafeTag
} from './util.js';

import CssCompress from '../css/compress.js';

/**
 * compress options
 */
const compressOpts = {
  'trim': false,  //去除首尾空白字符 
  'removeComment': true,  //移除注释
  'simpleDoctype': true,  //简化doctype
  'simpleCharset': true,  //简化charset
  'tagToLower': true,  //小写标签名
  'removeHtmlXmlns': true,  //移除html的命名空间
  'removeInterTagSpace': false,  //移除标签之间的空格，非安全
  'removeEmptyScript': false,  //移除空的script标签
  'removeEmptyStyle': false,  //移除空的style标签
  'removeOptionalAttrs': true,  //移除可选的属性
  'removeAttrsQuote': true,  //移除属性值的引号
  'removeAttrsOptionalValue': true,  //移除可选属性的值
  'removeHttpProtocol': false,  //移除http协议
  'removeHttpsProtocol': false,  //移除https协议
  'removeOptionalEndEag': true,  //移除可选的结束标签
  'optionalEndTagList': null,  //结束标签列表
  'removeVoidElementSlash': true, //移除单一标签最后的 /
  'compressStyleValue': true,  //压缩标签的style值 
  'compressInlineCss': true,  //压缩内联的CSS
  'compressInlineJs': true,  //压缩内联的JS
  'removeInlineJsCdata': true,  //
  'compressJsTpl': false,  //压缩前端模版
  'jsTplTypeList': null,
  'compressTag': true  //压缩标签
};

export default class HtmlCompress extends Base {
  /**
   * constructor
   */
  constructor(text, options = {}){
    super('', options);
    this._optText = text;
    this.tokens = [];
    this.isXML = false;

    this.index = 0;
    this.length = 0;

    this.jsHandle = null;
    this.cssHandle = null;
    this.jsTplHandle = null;

    this.prev = null;
    this.next = null;

    this.options = {...compressOpts, ...this.options};
  }
  /**
   * init tokens
   */
  initTokens(){
    if(typeof this._optText === 'string'){
      let instance = new Tokenize(this._optText, this.options);
      this.tokens = instance.run();
    }else{
      this.tokens = this._optText;
    }
    this.length = this.tokens.length;
  }
  /**
   * compress common
   */
  compressCommon(token){
    // compress comment
    if(token.commentBefore.length && this.options.removeComment){
      let comments = [];
      let start = token.commentBefore[0].start;
      let prev = null;
      let hasSpace = token.start - token.commentBefore[token.commentBefore.length - 1].end > 0;
      token.commentBefore.forEach(item => {
        if(item.value.indexOf('<!--!') === 0){
          comments.push(item);
        }
        if(prev && !hasSpace){
          hasSpace = (item.start - prev.end) > 0;
        }
        prev = item;
      });
      token.commentBefore = comments;
      let prevHasRightSpace = false;
      if(this.prev && this.prev.type === TokenType.HTML_TEXT){
        prevHasRightSpace = /\s$/.test(this.prev.value);
      }
      token.start = !prevHasRightSpace && hasSpace ? start + 1 : start;
    }

    if(!this.prev){
      if(token.type === TokenType.HTML_DOCTYPE || token.type === TokenType.XML_START){
        token.start = 0;
        return token;
      }
    }

    if(this.isXML && this.prev){
      token.start = this.prev.end;
      return token;
    }

    //safe tags
    let tagTypes = [
      TokenType.HTML_DOCTYPE,
      TokenType.HTML_TAG_START,
      TokenType.HTML_TAG_END
    ];
    if(this.prev && tagTypes.indexOf(this.prev.type) > -1 && tagTypes.indexOf(token.type) > -1){
      if((this.prev.type === TokenType.HTML_DOCTYPE || isSafeTag(this.prev.detail.tagLowerCase)) && isSafeTag(token.detail.tagLowerCase)){
        token.start = this.prev.end;
      }
    }
    return token;
  }
  /**
   * compress text
   */
  compressText(token){
    // can not remove extra whitespace in title tag
    if(this.prev && this.prev.type === TokenType.HTML_TAG_START){
      if(this.prev.detail.tagLowerCase === 'title'){
        let spaces = token.start - this.prev.end;
        if(spaces){
          token.value = (new Array(spaces + 1)).join(' ') + token.value;
        }
        token.start = this.prev.end;
        return token;
      }
    }

    let value = token.value;
    // 如果文本中含有//，则不去除换行等，主要是一些异步接口（JS环境）会被识别成HTML环境，如果有JS的//注释就要注意了
    if(value.indexOf('//') > -1){
      return token;
    }
    value = value.replace(/\s+/g, ' ');
    // remove right space
    if(this.options.removeInterTagSpace){
      value = value.replace(/\s$/, '');
    }
    token.value = value;
    return token;
  }
  /**
   * compress doctype
   */
  compressDocType(token){
    if(this.options.simpleDoctype){
      token.value = '<!Doctype html>';
    }
    return token;
  }
  /**
   * compress charset
   */
  compressCharset(token){
    let attrs = token.detail.attrs;
    let charset = 0;
    let contentValue = '';
    let flag = attrs.some(item => {
      let value = item.value || '';
      if(item.nameLowerCase === 'http-equiv' && value.toLowerCase() === 'content-type'){
        charset++;
      }else if(item.nameLowerCase === 'content' && value.indexOf('charset=') > -1){
        charset++;
        contentValue = item.value;
      }else{
        return true;
      }
    });
    if(flag){
      return;
    }
    if(charset !== 2 || !contentValue){
      return;
    }
    let reg = /charset=([\w\-]+)/i;
    let matches = contentValue.match(reg);
    if(matches && matches[1]){
      //token.value = `<meta charset=${matches[1]}>`;
      token.detail.attrs = [{
        name: 'charset',
        value: matches[1],
        nameLowerCase: 'charset',
        quote: this.options.removeAttrsQuote ? '' : '"'
      }];
    }
    return token;
  }
  /**
   * compress tag start
   */
  compressTagStart(token){
    if(this.isXML || !this.options.compressTag){
      return token;
    }
    let lowerTagName = token.detail.tagLowerCase;
    if(this.options.tagToLower){
      token.detail.tag = lowerTagName;
    }
    if(lowerTagName === 'meta' && this.options.simpleCharset){
      let ret = this.compressCharset(token);
      if(ret){
        return ret;
      }
    }
    let attrs = token.detail.attrs;
    let retAttrs = [];
    let options = this.options;
    attrs.forEach(attr => {
      if(!('value' in attr) || !('name' in attr)){
        retAttrs.push(attr);
        return;
      }

      let value = attr.value;
      let name = attr.nameLowerCase;

      // remove tag attribute default value
      if(options.removeOptionalAttrs && isTagAttrDefaultValue(name, value, lowerTagName)){
        return;
      }

      // remove xmlns attribute in html tag
      if(options.removeHtmlXmlns && lowerTagName === 'html' && name === 'xmlns'){
        return;
      }


      // tag attribute only has name, remove value
      if(options.removeAttrsOptionalValue && isTagAttrOnlyName(name)){
        delete attr.value;
        delete attr.quote;
        retAttrs.push(attr);
        return;
      }

      // remove value quote
      if(options.removeAttrsQuote && isAttrValueNoQuote(value)){
        delete attr.quote;
        retAttrs.push(attr);
        return;
      }

      // remove http/https protocol prefix
      if(name === 'href' || name === 'src'){
        if(options.removeHttpProtocol && value.indexOf('http://') === 0){
          attr.value = value.slice(5);
          retAttrs.push(attr);
          return;
        }
        if(options.removeHttpsProtocol && value.indexOf('https://') === 0){
          attr.value = value.slice(6);
          retAttrs.push(attr);
          return;
        }
      }

      // class value has extra blank chars
      if(name === 'class' && !this.hasTpl(value)){
        attr.value = value.trim().split(/\s+/).join(' ');
        retAttrs.push(attr);
        return;
      }

      // compress style value
      if(options.compressStyleValue && name === 'style'){
        let value = `*{${value}}`;
        if(this.cssHandle && this.cssHandle.compress){
          let compressValue = this.cssHandle.compress(value);
          attr.value = compressValue.slice(2, compressValue.length - 1);
        }else{
          let instance = new CssCompress(value, this.options);
          let compressValue = instance.run();
          attr.value = compressValue.slice(2, compressValue.length - 1);
        }
        retAttrs.push(attr);
        return;
      }

      // remove last ; on event
      if(name.indexOf('on') === 0){
        value = value.trim();
        if(value[value.length - 1] === ';'){
          attr.value = value.slice(0, value.length - 1);
        }
      }

      retAttrs.push(attr);
    });
    // remove / in void element
    if(this.options.removeVoidElementSlash && token.detail.slash){
      if(isVoidElement(lowerTagName)){
        token.detail.slash = false;
      }
    }
    token.detail.attrs = retAttrs;
    return token;
  }
  /**
   * compress tag end
   */
  compressTagEnd(token){
    if(this.isXML){
      return token;
    }
    
    if(this.options.removeOptionalEndEag){
      if(isOptionalEndTag(token.detail.tagLowerCase, this.options.optionalEndTagList)){
        return;
      }
    }

    if(this.options.tagToLower){
      token.detail.tag = token.detail.tagLowerCase;
    }

    return token;
  }
  /**
   * compress style
   */
  compressStyle(token){
    if(!this.options.compressTag){
      return token;
    }
    let contentToken = token.ext.content;
    let contentValue = contentToken.value.trim();
    if(this.options.removeEmptyStyle && !contentValue){
      return;
    }

    if(this.options.compressInlineCss && contentValue){
      if(this.options.cssHandle && this.options.cssHandle.compress){
        contentToken.value = this.options.cssHandle.compress(contentToken.value, this);
      }else{
        let instance = new CssCompress(contentToken.value, this.options);
        let ret = instance.run();
        contentToken.value = ret;
      }
    }

    token.ext.start = this.compressTagStart(token.ext.start);
    token.ext.end = this.compressTagEnd(token.ext.end);
    return token;
  }

  /**
   * compress script
   */
  compressScript(token){
    if(!this.options.compressTag){
      return token;
    }
    let {start, content, end} = token.ext;
    token.ext.start = this.compressTagStart(start);
    token.ext.end = this.compressTagEnd(end);
    if(start.ext.isExternal){
      return token;
    }

    let contentValue = content.value.trim();
    // remove empty script
    if(this.options.removeEmptyScript && !contentValue){
      return;
    }

    // compress inline script
    if(this.options.compressInlineJs && start.ext.isScript){
      let hasTpl = this.hasTpl(contentValue);
      if(!hasTpl && this.jsHandle && this.jsHandle.compress){
        content.value = this.jsHandle.compress(contentValue);
      }
    }

    // compress js tpl
    if(this.options.compressJsTpl && this.jsTplHandle && this.jsTplHandle.compress){
      let types = this.options.jsTplTypeList || ['text/html', 'text/template'];
      if(types.indexOf(start.ext.type.toLowerCase) > -1){
        content.value = this.jsTplHandle.compress(contentValue);
      }
    }

    return token;
  }
  /**
   * compress token
   */
  compressToken(token){
    if(!this.prev && this.options.trim){
      token.start = 0;
    }
    token = this.compressCommon(token);
    switch(token.type){
      case TokenType.HTML_DOCTYPE:
        token = this.compressDocType(token);
        break;
      case TokenType.HTML_TAG_START:
        token = this.compressTagStart(token);
        break;
      case TokenType.HTML_TEXT:
        token = this.compressText(token);
        break;
      case TokenType.HTML_TAG_END:
        token = this.compressTagEnd(token);
        break;
      case TokenType.HTML_TAG_STYLE:
        token = this.compressStyle(token);
        break;
      case TokenType.HTML_TAG_SCRIPT:
        token = this.compressScript(token);
        break;
    }
    return token;
  }
  /**
   * run
   */
  run(opts = {}, retTokens = false){
    this.initTokens();

    let firstToken = this.tokens[0];
    if(firstToken && firstToken.type === TokenType.XML_START){
      this.isXML = true;
      this.options.tagToLower = false;
    }
    let result = [];
    while(this.index < this.length){
      if(this.index){
        this.prev = this.tokens[this.index - 1];
      }
      let token = this.tokens[this.index++];
      this.next = this.tokens[this.index];

      token = this.compressToken(token);
      if(token){
        result.push(token);
      }
    }
    return retTokens ? result : token2Text(result, {
      js: this.jsHandle && this.jsHandle.stringify,
      css: this.cssHandle && this.cssHandle.stringify
    });
  }
}