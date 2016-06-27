import Base from '../../util/base.js';
import Tokenize from './tokenize.js';

/**
 * compress options
 */
const compressOpts = {
  "trim" : false,  //去除首尾空白字符 
  "remove_comment" : true,  //移除注释
  "simple_doctype" : true,  //简化doctype
  "simple_charset" : true,  //简化charset
  "remove_newline" : false,  //删除换行符，一般情况下不要启用
  "newline_to_space" : true,  //换行符转为空格
  "tag_to_lower" : true,  //小写标签名
  "remove_html_xmlns" : true,  //移除html的命名空间
  "remove_inter_tag_space" : false,  //移除标签之间的空格，非安全
  "remove_inter_block_tag_space" : false,  //移除块级元素之间的空格，非安全
  "replace_multi_space" : " ",  //将多个空格替换为一个 
  "remove_empty_script" : false,  //移除空的script标签
  "remove_empty_style" : false,  //移除空的style标签
  "remove_optional_attrs" : true,  //移除可选的属性
  "remove_attrs_quote" : true,  //移除属性值的引号
  "remove_attrs_optional_value" : true,  //移除可选属性的值
  "remove_http_protocol" : false,  //移除http协议
  "remove_https_protocol" : false,  //移除https协议
  "remove_optional_end_tag" : true,  //移除可选的结束标签
  "remove_optional_end_tag_list" : [],  //结束标签列表
  "compress_style_value" : true,  //压缩标签的style值 
  "compress_inline_css" : true,  //压缩内联的CSS
  "compress_inline_js" : true,  //压缩内联的JS
  'remove_inline_js_cdata' : true,  //
  "compress_js_tpl" : false,  //压缩前端模版
  "compress_tag" : true,  //压缩标签
  "merge_adjacent_css" : true,  //合并相邻的css
  "merge_adjacent_js" : false  //合并相邻的js
}

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
    this.jsCompress = undefined;
    this.cssCompress = undefined;
    this.jsTplCompress = undefined;
    this.result = [];
    this.index = 0;
    this.length = 0;

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
   * get current token
   */
  getToken(){
    let index = this.index++;
    if(index > 0){
      this.prev = this.tokens[this.index - 1];
    }
    if(index < this.length - 1){
      this.next = this.tokens[this.index + 1];
    }else{
      this.next = null;
    }
    this.token = this.tokens[index];
    return this.token;
  }
  /**
   * run
   */
  run(opts = {}, retTokens = false){
    this.initTokens();
    this.options = {...compressOpts, ...opts};
    
  }
}