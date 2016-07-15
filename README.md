# flkit

A JS/HTML/CSS Toolkit(Tokenizer、Parser) Support Template Syntax.

## Install

```js
npm install flkit;
```

## Methods

### getHtmlAttrValue(attrs, name)

* `attrs` {Array} 属性列表
* `name` {String} 属性名

获取属性值，如：

```js
import {getHtmlAttrValue} from 'flkit';
let attrs = token.ext.attrs;
let value = getHtmlAttrValue(attrs, 'src'); //获取属性 src 的值
```

### setHtmlAttrValue(attrs, name, value)

* `attrs` {Array} 属性列表
* `name` {String} 属性名
* `value` {String} 属性值

设置属性值，如果没有这个属性，则添加这个属性。如：

```js
import {setHtmlAttrValue} from 'flkit';
let attrs = token.ext.attrs;
attrs = setHtmlAttrValue(attrs, 'src', 'http://flkit.org');
```

### createToken(type, value, referToken)

* `type` {TokenType} Token 类型
* `value` {String} Token 值
* `referToken` {Token} 相关的 Token，主要是提取 Token 的位置

创建一个 Token，如：

```js
import {createToken} from 'flkit';
let token = createToke(TokenType.HTML_TAG_START, '<div name="flkit">');
```

### createRawToken(type, value, referToken)

* `type` {style | script} Token 类型 
* `value` {String | Array} Token 值
* `referToken` {Token} 相关的 Token，主要是提取 Token 的位置

创建一个 Script 或者 Style Token，如：

```js
import {createRawToken} from 'flkit';

createRawToken('script', 'var a = 1;');
createRawToken('style', 'a{color: red}');

createRawToken('style', [
  ...tokenList
])

```


### TokenType

```js
import {TokenType} from 'flkit';
```

包含的 TokenType 如下：

```
{
  EOS: 'eos',
  TPL: 'tpl',
  RESERVED_COMMENT: 'reserverd_comment',
  IE_HACK: 'ie_hack',
  
  XML_START: 'xml_start',
 
  HTML_TAG_START: 'html_tag_start',
  HTML_TAG_END: 'html_tag_end',
  HTML_TAG_TEXTAREA: 'html_tag_textarea',
  HTML_TAG_SCRIPT: 'html_tag_script',
  HTML_TAG_STYLE: 'html_tag_style',
  HTML_TAG_PRE: 'html_tag_pre',
  HTML_RAW_TEXT: 'html_raw_text',
  HTML_DOCTYPE: 'html_doctype',
  HTML_TEXT: 'html_text',
  HTML_CDATA: 'html_cdata',
  
  CSS_SELECTOR: 'css_selector',
  CSS_PROPERTY: 'css_property',
  CSS_VALUE: 'css_value',
  CSS_KEYFRAMES: 'css_keyframes',
  CSS_LEFT_BRACE: 'css_left_brace',
  CSS_RIGHT_BRACE: 'css_right_brace',
  CSS_SEMICOLON: 'css_semicolon',
  CSS_COLON: 'css_colon',
  CSS_MEDIA: 'css_media',
  CSS_NAMESPACE: 'css_namespace',
  CSS_IMPORT: 'css_import',
  CSS_CHARSET: 'css_charset',
  CSS_FONT_FACE: 'css_font_face',
  CSS_PAGE: 'css_page',
  CSS_AT: 'css_at',
  CSS_BRACK_HACK: 'css_brace_hack', // [;color: red;]
  CSS_VIEWPORT: 'css_viewport',
  CSS_MOZILLA: 'css_mozilla',

  CSS_SELECTOR_NAMESPACE: 'css_selector_namespace',
  CSS_SELECTOR_UNIVERSAL: 'css_selector_universal',
  CSS_SELECTOR_ATTRIBUTE: 'css_selector_attribute',
  CSS_SELECTOR_CLASS: 'css_selector_class',
  CSS_SELECTOR_ID: 'css_selector_id',
  CSS_SELECTOR_PSEUDO_CLASS: 'css_selector_pseudo_class',
  CSS_SELECTOR_PSEUDO_ELEMENT: 'css_selector_pseudo_element',
  CSS_SELECTOR_COMBINATOR: 'css_selector_combinator',
  CSS_SELECTOR_TYPE: 'css_selector_type',
  CSS_SELECTOR_COMMA: 'css_selector_comma'
}
```