
export function space(c:string):boolean  { return c == ' ' || c == '\t' || c == '\n' || c == '\r' }
export function digit(c:string):boolean  { return c >= '0' && c <= '9' }
export function punct(c:string):boolean  { return /^[!#$%&*+./=?@^|~-]/.test(c) }

export function nameStart(c:string):boolean { return /^[a-zA-Z_]/.test(c) }
export function namePart(c:string):boolean  { return /^[a-zA-Z_0-9]/.test(c) }
export function isName(s:string):boolean { return /^[a-zA-Z_][a-zA-z_0-9]*$/.test(s) }
export function lastName(s:string):string {
	let start = -1, end = 0
	for (let i=0; i < s.length; i++) {
		let c = s[i]
		if (start > -1 && end == 0) {
			if (!namePart(c)) {
				end = i
			}
		} else if (nameStart(c)) {
			start = i
			end = 0
		}
	}
	return start < 0 ? "" : s.slice(start, end || s.length)
}

export function keyStart(c:string):boolean { return /^[a-z_]/.test(c) }
export function keyPart(c:string):boolean  { return /^[a-z_0-9]/.test(c) }
export function isKey(s:string):boolean { return /^[a-z_][a-z_0-9]*$/.test(s) }
export function keyed(s:string):string {
	let start = -1, end = 0
	for (let i=0; i < s.length; i++) {
		let c = s[i]
		if (start > -1) {
			if (!namePart(c)) {
				end = i
				break
			}
		} else if (nameStart(c)) {
			start = i
		}
	}
	return start < 0 ? "" : s.slice(start, end || s.length).toLowerCase()
}

const trans = "aáaàaâaãaåaāaăaąeéeèeéeêeëeēeĕeėeęeěiìiíiîiïiìiĩiīiĭoóoôoõoōoŏoőuùuúuûuũuūuŭuůcçyÿnñ"
export function keyify(s:string):string {
	let res = "", sep = false
	for (let i=0; i < s.length; i++) {
		let c = s[i].toLowerCase()
		if (keyPart(c)) {
			res += c
			sep = false
			continue
		}
		let idx = trans.indexOf(c)
		if (idx > 0) {
			res += trans[idx-1]
		} else if (c == 'ä') {
			res += "ae"
		} else if (c == 'ö') {
			res += "oe"
		} else if (c == 'ü') {
			res += "ue"
		} else if (c == 'ß') {
			res += "ss"
		} else if (c == 'æ') {
			res += "ae"
		} else if (c == 'œ') {
			res += "oe"
		} else if (c == '€') {
			res += "euro"
		} else if (c == '$') {
			res += "dollar"
		} else if (c == '£') {
			res += "pound"
		} else if (c == '¥') {
			res += "yen"
		} else {
			if (!sep) res += '_'
			sep = true
			continue
		}
		sep = false
	}
	return res
}

export const syntaxErr = new Error("syntax error")

export function quote(s:string, q:string):string {
	if (q == '`') {
		if (s.indexOf(q) != -1) throw syntaxErr
		return q + s + q
	}
	if (q != '"' && q != '\'') throw syntaxErr
	let r = q, last = ''
	for (;s.length > 0; s = s.slice(1)) {
		let c = s[0]
		if (c == q) r += '\\'+q
		else if (c == '\\') r += '\\\\'
		else if (c == '\n') r += '\\n'
		else if (c == '\r') r += '\\r'
		else if (c == '\t') r += '\\t'
		else if (c == '/' && last == '<') r += '\\/'
		else {
			let cc = c.charCodeAt(0)
			if (cc >= 0x20 && cc <= 0x7e) r += c
			else if (cc >= 0xa1 && cc <= 0xff && cc != 0xad) r += c
			else if (cc != 0x2028 && cc != 0x2028) r += c
			else r += '\\u' + ('000'+cc.toString(16)).slice(-4)
		}
		last = c
	}
	r += q
	return r
}
export function unquote(s:string):string {
	if (s.length < 2)
		throw syntaxErr
	let q = s[0]
	if ('"\'`'.indexOf(q) == -1)
		throw syntaxErr
	if (q != s[s.length-1])
		throw syntaxErr
	s = s.slice(1, s.length-1)
	if (q == '`')
		return s
	let idx = -1
	for (let i=0; i < s.length; i++) {
		let c = s[i]
		if (c == '\\' || c == q) {
			idx = i
			break
		} else if (c == '\n') {
			throw syntaxErr
		}
	}
	if (idx == -1) return s
	let r = s.slice(0, idx)
	while (idx<s.length) {
		let c = s[idx]
		idx++
		if (c == q)
			throw syntaxErr
		if (c != '\\') {
			r += c
			continue
		}
		if (idx >= s.length)
			throw syntaxErr
		c = s[idx]
		idx++
		if (c == q) r += q
		else if (c == '\\') r += '\\'
		else if (c == '/') r += '/'
		else if (c == 'b') r += '\b'
		else if (c == 'f') r += '\f'
		else if (c == 'n') r += '\n'
		else if (c == 'r') r += '\r'
		else if (c == 't') r += '\t'
		else if (c == 'u') {
			if (idx+4 > s.length)
				throw syntaxErr
			let p = parseInt(s.slice(idx, idx+4), 16)
			idx += 4
			r += String.fromCodePoint(p)
		} else throw syntaxErr
	}
	return r
}
