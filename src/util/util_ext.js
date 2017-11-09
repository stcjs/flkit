import BaseTokenize from './tokenize.js';
import TokenType from './token_type.js';

const baseTokenizeInstance = new BaseTokenize('');
/**
 * create token
 */
export function createToken(type, value, referToken) {
  const token = baseTokenizeInstance.getToken(type, value);
  token.start = referToken ? referToken.start : 0;
  token.end = token.start + value.length;
  return token;
}

/**
 * create raw token, such as: style or script
 */
const types = {
  style: TokenType.HTML_TAG_STYLE,
  script: TokenType.HTML_TAG_SCRIPT
};
const tags = {
  [TokenType.HTML_TAG_STYLE]: 'style',
  [TokenType.HTML_TAG_SCRIPT]: 'script'
};
export function createRawToken(type, value, referToken) {
  type = types[type] || type;
  let tokens;
  if (Array.isArray(value)) {
    tokens = value;
    value = '';
  }
  const token = createToken(type, value, referToken);
  const tagName = tags[type];
  const startToken = createToken(TokenType.HTML_TAG_STYLE, `<${tagName}>${value}</${tagName}>`, referToken);
  startToken.ext = {
    attrs: [],
    tag: tagName,
    tagLowerCase: tagName
  };
  const contentToken = createToken(TokenType.HTML_RAW_TEXT, value, startToken);
  contentToken.ext = {
    tokens
  };
  const endToken = createToken(TokenType.HTML_TAG_END, `</${tagName}>`, contentToken);
  endToken.ext = {
    tag: tagName,
    tagLowerCase: tagName
  };
  token.ext = {
    start: startToken,
    content: contentToken,
    end: endToken
  };
  return token;
}
