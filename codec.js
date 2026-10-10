/* Compatible with Dddatt/bss GET_SAVE_CODE and RUN_SAVE_CODE. */
(function (root) {
  'use strict';
  const replacements = [
    ['Bear','Θ'],['Amulet','ô'],['minutesOf','õ'],['hoursOf','÷'],['Nectar','∀'],
    ['refreshing','↔'],['motivating','↓'],['satisfying','→'],['comforting','↑'],['invigorating','←'],
    ['"pollen','ξ'],['"bond":','⁑'],['"gifted":','•'],['"type":','£'],['},{','Þ'],
    ['":0,"','þ'],['":','ç'],[',"','ö'],['Puffshrooms','ÿ'],['Tokens','ø'],['ToTheWindShrine','‡'],
    ['Field','€'],['null','±'],['true','ž'],['false','×'],[' ','π'],[',','ω'],['}','⩒'],[']','∩'],['"','∂'],['-','δ'],['.','Φ']
  ];
  const markers = ['', '', ...'ะ๐๑๒๓๔๕๖๗๘๙กงขนาวอลคยๆมจธฐฎฮพถเใบปศหฉโ฿ร'];
  const shift = (text, amount) => text.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + amount + 26) % 26 + base);
  });
  function swap(text) {
    let out = '';
    for (let i = 0; i + 1 < text.length; i += 2) out += text[i + 1] + text[i];
    return out;
  }
  function validate(save) {
    if (!save || typeof save !== 'object' || Array.isArray(save)) throw new Error('The save must be a JSON object.');
    if (typeof save.version !== 'string' || !Array.isArray(save.hive) || !save.currentGear || !save.items || !save.NPCs) {
      throw new Error('This does not look like a BSS save. It needs version, hive, currentGear, items, and NPCs.');
    }
    for (const key of ['currentGear', 'items', 'NPCs']) {
      if (typeof save[key] !== 'object' || Array.isArray(save[key])) throw new Error(key + ' must be a JSON object.');
    }
    for (const row of save.hive) {
      if (!Array.isArray(row)) throw new Error('Each hive row must be an array.');
      for (const bee of row) {
        if (!bee || typeof bee !== 'object' || Array.isArray(bee)) throw new Error('Each hive slot must be a bee object.');
      }
    }
    function inspect(value) {
      if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
        throw new Error('Use finite numbers no larger than 9,007,199,254,740,991 to avoid losing precision.');
      }
      if (value && typeof value === 'object') Object.values(value).forEach(inspect);
    }
    inspect(save);
    return save;
  }
  function decode(input) {
    const code = input.trim();
    if (!code) throw new Error('Paste a save code first.');
    if (code.length > 1000000) throw new Error('This save is too large (maximum 1 MB).');
    let unpacked = '';
    for (let i = 0; i < code.length; i++) {
      const count = markers.indexOf(code[i + 1]);
      unpacked += code[i].repeat(count < 2 ? 1 : count);
      if (count >= 2) i++;
    }
    let json = swap(shift(unpacked, -9)).split('').reverse().join('');
    for (const [plain, symbol] of [...replacements].reverse()) json = json.replaceAll(symbol, plain);
    if (json[0] !== '{') json = '{' + json;
    try { return validate(JSON.parse(json)); }
    catch (error) {
      if (error instanceof SyntaxError) throw new Error('Invalid save code. Copy the whole code from the game, without extra formatting.');
      throw error;
    }
  }
  function encode(save) {
    validate(save);
    let text = JSON.stringify(save);
    for (const [plain, symbol] of replacements) text = text.replaceAll(plain, symbol);
    text = shift(swap(text.split('').reverse().join('')), 9);
    let packed = '';
    for (let i = 0; i < text.length;) {
      let count = 1;
      while (text[i + count] === text[i] && count < markers.length - 1) count++;
      packed += text[i] + (count > 1 ? markers[count] : '');
      i += count;
    }
    // Reject text the game's reserved symbols cannot represent losslessly.
    if (JSON.stringify(decode(packed)) !== JSON.stringify(save)) {
      throw new Error('This save contains text or symbols that the game cannot encode without changes.');
    }
    return packed;
  }
  const api = { decode, encode, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SaveCodec = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
