import Base from '../../util/tokenize.js';
import TokenType from '../../util/token_type.js';
import Message from '../../util/message.js';
import {
  specialTokens,
  reservedCommentPrefix,
  rawTokens
} from './config.js';
import {
  isTagFirstChar,
  isTagNameChar,
  parseScriptAttrs,
  parseStyleAttrs
} from './util.js';

const specialTokensLength = specialTokens.length;
const reservedCommentLength = reservedCommentPrefix.length;
const rawTokensLength = rawTokens.length;
const isArray = Array.isArray;

/**
 * html tokenize
 */
export default class HtmlTokenize extends Base {
  /**
   * get next token
   * @return {Object} [token]
   */
  getNextToken() {
    let token = super.getNextToken();
    if (token || token === false) {
      return token;
    }
    const code = this._text.charCodeAt(this.pos);
    // <
    if (code === 0x3c) {
      const nextCode = this._text.charCodeAt(this.pos + 1);
      // all special token start with <!
      token = nextCode === 0x21 ? this.getSpecialToken() : this.getRawToken();
      if (token) {
        return token;
      }
      if (isTagFirstChar(nextCode)) {
        return this.getTagToken();
      }
    }
    return this.getTextToken();
  }
  /**
   * get text token
   * @return {Object} []
   */
  getTextToken() {
    let ret = '';
    while (this.pos < this.length) {
      if (this.isTplNext()) {
        break;
      }
      const nextCode = this._text.charCodeAt(this.pos);
      const next2Code = this._text.charCodeAt(this.pos + 1);
      // if next char is < and next2 char is tag first char
      if (nextCode === 0x3c && (next2Code === 0x21 || isTagFirstChar(next2Code))) {
        break;
      }
      ret += this.next();
    }
    const token = this.getToken(TokenType.HTML_TEXT, ret);
    token.value = ret;
    return token;
  }
  /**
   * get tag token
   * @return {Object} []
   */
  getTagToken() {
    this.record();
    let ret = this.next();
    let type, tagEnd = false, quote;
    while (this.pos < this.length) {
      const chr = this.text[this.pos];
      const code = this._text.charCodeAt(this.pos);
      if (!type) {
        switch (code) {
          case 0x2f: // /
            const nextCode = this._text.charCodeAt(this.pos + 1);
            // if next char is not  >= 'a' && <= 'z', throw error
            if (nextCode >= 0x61 && nextCode <= 0x7a) {
              type = TokenType.HTML_TAG_END;
            } else {
              this.error('end tag is not valid');
            }
            break;
          case 0x3f: // ?
            ret += this.next();
            if (this.lookAt('xml ') || this.lookAt('xml>')) {
              type = TokenType.XML_START;
            } else {
              type = TokenType.HTML_TAG_START;
            }
            break;
          default:
            // a-z
            if (code >= 0x61 && code <= 0x7a) {
              const tagName = this.getTagName();
              const tagAttrs = this.getTagAttrs();
              const str = '<' + tagName + tagAttrs.value;
              const token = this.getToken(TokenType.HTML_TAG_START, str, {
                tag: tagName,
                tagLowerCase: tagName.toLowerCase(),
                attrs: tagAttrs.attrs,
                slash: tagAttrs.slash
              });
              return token;
            } else {
              type = TokenType.HTML_TEXT;
            }
            break;
        }
      }
      if (code === 0x22 || code === 0x27) { // char is ' or "
        quote = this.getQuote({
          checkNext: true,
          rollback: true
        });
        ret += quote.value;
        if (!quote.find) {
          this.error(`can not find matched quote char \`${chr}\``);
        }
        continue;
      }
      const tpl = this.getTplToken();
      if (tpl) {
        ret += tpl.value;
        continue;
      }
      // 0x3e is >
      if (code === 0x3e) {
        ret += this.next();
        tagEnd = true;
        break;
      }
      ret += this.next();
    }
    // tag not closed
    if (!tagEnd) {
      return this.getToken(TokenType.HTML_RAW_TEXT, ret);
    }
    // get tag attrs
    if (type === TokenType.HTML_TAG_END) {
      // 8.1.2.2 in http://www.w3.org/TR/html5/syntax.html
      // in end tag, may be have whitespace on right
      const tag = ret.slice(2, -1).trim();
      const token = this.getToken(type, ret, {
        tag: tag,
        tagLowerCase: tag.toLowerCase()
      });
      return token;
    }
    return this.getToken(type, ret);
  }
  /**
   * get tag name
   * @return {[type]} [description]
   */
  getTagName() {
    let chr, ret = '';
    while (this.pos < this.length) {
      chr = this._text[this.pos];
      if (!isTagNameChar(chr.charCodeAt(0))) {
        break;
      }
      ret += this.next();
    }
    return ret;
  }
  /**
   * get tag attrs
   * http://www.w3.org/TR/html5/syntax.html
   * @param  {String} tag [tag string]
   * @return {Object}     [tag name & attrs]
   */
  getTagAttrs() {
    let attrs = [], chr, code, value = '';
    let hasEqual = false, spaceBefore = false, tagEnd = false;
    const tplInstance = this.getTplInstance();
    let attrName = '', attrValue = '', tplToken;
    let voidElement = false;
    const commentBefore = this.commentBefore;
    // avoid comments to tplToken
    this.commentBefore = [];
    while (this.pos < this.length) {
      tplToken = this.getTplToken();
      if (tplToken) {
        value += tplToken.value;
        if (tplInstance.hasOutput(tplToken)) {
          if (hasEqual) {
            attrValue += tplToken.value;
          } else {
            attrName += tplToken.value;
          }
        } else {
          if (hasEqual) {
            if (attrValue) {
              attrs.push({name: attrName, value: attrValue}, tplToken);
              attrName = attrValue = '';
            } else {
              attrValue += tplToken.value;
            }
          } else {
            if (attrName) {
              attrs.push({name: attrName});
            }
            tplToken.spaceBefore = spaceBefore;
            attrs.push(tplToken);
            attrName = attrValue = '';
          }
        }
        spaceBefore = false;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      value += chr;
      // char is >
      if (code === 0x3e) {
        tagEnd = true;
        this.next();
        break;
      }
      voidElement = false;
      if (code === 0x3d) { // char is =
        hasEqual = true;
        spaceBefore = false;
      } else if (!hasEqual && code === 0x2f) { // 0x2f is /
        voidElement = true;
        if (this.text.charCodeAt[this.pos - 1] !== 0x2f) {
          if (attrName) {
            attrs.push({name: attrName});
          }
          attrName = attrValue = '';
          hasEqual = false;
        }
      } else if (hasEqual && (code === 0x22 || code === 0x27)) { // char is ' or "
        const quote = this.getQuote({
          checkNext: true,
          rollback: true
        });
        value += quote.value.slice(1);
        // quote string not found
        if (!quote.find) {
          this.error(`can not find matched quote char \`${chr}\``);
        }
        attrValue += quote.value;
        attrs.push({name: attrName, value: attrValue});
        attrName = attrValue = '';
        hasEqual = spaceBefore = false;
        continue;
      } else if (this.isWhiteSpace(code)) { // whitespace
        if (hasEqual && attrValue) {
          attrs.push({name: attrName, value: attrValue});
          attrName = attrValue = '';
          hasEqual = spaceBefore = false;
        } else {
          spaceBefore = true;
        }
      } else {
        if (hasEqual) {
          attrValue += chr;
        } else {
          if (spaceBefore && attrName) {
            attrs.push({name: attrName});
            attrName = chr;
          } else {
            attrName += chr;
          }
        }
        spaceBefore = false;
      }
      this.next();
    }
    // add extra attr name or attr value
    if (attrName || attrValue) {
      if (hasEqual) {
        attrs.push({name: attrName, value: attrValue});
      } else {
        attrs.push({name: attrName});
      }
    }
    if (!tagEnd) {
      return {
        value: value,
        message: Message.TagUnClosed
      };
    }
    for (let i = 0, length = attrs.length, item; i < length; i++) {
      item = attrs[i];
      if (item.ld) {
        attrs[i].tpl = true;
        continue;
      } else if (item.value !== undefined) {
        code = item.value.charCodeAt(0);
        if (code === 0x22 || code === 0x27) {
          attrs[i].quote = item.value.slice(0, 1);
          attrs[i].value = item.value.slice(1, -1);
        } else {
          attrs[i].quote = '';
          attrs[i].value = item.value;
        }
        const hasTpl = this.hasTpl(attrs[i].value);
        // add has tpl flag for value
        if (hasTpl && !attrs[i].type) {
          attrs[i].hasTpl = true;
        }
      }
      // template syntax in attribute name
      // may be has uppercase chars in template syntax
      // etc: <input <?php echo $NAME;?>name="value" >
      if (this.hasTpl(item.name)) {
        attrs[i].nameLowerCase = item.name;
      } else {
        attrs[i].nameLowerCase = item.name.toLowerCase();
      }
    }
    this.commentBefore = commentBefore;
    return {
      value: value,
      slash: voidElement,
      attrs: attrs
    };
  }
  /**
   * skip comment
   * @return {void} []
   */
  skipComment() {
    // start with <!
    commentLabel: while (this.text.charCodeAt(this.pos) === 0x3c &&
      this.text.charCodeAt(this.pos + 1) === 0x21) {
      for (let i = 0; i < reservedCommentLength; i++) {
        if (this.lookAt(reservedCommentPrefix[i])) {
          break commentLabel;
        }
      }
      // template delimiter may be <!-- & -->
      if (this.isTplNext()) {
        break;
      }
      const comment = this.getCommentToken(2);
      if (comment) {
        this.commentBefore.push(comment);
      } else {
        break;
      }
    }
  }
  /**
   * get raw element token
   * @return {Object} []
   */
  getRawToken() {
    let i = 0, item, pos = 0, code;
    let startToken, contentToken, endToken, token;
    while (i < rawTokensLength) {
      item = rawTokens[i++];
      if (!this.lookAt(item[0])) {
        continue;
      }
      code = this._text.charCodeAt(this.pos + item[0].length);
      // next char is not space or >
      if (!this.isWhiteSpace(code) && code !== 0x3e) {
        continue;
      }
      pos = this.find(item[1]);
      if (pos === -1) {
        return;
      }
      code = this._text.charCodeAt(pos + item[1].length);
      // next char is not space or >
      if (!this.isWhiteSpace(code) && code !== 0x3e) {
        continue;
      }
      token = this.getToken(item[2], '');

      this.startToken();
      startToken = this.getTagToken();
      if (item[2] === TokenType.HTML_TAG_SCRIPT) {
        startToken = parseScriptAttrs(startToken, this.options.jsTplTypes);
      } else if (item[2] === TokenType.HTML_TAG_STYLE) {
        startToken = parseStyleAttrs(startToken);
      }
      this.startToken();
      contentToken = this.getToken(TokenType.HTML_RAW_TEXT, this.forward(pos - this.pos));
      // add hasTpl flag for content token
      contentToken.ext.hasTpl = this.hasTpl(contentToken.value);
      this.startToken();
      endToken = this.getTagToken();
      token.value = startToken.value + contentToken.value + endToken.value;
      token.ext.start = startToken;
      token.ext.content = contentToken;
      token.ext.end = endToken;
      return token;
    }
  }
  /**
   * get special token
   * @return {Object} []
   */
  getSpecialToken() {
    let pos, npos, findItem, j, length, ret, i = 0, item;
    while (i < specialTokensLength) {
      item = specialTokens[i++];
      // if text is not start with item[0], continue
      if (!this.lookAt(item[0])) {
        continue;
      }
      if (isArray(item[1])) {
        pos = -1;
        findItem = '';
        for (j = 0, length = item[1].length; j < length; j++) {
          npos = this.find(item[1][j]);
          if (npos === -1) {
            continue;
          }
          if (pos === -1) {
            pos = npos;
            findItem = item[1][j];
          } else if (npos < pos) {
            pos = npos;
            findItem = item[1][j];
          }
        }
        // find end special chars
        if (findItem) {
          length = pos + findItem.length - this.pos;
          ret = this.text.substr(this.pos, length);
          this.forward(length);
          return this.getToken(item[2], ret);
        }
      } else {
        ret = this.getMatched(item[0], item[1]);
        if (ret) {
          return this.getToken(item[2], ret);
        }
      }
    }
  }
}
