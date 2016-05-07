
export default class {
  /**
   * constructor
   * @return {[type]} []
   */
  constructor(){

  }
  /**
   * has output
   * @return {Boolean} []
   */
  hasOutput(){
    return false;
  }
  /**
   * check text has tpl
   * @param  {[type]} ld   []
   * @param  {[type]} rd   []
   * @param  {[type]} text []
   * @return {[type]}      []
   */
  hasTpl(text, ld, rd){
    return text.indexOf(ld) > -1 && text.indexOf(rd) > -1;
  }
  
  /**
   * get tpl matched
   * @param  {Object} lexer []
   * @return {Object}       []
   */
  _getMatched(start, end, tokenizeInstance, options = {
    multiComment: false, //multi line comment
    lineComment: false, //line comment
    ignoreEnd: false, //ignore right delemiter
    nest: false, //allow nest delimiter
    quote: false //quote
  }){
    if (!tokenizeInstance.lookAt(start)) {
      return false;
    }
    tokenizeInstance.record();
    let startLength = start.length, endLength = end.length;
    let pos = tokenizeInstance.find(end, startLength), ret = '';
    //can't find end string in text
    if (pos === -1) {
      //can ignore end chars, etc: php can ignore ?>
      if (options.ignoreEnd) {
        ret = tokenizeInstance.text.slice(tokenizeInstance.pos);
        tokenizeInstance.pos = tokenizeInstance.length;
        return ret;
      }
      return false;
    }
    ret = tokenizeInstance.forward(startLength);
    let nums = 0, chr, code, nextCode;
    let nest = options.nest, quote = options.quote, escape = false;
    let multiComment = options.multiComment;
    let lineComment = options.lineComment, comment;
    while(tokenizeInstance.pos < tokenizeInstance.length){
      chr = tokenizeInstance.text[tokenizeInstance.pos];
      code = chr.charCodeAt(0);
      if (tokenizeInstance.lookAt(end)) {
        ret += tokenizeInstance.forward(endLength);
        if (!nest || nums === 0) {
          return ret;
        }
        nums--;
        continue;
      }else if(nest && tokenizeInstance.lookAt(start)){
        ret += tokenizeInstance.forward(startLength);
        nums++;
        continue;
      }
      code = tokenizeInstance.text.charCodeAt(tokenizeInstance.pos);
      //quote char
      if (quote) {
        if (code === 0x5c || escape) {
          escape = !escape;
          ret += tokenizeInstance.next();
          continue;
        }else if (!escape && (code === 0x22 || code === 0x27)) {
          ret += tokenizeInstance.getQuote({
            rollback: true
          }).value;
          continue;
        }
      }
      //comment
      if (code === 0x2f) { // /
        nextCode = tokenizeInstance.text.charCodeAt(tokenizeInstance.pos + 1);
        comment = '';
        if (multiComment && nextCode === 0x2a) {
          comment = tokenizeInstance.getCommentToken(1, false);
        }else if (lineComment && nextCode === 0x2f) {
          comment = tokenizeInstance.getCommentToken(0, false);
        }
        if (comment) {
          ret += comment.value;
          continue;
        }
      }
      ret += tokenizeInstance.next();
    }
    if (nums !== 0 && !options.ignoreEnd) {
      return tokenizeInstance.error(`get matched string ${start} & ${end} error`, true);
    }
    return ret;
  }
  /**
   * get template matched
   */
  getMatched(ld, rd, tokenizeInstance){
    return this._getMatched(ld, rd, tokenizeInstance);
  }
}