const CssCompress = require('./lib/index').CssCompress;

const str = `{%$_cssId%} .mh-sad{
  margin-top: 4px;
  height: 23px;
  line-height: 23px;
  padding-right: 10px;
  overflow: hidden;
}
{%$_cssId%} .mh-sad .mh-sad-tag{
  display: inline-block;
  border: 1px solid #EFD596;
  border-radius: 2px;
  font-size: 12px;
  line-height: 14px;
  color: #EFD596;
  padding: 0 2px;
  margin-right: 10px;
}
{%$_cssId%} .mh-sad .mh-line{
  margin: 0 10px;
  color: #eaeaea;
}`;
const instance = new CssCompress(str, {
  ld: ['{%'],
  rd: ['%}'],
  tpl: 'smarty'
});
const result = instance.run();
console.log(result)