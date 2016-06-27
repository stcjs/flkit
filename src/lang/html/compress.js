import Base from '../../util/base.js';
import Tokenize from './tokenize.js';
import TokenType from '../../util/token_type.js';
import {token2Text} from './util.js';

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
  'removeInterBlockTagSpace': false,  //移除块级元素之间的空格，非安全
  'removeEmptyScript': false,  //移除空的script标签
  'removeEmptyStyle': false,  //移除空的style标签
  'removeOptionalAttrs': true,  //移除可选的属性
  'removeAttrsQuote': true,  //移除属性值的引号
  'removeAttrsOptionalValue': true,  //移除可选属性的值
  'removeHttpProtocol': false,  //移除http协议
  'removeHttpsProtocol': false,  //移除https协议
  'removeOptionalEndEag': true,  //移除可选的结束标签
  'optionalEndTagList': null,  //结束标签列表
  'removeSingleTagSlash': true, //移除单一标签最后的 /
  'singleTagSlashList': null, //保留单一标签最后的 / 标签名列表
  'compressStyleValue': true,  //压缩标签的style值 
  'compressInlineCss': true,  //压缩内联的CSS
  'compressInlineJs': true,  //压缩内联的JS
  'removeInlineJsCdata': true,  //
  'compressJsTpl': false,  //压缩前端模版
  'compressTag': true,  //压缩标签
  'mergeAdjacentCss': true,  //合并相邻的css
  'mergeAdjacentJs': false  //合并相邻的js
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
    this.options = {};
    this.result = [];
    this.index = 0;
    this.length = 0;

    this.jsHandle = null;
    this.cssHandle = null;
    this.jsTplHandle = null;

    this.token = null;
    this.prev = null;
    this.next = null;
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
    return token;
  }
  /**
   * compress text
   */
  compressText(token){
    let value = token.value;
    // 如果文本中含有//，则不去除换行等，主要是一些异步接口（JS环境）会被识别成HTML环境，如果有JS的//注释就要注意了
    if(value.indexOf('//') > -1){
      return token;
    }
    value = value.replace(/\s+/g, ' ');
    token.value = value;
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
      case TokenType.HTML_TEXT:
        token = this.compressText(token);
        break;
    }
    return token;
  }
  /**
   * run
   */
  run(opts = {}, retTokens = false){
    this.initTokens();
    this.options = {...compressOpts, ...opts};
    while(this.index < this.length){
      this.prev = this.token;
      this.token = this.tokens[this.index++];
      this.next = this.tokens[this.index];

      if(this.token.type === TokenType.XML_START){
        this.isXML = true;
        this.options.tagToLower = false;
      }
      let token = this.compressToken(this.token);
      if(token){
        this.result.push(token);
      }
    }
    return retTokens ? this.result : token2Text(this.result, {
      js: this.jsHandle && this.jsHandle.stringify,
      css: this.cssHandle && this.cssHandle.stringify
    });
  }
}