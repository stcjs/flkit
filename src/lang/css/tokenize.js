import BaseTokenize from '../../util/tokenize.js';
import TokenType from '../../util/token_type.js';
import {comments} from '../../util/config.js';
import SelectorTokenize from './selector_tokenize.js';
// import Message from '../../util/message.js';
import {isHackChar} from './util.js';
import {atType} from './config.js';

const multiComment = comments[1];

/**
 * status
 */
const STATUS = {
  SELECTOR: 0,
  PROPERTY: 1
};

/**
 * css tokenize
 */
export default class CssTokenize extends BaseTokenize {
  /**
   * constructor
   *
   */
  constructor(text, options = {
    parseSelector: false
  }) {
    super(text, options);
    this.prevToken = {};
    this.status = STATUS.SELECTOR;
    this.skipCd();
  }
  /**
   * get next token
   * @return {void} []
   */
  getNextToken() {
    this.skipWhiteSpace();
    this.skipComment();
    this.startToken();
    if (this.pos >= this.length) {
      return this.getLastToken();
    }

    const token = this.getTplToken();
    if (token) {
      return token;
    }
    if (this.lookAt(multiComment[0] + '!')) {
      const value = this.getMatched(multiComment[0] + '!', multiComment[1]);
      return this.getToken(TokenType.RESERVED_COMMENT, value);
    }
    const type = this.prevToken.type;
    const code = this._text.charCodeAt(this.pos);
    switch (code) {
      case 0x40: // @
        return this.getAtToken();
      case 0x7b: // {
        if (type === TokenType.CSS_SELECTOR) {
          this.status = STATUS.PROPERTY;
        }
        return this.getToken(TokenType.CSS_LEFT_BRACE, this.next());
      case 0x7d: // }
        this.status = STATUS.SELECTOR;
        const token1 = this.getToken(TokenType.CSS_RIGHT_BRACE, this.next());
        this.prevToken = token1;
        return token1;
      case 0x3a: // :
        if (type === TokenType.CSS_PROPERTY ||
            type === TokenType.CSS_SELECTOR ||
            type === TokenType.CSS_VALUE ||
            type === TokenType.CSS_COLON) {
          const token = this.getToken(TokenType.CSS_COLON, this.next());
          this.prevToken = token;
          return token;
        }
        break;
      case 0x3b: // ;
        const token = this.getToken(TokenType.CSS_SEMICOLON, this.next());
        this.prevToken = token;
        return token;
      case 0x5b: // [
        if (type === TokenType.CSS_SELECTOR ||
            type === TokenType.CSS_VALUE ||
            type === TokenType.CSS_SEMICOLON) {
          // for hack [;color: red;]
          const ret = this.getMatched('[', ']');
          if (ret) {
            return this.getToken(TokenType.CSS_BRACK_HACK, ret);
          }
        }
    }
    if (type === TokenType.CSS_PROPERTY || type === TokenType.CSS_COLON) {
      return this.getValueToken();
    }
    if (this.status === STATUS.PROPERTY) {
      return this.getPropertyToken();
    }
    return this.getSelectorToken();
  }
  /**
   * get selector or name token
   * @return {Object} []
   */
  getSelectorToken() {
    let ret = '', code, str, token, chr, record, escape = false;
    let tmpValue = '', tmpFlag = false;
    while (this.pos < this.length) {
      token = this.getTplToken();
      if (token) {
        ret += token.value;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x5c || escape) {
        escape = !escape;
        ret += this.next();
        continue;
      } else if (code === 0x7b) { // {
        break;
      } else if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        record = record || this.record();
        tmpValue += this.getCommentToken(1, false).value;
        continue;
      }
      if (tmpValue && code !== 0x5b) {
        tmpValue += chr;
        tmpFlag = true;
      }
      if (record && !this.isWhiteSpace(code)) {
        record = undefined;
        ret += tmpValue;
        tmpValue = '';
      }
      if (!escape && (code === 0x22 || code === 0x27)) {
        ret += this.getQuote({
          rollback: true
        }).value;
        continue;
      } else if (code === 0x5b) { // [ ]
        str = this.getMatchedChar(0x5b, 0x5d, {
          quote: true
        });
        if (str) {
          ret += str;
          continue;
        }
      } else if (code === 0x28) { // ( )
        str = this.getMatchedChar(0x28, 0x29, {
          quote: true,
          nest: true
        });
        if (str) {
          ret += str;
          continue;
        }
      }
      if (tmpFlag) {
        this.next();
        tmpFlag = false;
      } else {
        ret += this.next();
      }
    }
    token = this.getToken(TokenType.CSS_SELECTOR, ret);
    token.value = this.skipRightSpace(ret);
    if (record) {
      // record.spaceBefore = record.newlineBefore = 0;
      this.rollback(record);
    }
    if (this.options.parseSelector) {
      token.ext = new SelectorTokenize(token.value, this.options).run();
    }
    return token;
  }
  /**
   * get property token
   * @return {Object} []
   */
  getPropertyToken() {
    let ret = '', chr, code;
    this.record();
    while (this.pos < this.length) {
      chr = this._text[this.pos];
      code = chr.charCodeAt(0);
      // ;
      if (code === 0x3b) {
        this.rollback();
        return this.getValueToken();
      }
      // : / }
      if (code === 0x3a || code === 0x2f || code === 0x7d || this.isWhiteSpace(code)) {
        break;
      }
      ret += this.next();
    }
    return this.getToken(TokenType.CSS_PROPERTY, ret, this.parseProperty(ret));
  }
  /**
   * parse property
   * @return {Object} []
   */
  parseProperty(property) {
    let prefix = '', suffix = '', code = property.charCodeAt(0);
    if (code === 0x2d) {
      property = property.replace(/^\-\w+\-/, function(a) {
        prefix = a;
        return '';
      });
    } else if (isHackChar(code)) {
      prefix = property[0];
      property = property.slice(1);
    }
    return {
      prefix: prefix.toLowerCase(),
      suffix: suffix,
      value: property.toLowerCase()
    };
  }
  /**
   * get value token
   * @return {Object} []
   */
  getValueToken() {
    let ret = '', code, chr, token;
    let escape = false, record, quote, hasTpl = false;
    let tplValue = '', tmpFlag = false;
    while (this.pos < this.length) {
      token = this.getTplToken();
      if (token) {
        ret += token.value;
        hasTpl = true;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x5c || escape) {
        escape = !escape;
        ret += this.next();
        continue;
      } else if (code === 0x3b || code === 0x7d) { // ; or }
        break;
      } else if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        record = record || this.record();
        tplValue += this.getCommentToken(1, false).value;
        continue;
      }
      if (tplValue) {
        tplValue += chr;
        tmpFlag = true;
      }
      if (record && !this.isWhiteSpace(code)) {
        record = undefined;
        ret += tplValue;
        tplValue = '';
      }
      if (!escape && (code === 0x22 || code === 0x27)) {
        quote = this.getQuote({
          rollback: true
        });
        if (!quote.find) {
          this.error(`can not find matched quote \`${chr}\``);
        }
        ret += quote.value;
        continue;
      } else if (code === 0x28) { // ( )
        ret += this.getMatchedChar(0x28, 0x29, {
          nest: true,
          quote: true,
          multi_comment: true
        });
        continue;
      }
      if (tmpFlag) {
        this.next();
        tmpFlag = false;
      } else {
        ret += this.next();
      }
    }
    token = this.getToken(TokenType.CSS_VALUE, ret);
    ret = this.skipRightSpace(ret);
    token.value = ret;
    if (record) {
      // record.spaceBefore = record.newlineBefore = 0;
      this.rollback(record);
    }
    token.ext = this.parseValue(ret);
    token.ext.hasTpl = hasTpl;
    return token;
  }
  /**
   * parse css value
   * @param  {String} value []
   * @return {Object}       []
   */
  parseValue(value) {
    // get css value suffix & important
    let prefix = '', suffix = '', important = false;
    if (value.indexOf('\\') > -1) {
      value = value.replace(/(?:\\\d)+$/, function(a) {
        suffix = a;
        return '';
      });
    }
    if (value.indexOf('!') > -1) {
      value = value.replace(/!\s*important/i, function() {
        important = true;
        return '';
      });
    }
    // get css value prefix
    if (value.charCodeAt(0) === 0x2d) {
      value = value.replace(/^\-\w+\-/, function(a) {
        prefix = a;
        return '';
      });
    }
    if (suffix || important) {
      value = value.trim();
    }
    return {
      prefix: prefix,
      suffix: suffix,
      important: important,
      value: value
    };
  }
  /**
   * skip comment
   * @return {void} []
   */
  skipComment() {
    // start with /*, but not /*!
    let comment;
    while (this.text.charCodeAt(this.pos) === 0x2f &&
      this.text.charCodeAt(this.pos + 1) === 0x2a &&
      this.text.charCodeAt(this.pos + 2) !== 0x21) {
      comment = this.getCommentToken(1, true);
      this.commentBefore.push(comment);
    }
  }
  /**
   * get @ token
   * @return {Object} []
   */
  getAtToken() {
    let i = 0, item, code, ret = '', length, chr, type = TokenType.CSS_AT;
    for (; item = atType[i++];) {
      if (!this.lookAt(item[0])) {
        continue;
      }
      length = item[0].length;
      code = this._text.charCodeAt(this.pos + length);
      // whitespace or ; or { or / or ' or " or : or ,
      if (code === 0x20 || code === 0x3b || code === 0x7b ||
          code === 0x2f || code === 0x22 || code === 0x27 ||
          code === 0x3a || code === 0x2c) {
        ret = this.forward(length);
        type = item[1];
        break;
      }
    }
    while (this.pos < this.length) {
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        ret += this.getCommentToken(1, false).value;
        continue;
      } else if (code === 0x22 || code === 0x27) {
        ret += this.getQuote().value;
        continue;
      }
      // ;
      if (code === 0x3b) {
        ret += this.next();
        break;
      }
      // {
      if (code === 0x7b) {
        break;
      }
      ret += this.next();
    }
    const token = this.getToken(type, ret);
    token.value = this.skipRightSpace(ret);
    return token;
  }
  /**
   * run
   * @return {Array} [text tokens]
   */
  run() {
    let ret = [], token, type;
    for (; token = this.getNextToken();) {
      if(token.type === TokenType.CSS_LEFT_BRACE && ret.length && ret[ret.length - 1].type === TokenType.TPL) {
        const prev = ret[ret.length - 1];
        prev.type = TokenType.CSS_SELECTOR;
        prev.ext = {};
        this.prevToken = prev;
        this.status = STATUS.PROPERTY;
      }
      //  merge when prev token is tpl
      else if (token.type === TokenType.CSS_SELECTOR && ret.length && ret[ret.length - 1].type === TokenType.TPL) {
        const prev = ret[ret.length - 1];
        let space = '';
        if (prev.end !== token.start) {
          space = ' ';
        }
        token.value = prev.value + space + token.value;
        token.start = prev.start;
        token.loc.start = prev.loc.start;
        if (token.ext.group) {
          token.ext.group[0].tokens[0].value = prev.value + space + token.ext.group[0].tokens[0].value;
        }
        ret.length = ret.length - 1;
      }
      ret.push(token);
      type = token.type;
      if (type === TokenType.TPL || type === TokenType.CSS_LEFT_BRACE ||
          type === TokenType.CSS_RIGHT_BRACE || type === TokenType.CSS_COLON ||
          type === TokenType.CSS_SEMICOLON || type === TokenType.CSS_BRACK_HACK ||
          type === TokenType.RESERVED_COMMENT
      ) {
        continue;
      }
      this.prevToken = token;
      if (type === TokenType.CSS_FONT_FACE ||
          type === TokenType.CSS_PAGE ||
          type === TokenType.CSS_VIEWPORT ||
          type === TokenType.CSS_AT) {
        this.status = STATUS.PROPERTY;
      }
    }
    return ret;
  }
}
